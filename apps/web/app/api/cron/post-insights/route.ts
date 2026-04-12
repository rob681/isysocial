// ─── Cron: Daily Post Insights Snapshot + Performance Tier Computation ────────
// Runs daily at 3am UTC.
//
// Pass 1 — Snapshot: For every PUBLISHED post aged 1-7 days, fetch engagement
//   metrics from Meta (Instagram or Facebook) and save a PostInsights row.
//   Defensive: if the API call fails, fetchSuccess=false is stored and the cron
//   continues with the next post. Max 50 posts per run (rate-limit guard).
//
// Pass 2 — Tiers: For posts that have reached 7+ days old (postAgeHours >= 168),
//   compute PerformanceTier percentiles per (clientId, network) and write them
//   back to the Post row — only when performanceTierSource is NULL or "auto".
//
// Auth: Bearer ${CRON_SECRET}

import { NextRequest, NextResponse } from "next/server";
import { Prisma, db } from "@isysocial/db";
import {
  fetchInstagramMediaInsights,
  fetchFacebookPostInsights,
} from "@isysocial/api/src/lib/insights/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_POSTS_PER_RUN = 50;
const MIN_AGE_HOURS = 1;    // Skip posts younger than 1 hour (data not stable)
const MAX_AGE_HOURS = 168;  // Stop snapshotting after 7 days (7 * 24)

// ── Helpers ───────────────────────────────────────────────────────────────────

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function computeEngagementRate(
  likes: number,
  comments: number,
  saved: number,
  shares: number,
  reach: number
): number {
  return round6((likes + comments + saved + shares) / Math.max(reach, 1));
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const stats = {
    snapshotted: 0,
    skipped: 0,
    failed: 0,
    tiersUpdated: 0,
    errors: [] as string[],
  };

  // ── Pass 1: Snapshot ───────────────────────────────────────────────────────

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const posts = await db.post.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null, gte: thirtyDaysAgo },
    },
    select: {
      id: true,
      agencyId: true,
      clientId: true,
      network: true,
      publishedAt: true,
    },
    take: MAX_POSTS_PER_RUN,
    orderBy: { publishedAt: "asc" },
  });

  for (const post of posts) {
    if (!post.publishedAt) {
      stats.skipped++;
      continue;
    }

    const postAgeHours = Math.floor(
      (now.getTime() - post.publishedAt.getTime()) / 3_600_000
    );

    // Skip posts that are too young (data unstable) or too old (no longer useful)
    if (postAgeHours < MIN_AGE_HOURS || postAgeHours > MAX_AGE_HOURS) {
      stats.skipped++;
      continue;
    }

    try {
      // Resolve access token for this client+network
      const cred = await db.clientSocialNetwork.findFirst({
        where: {
          clientId: post.clientId,
          network: post.network,
          isActive: true,
          accessToken: { not: null },
        },
        select: { accessToken: true, pageId: true, accountId: true },
      });

      if (!cred?.accessToken) {
        await db.postInsights.create({
          data: {
            postId: post.id,
            agencyId: post.agencyId,
            clientId: post.clientId,
            network: post.network,
            fetchedAt: now,
            postAgeHours,
            fetchSuccess: false,
            fetchError: "No active token found for client+network",
          },
        });
        stats.failed++;
        continue;
      }

      // Resolve platformPostId from the most recent successful publish log
      const publishLog = await db.postPublishLog.findFirst({
        where: {
          postId: post.id,
          network: post.network,
          platformPostId: { not: null },
          status: "SUCCESS",
        },
        orderBy: { attemptedAt: "desc" },
        select: { platformPostId: true },
      });

      if (!publishLog?.platformPostId) {
        await db.postInsights.create({
          data: {
            postId: post.id,
            agencyId: post.agencyId,
            clientId: post.clientId,
            network: post.network,
            fetchedAt: now,
            postAgeHours,
            fetchSuccess: false,
            fetchError: "No platformPostId found in publish logs",
          },
        });
        stats.failed++;
        continue;
      }

      const platformPostId = publishLog.platformPostId;

      // Fetch metrics from Meta
      if (post.network === "INSTAGRAM") {
        const m = await fetchInstagramMediaInsights(platformPostId, cred.accessToken);
        const engagementRate = computeEngagementRate(
          m.likes, m.comments, m.saved, m.shares, m.reach
        );
        await db.postInsights.create({
          data: {
            postId: post.id,
            agencyId: post.agencyId,
            clientId: post.clientId,
            network: post.network,
            fetchedAt: now,
            postAgeHours,
            impressions: m.impressions,
            reach: m.reach,
            likes: m.likes,
            comments: m.comments,
            saved: m.saved,
            shares: m.shares,
            plays: m.plays,
            engagementRate,
            rawData: m as unknown as Prisma.InputJsonValue,
            fetchSuccess: true,
          },
        });
        stats.snapshotted++;
      } else if (post.network === "FACEBOOK") {
        const m = await fetchFacebookPostInsights(platformPostId, cred.accessToken);
        // Facebook: reactions ≈ likes; no "saved" metric at post level
        const engagementRate = computeEngagementRate(
          m.reactions, m.comments, 0, m.shares, m.reach
        );
        await db.postInsights.create({
          data: {
            postId: post.id,
            agencyId: post.agencyId,
            clientId: post.clientId,
            network: post.network,
            fetchedAt: now,
            postAgeHours,
            impressions: m.impressions,
            reach: m.reach,
            likes: m.reactions,
            comments: m.comments,
            saved: 0,
            shares: m.shares,
            plays: 0,
            engagementRate,
            rawData: m as unknown as Prisma.InputJsonValue,
            fetchSuccess: true,
          },
        });
        stats.snapshotted++;
      } else {
        // Network not supported for insights (Twitter, TikTok, etc.)
        stats.skipped++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`post ${post.id}: ${msg}`);
      stats.failed++;

      // Still persist a failure record so we know the fetch was attempted
      try {
        await db.postInsights.create({
          data: {
            postId: post.id,
            agencyId: post.agencyId,
            clientId: post.clientId,
            network: post.network,
            fetchedAt: now,
            postAgeHours,
            fetchSuccess: false,
            fetchError: msg.slice(0, 500),
          },
        });
      } catch {
        // Swallow secondary error to keep loop going
      }
    }
  }

  // ── Pass 2: Performance Tier Computation ───────────────────────────────────
  // For posts that have 7+ days of data, compute percentile tiers per
  // (clientId, network) and write them back — only for auto/null source.

  try {
    const sevenDaysAgo = new Date(now.getTime() - MAX_AGE_HOURS * 60 * 60 * 1000);

    // Find posts eligible for tier computation:
    // published 7+ days ago, tier not manually set
    const tierCandidates = await db.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null, lte: sevenDaysAgo },
        OR: [
          { performanceTierSource: null },
          { performanceTierSource: "auto" },
        ],
        network: { in: ["INSTAGRAM", "FACEBOOK"] },
      },
      select: {
        id: true,
        clientId: true,
        network: true,
      },
    });

    if (tierCandidates.length > 0) {
      // Group candidates by (clientId, network)
      const groups = new Map<string, typeof tierCandidates>();
      for (const post of tierCandidates) {
        const key = `${post.clientId}::${post.network}`;
        const group = groups.get(key) ?? [];
        group.push(post);
        groups.set(key, group);
      }

      for (const [, groupPosts] of groups) {
        const postIds = groupPosts.map((p) => p.id);
        const { clientId, network } = groupPosts[0]!;

        // For each post in the group, find its most recent "final" snapshot
        // (postAgeHours >= 168, i.e. the 7-day snapshot)
        const snapshots = await db.postInsights.findMany({
          where: {
            clientId,
            network,
            postId: { in: postIds },
            postAgeHours: { gte: MAX_AGE_HOURS },
            fetchSuccess: true,
          },
          orderBy: { fetchedAt: "desc" },
          select: { postId: true, engagementRate: true },
        });

        if (snapshots.length === 0) continue;

        // Keep only the most recent snapshot per post
        const latestByPost = new Map<string, number>();
        for (const snap of snapshots) {
          if (!latestByPost.has(snap.postId)) {
            latestByPost.set(
              snap.postId,
              snap.engagementRate ? Number(snap.engagementRate) : 0
            );
          }
        }

        // Sort engagement rates to compute percentiles
        const rates = [...latestByPost.values()].sort((a, b) => a - b);
        const total = rates.length;

        if (total === 0) continue;

        const p25 = rates[Math.floor(total * 0.25)] ?? 0;
        const p50 = rates[Math.floor(total * 0.5)] ?? 0;
        const p75 = rates[Math.floor(total * 0.75)] ?? 0;

        // Assign tiers to each post with a final snapshot
        for (const [postId, rate] of latestByPost) {
          let tier: "TOP" | "HIGH" | "AVERAGE" | "LOW";
          if (rate >= p75) {
            tier = "TOP";
          } else if (rate >= p50) {
            tier = "HIGH";
          } else if (rate >= p25) {
            tier = "AVERAGE";
          } else {
            tier = "LOW";
          }

          await db.post.update({
            where: { id: postId },
            data: {
              performanceTier: tier,
              performanceTierSource: "auto",
              performanceComputedAt: now,
            },
          });
          stats.tiersUpdated++;
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    stats.errors.push(`tier-computation: ${msg}`);
  }

  console.log("[cron/post-insights]", stats);

  return NextResponse.json({
    success: true,
    ...stats,
    errors: stats.errors.length > 0 ? stats.errors : undefined,
    timestamp: now.toISOString(),
  });
}
