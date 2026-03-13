// ─── Cron: Publish Scheduled Posts ───────────────────────────────────────────
// Vercel Cron Job — runs daily at 8:00 AM UTC (set in vercel.json)
// Finds all posts with status = SCHEDULED and scheduledAt <= now
// Publishes them to their connected social network

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";
import { publishToNetwork } from "@isysocial/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify cron secret — Vercel sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find posts ready to publish
  const scheduledPosts = await db.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      client: {
        include: {
          socialNetworks: {
            where: {
              isActive: true,
              accessToken: { not: null },
            },
          },
        },
      },
    },
  });

  const results: {
    postId: string;
    network: string;
    status: string;
    error?: string;
    platformUrl?: string;
  }[] = [];

  for (const post of scheduledPosts) {
    // Find a connected network that matches the post's network
    const sn = post.client.socialNetworks.find(
      (n) => n.network === post.network && n.accessToken
    );

    if (!sn) {
      results.push({
        postId: post.id,
        network: post.network,
        status: "SKIPPED",
        error: "Red social no conectada",
      });
      continue;
    }

    // Create PENDING log
    // Use a system user ID — for cron, we use agencyId as a placeholder
    const agencyUser = await db.user.findFirst({
      where: { agencyId: post.agencyId, role: "ADMIN" },
      select: { id: true },
    });

    if (!agencyUser) {
      results.push({
        postId: post.id,
        network: post.network,
        status: "SKIPPED",
        error: "No se encontró admin de agencia",
      });
      continue;
    }

    const log = await db.postPublishLog.create({
      data: {
        postId: post.id,
        networkId: sn.id,
        network: sn.network,
        status: "PENDING",
        requestedById: agencyUser.id,
      },
    });

    const mediaUrls = post.media.map((m) => m.fileUrl);

    const publishResult = await publishToNetwork({
      network: sn.network,
      copy: post.copy ?? "",
      hashtags: post.hashtags ?? "",
      mediaUrls,
      postType: post.postType,
      accountId: sn.accountId ?? "",
      accessToken: sn.accessToken!,
      pageId: sn.pageId ?? undefined,
    });

    // Update log
    await db.postPublishLog.update({
      where: { id: log.id },
      data: {
        status: publishResult.success ? "SUCCESS" : "FAILED",
        platformPostId: publishResult.platformPostId ?? null,
        platformUrl: publishResult.platformUrl ?? null,
        errorMessage: publishResult.error ?? null,
        publishedAt: publishResult.success ? new Date() : null,
      },
    });

    if (publishResult.success) {
      await db.post.update({
        where: { id: post.id },
        data: { status: "PUBLISHED" },
      });

      await db.postStatusLog.create({
        data: {
          postId: post.id,
          fromStatus: "SCHEDULED",
          toStatus: "PUBLISHED",
          changedById: agencyUser.id,
          note: `Publicado automáticamente por cron`,
        },
      });
    }

    results.push({
      postId: post.id,
      network: post.network,
      status: publishResult.success ? "SUCCESS" : "FAILED",
      error: publishResult.error,
      platformUrl: publishResult.platformUrl,
    });
  }

  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const failCount = results.filter((r) => r.status === "FAILED").length;

  console.log(
    `[cron/publish-scheduled] Processed ${scheduledPosts.length} posts — ` +
      `${successCount} published, ${failCount} failed`
  );

  return NextResponse.json({
    processed: scheduledPosts.length,
    published: successCount,
    failed: failCount,
    results,
  });
}
