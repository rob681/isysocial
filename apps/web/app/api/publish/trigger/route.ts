// ─── Manual Publish Trigger ───────────────────────────────────────────────────
// Called from the admin dashboard to manually check for due scheduled posts.
// Reuses the same logic as the cron job.
// Authentication: requires valid session (admin role).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isysocial/db";
import { publishToNetwork } from "@isysocial/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = (session.user as any).agencyId as string;
  const now = new Date();

  const scheduledPosts = await db.post.findMany({
    where: {
      agencyId,
      status: { in: ["SCHEDULED", "APPROVED"] },
      scheduledAt: { lte: now },
    },
    take: 20,
    orderBy: { scheduledAt: "asc" },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      client: {
        include: {
          socialNetworks: {
            where: { isActive: true, accessToken: { not: null } },
          },
        },
      },
    },
  });

  if (scheduledPosts.length === 0) {
    return NextResponse.json({ processed: 0, published: 0, failed: 0, results: [] });
  }

  const agencyUser = await db.user.findFirst({
    where: { agencyId, role: "ADMIN" },
    select: { id: true },
  });

  if (!agencyUser) {
    return NextResponse.json({ error: "No admin user found" }, { status: 500 });
  }

  const results: { postId: string; status: string; error?: string; platformUrl?: string }[] = [];

  for (const post of scheduledPosts) {
    let sn = post.client.socialNetworks.find(
      (n) => n.network === post.network && n.accessToken
    ) as any;

    let snSource: "client" | "agency" = "client";

    if (!sn) {
      const agencyAccount = await db.agencySocialAccount.findFirst({
        where: {
          agencyId,
          network: post.network,
          isActive: true,
          accessToken: { not: "" },
        },
      });
      if (agencyAccount) {
        sn = agencyAccount;
        snSource = "agency";
      }
    }

    if (!sn) {
      results.push({ postId: post.id, status: "SKIPPED", error: "Red social no conectada" });
      continue;
    }

    const log = await db.postPublishLog.create({
      data: {
        postId: post.id,
        ...(snSource === "agency" ? { agencyAccountId: sn.id } : { networkId: sn.id }),
        network: sn.network,
        status: "PENDING",
        requestedById: agencyUser.id,
      },
    });

    const result = await publishToNetwork({
      network: sn.network,
      copy: post.copy ?? "",
      hashtags: post.hashtags ?? "",
      mediaUrls: post.media.map((m) => m.fileUrl),
      postType: post.postType,
      accountId: sn.accountId ?? "",
      accessToken: sn.accessToken!,
      pageId: sn.pageId ?? undefined,
    });

    await db.postPublishLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? "SUCCESS" : "FAILED",
        platformPostId: result.platformPostId ?? null,
        platformUrl: result.platformUrl ?? null,
        errorMessage: result.error ?? null,
        publishedAt: result.success ? new Date() : null,
      },
    });

    if (result.success) {
      await db.post.update({
        where: { id: post.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      await db.postStatusLog.create({
        data: {
          postId: post.id,
          fromStatus: "SCHEDULED",
          toStatus: "PUBLISHED",
          changedById: agencyUser.id,
          note: "Publicado manualmente desde dashboard",
        },
      });
    }

    results.push({
      postId: post.id,
      status: result.success ? "SUCCESS" : "FAILED",
      error: result.error,
      platformUrl: result.platformUrl,
    });
  }

  const published = results.filter((r) => r.status === "SUCCESS").length;
  const failed = results.filter((r) => r.status === "FAILED").length;

  return NextResponse.json({ processed: scheduledPosts.length, published, failed, results });
}
