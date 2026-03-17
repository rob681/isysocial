// ─── Cron: Refresh Expiring OAuth Tokens ─────────────────────────────────────
// Vercel Cron Job — runs daily at 6:00 AM UTC (set in vercel.json)
// Finds all AgencySocialAccount records where tokenExpiresAt is within 7 days
// and refreshes Meta (Facebook/Instagram) long-lived tokens via Graph API.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const META_GRAPH_VERSION = "v20.0";
const DAYS_BEFORE_EXPIRY = 7;

interface RefreshResult {
  accountId: string;
  network: string;
  accountName: string;
  status: "REFRESHED" | "FAILED" | "SKIPPED";
  error?: string;
  newExpiresAt?: string;
}

export async function GET(req: NextRequest) {
  // Verify cron secret — Vercel sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const META_APP_ID = process.env.META_APP_ID ?? "";
  const META_APP_SECRET = process.env.META_APP_SECRET ?? "";

  if (!META_APP_ID || !META_APP_SECRET) {
    console.error("[cron/refresh-tokens] META_APP_ID or META_APP_SECRET not configured");
    return NextResponse.json(
      { error: "Meta credentials not configured" },
      { status: 500 }
    );
  }

  const now = new Date();
  const expiryThreshold = new Date(
    now.getTime() + DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000
  );

  // Find Meta accounts (FACEBOOK or INSTAGRAM) expiring within 7 days or with null expiry
  const expiringAccounts = await db.agencySocialAccount.findMany({
    where: {
      isActive: true,
      network: { in: ["FACEBOOK", "INSTAGRAM"] },
      OR: [
        { tokenExpiresAt: { lte: expiryThreshold } },
        { tokenExpiresAt: null },
      ],
    },
  });

  console.log(
    `[cron/refresh-tokens] Found ${expiringAccounts.length} Meta accounts to refresh`
  );

  const results: RefreshResult[] = [];

  for (const account of expiringAccounts) {
    // Skip accounts with already-expired tokens that are way past expiry (> 60 days)
    // These tokens cannot be refreshed — they need a full re-auth
    if (
      account.tokenExpiresAt &&
      account.tokenExpiresAt.getTime() < now.getTime()
    ) {
      results.push({
        accountId: account.id,
        network: account.network,
        accountName: account.accountName,
        status: "SKIPPED",
        error: "Token already expired — requires re-authorization",
      });
      continue;
    }

    try {
      // Exchange current token for a new long-lived token
      const params = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: account.accessToken,
      });

      const res = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${params}`
      );
      const data = await res.json();

      if (!res.ok || !data.access_token) {
        const errMsg =
          data.error?.message ?? `HTTP ${res.status}: Token refresh failed`;
        console.error(
          `[cron/refresh-tokens] Failed for ${account.accountName} (${account.id}):`,
          errMsg
        );
        results.push({
          accountId: account.id,
          network: account.network,
          accountName: account.accountName,
          status: "FAILED",
          error: errMsg,
        });
        continue;
      }

      // Calculate new expiry (default ~60 days if expires_in is provided)
      const newExpiresAt = data.expires_in
        ? new Date(now.getTime() + data.expires_in * 1000)
        : null;

      // Update token in database
      await db.agencySocialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: data.access_token,
          tokenExpiresAt: newExpiresAt,
        },
      });

      console.log(
        `[cron/refresh-tokens] Refreshed ${account.accountName} (${account.network}) — ` +
          `expires ${newExpiresAt?.toISOString() ?? "unknown"}`
      );

      results.push({
        accountId: account.id,
        network: account.network,
        accountName: account.accountName,
        status: "REFRESHED",
        newExpiresAt: newExpiresAt?.toISOString(),
      });
    } catch (err: any) {
      console.error(
        `[cron/refresh-tokens] Exception for ${account.accountName} (${account.id}):`,
        err
      );
      results.push({
        accountId: account.id,
        network: account.network,
        accountName: account.accountName,
        status: "FAILED",
        error: err?.message ?? "Unknown error",
      });
    }
  }

  const refreshed = results.filter((r) => r.status === "REFRESHED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;
  const skipped = results.filter((r) => r.status === "SKIPPED").length;

  console.log(
    `[cron/refresh-tokens] Done — ${refreshed} refreshed, ${failed} failed, ${skipped} skipped`
  );

  return NextResponse.json({
    processed: expiringAccounts.length,
    refreshed,
    failed,
    skipped,
    results,
  });
}
