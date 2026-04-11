import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, getAgencyId } from "../trpc";
import {
  fetchInstagramMediaInsights,
  fetchInstagramAccountInsights,
  fetchFacebookPageInsights,
  fetchFacebookPostInsights,
} from "../lib/insights/meta";
import type {
  InstagramAccountInsights,
  FacebookPageInsights,
} from "../lib/insights/meta";
import { sendEmailNotification } from "../lib/email";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRangeDays(range: string): number {
  switch (range) {
    case "7d": return 7;
    case "14d": return 14;
    case "90d": return 90;
    case "30d":
    default: return 30;
  }
}

function getRangeDate(range: string): { since: Date; until: Date } {
  const until = new Date();
  const days = getRangeDays(range);
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  return { since, until };
}

/** Returns the previous period of equal length (for delta comparison) */
function getPrevRangeDate(range: string): { since: Date; until: Date } {
  const days = getRangeDays(range);
  const ms = days * 24 * 60 * 60 * 1000;
  const until = new Date(Date.now() - ms);
  const since = new Date(until.getTime() - ms);
  return { since, until };
}

function sumArr(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

type NetworkType = "INSTAGRAM" | "FACEBOOK";

/**
 * Resolve the access token and account/page ID for a client's network.
 * Checks clientSocialNetwork first, falls back to agencySocialAccount.
 */
async function resolveNetworkCredentials(
  db: any,
  clientId: string,
  network: NetworkType,
  agencyId: string
): Promise<{ accountId: string; accessToken: string; source: string } | null> {
  // Try client-level connection first
  const clientNetwork = await db.clientSocialNetwork.findFirst({
    where: {
      clientId,
      network,
      isActive: true,
      accessToken: { not: null },
    },
    select: {
      accountId: true,
      pageId: true,
      accessToken: true,
    },
  });

  if (clientNetwork?.accessToken) {
    const id = network === "FACEBOOK"
      ? (clientNetwork.pageId || clientNetwork.accountId)
      : clientNetwork.accountId;
    if (id) {
      return { accountId: id, accessToken: clientNetwork.accessToken, source: "clientSocialNetwork" };
    }
  }

  // Fallback to agency-level account
  const agencyAccount = await db.agencySocialAccount.findFirst({
    where: {
      agencyId,
      network,
      isActive: true,
    },
    select: {
      accountId: true,
      pageId: true,
      accessToken: true,
    },
  });

  if (agencyAccount?.accessToken) {
    const id = network === "FACEBOOK"
      ? (agencyAccount.pageId || agencyAccount.accountId)
      : agencyAccount.accountId;
    if (id) {
      return { accountId: id, accessToken: agencyAccount.accessToken, source: "agencySocialAccount" };
    }
  }

  return null;
}

// ── Router ───────────────────────────────────────────────────────────────────

export const socialInsightsRouter = router({
  /**
   * Get account-level insights for a single network (Instagram or Facebook).
   */
  getAccountInsights: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        network: z.enum(["INSTAGRAM", "FACEBOOK"]),
        range: z.enum(["7d", "14d", "30d", "90d"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client belongs to this agency
      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: { id: true, companyName: true },
      });
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente no encontrado en esta agencia.",
        });
      }

      const creds = await resolveNetworkCredentials(
        ctx.db,
        input.clientId,
        input.network,
        agencyId
      );
      if (!creds) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No hay cuenta de ${input.network} conectada para este cliente.`,
        });
      }

      const { since, until } = getRangeDate(input.range);
      const { since: prevSince, until: prevUntil } = getPrevRangeDate(input.range);

      console.log(
        `[socialInsights] getAccountInsights: client=${input.clientId}, network=${input.network}, range=${input.range}, source=${creds.source}`
      );

      if (input.network === "INSTAGRAM") {
        const [data, prevData] = await Promise.all([
          fetchInstagramAccountInsights(creds.accountId, creds.accessToken, since, until),
          fetchInstagramAccountInsights(creds.accountId, creds.accessToken, prevSince, prevUntil).catch(() => null),
        ]);

        const currentTotals = {
          reach: sumArr(data.reach),
          impressions: sumArr(data.impressions),
          profileViews: sumArr(data.profileViews ?? []),
          websiteClicks: sumArr(data.websiteClicks ?? []),
          followers: data.followerCount ?? 0,
        };
        const prevTotals = prevData ? {
          reach: sumArr(prevData.reach),
          impressions: sumArr(prevData.impressions),
          profileViews: sumArr(prevData.profileViews ?? []),
          websiteClicks: sumArr(prevData.websiteClicks ?? []),
          followers: prevData.followerCount ?? 0,
        } : null;

        return {
          network: "INSTAGRAM" as const,
          clientId: input.clientId,
          clientName: client.companyName,
          range: input.range,
          data,
          currentTotals,
          prevTotals,
          deltas: prevTotals ? {
            reach: calcDelta(currentTotals.reach, prevTotals.reach),
            impressions: calcDelta(currentTotals.impressions, prevTotals.impressions),
            profileViews: calcDelta(currentTotals.profileViews, prevTotals.profileViews),
            websiteClicks: calcDelta(currentTotals.websiteClicks, prevTotals.websiteClicks),
            followers: calcDelta(currentTotals.followers, prevTotals.followers),
          } : null,
        };
      }

      // FACEBOOK
      const [data, prevData] = await Promise.all([
        fetchFacebookPageInsights(creds.accountId, creds.accessToken, since, until),
        fetchFacebookPageInsights(creds.accountId, creds.accessToken, prevSince, prevUntil).catch(() => null),
      ]);

      const currentTotals = {
        reach: sumArr(data.reach),
        impressions: sumArr(data.impressions),
        postEngagements: sumArr(data.postEngagements ?? []),
        fanAdds: sumArr(data.fanAdds ?? []),
        videoViews: sumArr(data.videoViews ?? []),
        fanCount: data.fanCount ?? 0,
      };
      const prevTotals = prevData ? {
        reach: sumArr(prevData.reach),
        impressions: sumArr(prevData.impressions),
        postEngagements: sumArr(prevData.postEngagements ?? []),
        fanAdds: sumArr(prevData.fanAdds ?? []),
        videoViews: sumArr(prevData.videoViews ?? []),
        fanCount: prevData.fanCount ?? 0,
      } : null;

      return {
        network: "FACEBOOK" as const,
        clientId: input.clientId,
        clientName: client.companyName,
        range: input.range,
        data,
        currentTotals,
        prevTotals,
        deltas: prevTotals ? {
          reach: calcDelta(currentTotals.reach, prevTotals.reach),
          impressions: calcDelta(currentTotals.impressions, prevTotals.impressions),
          postEngagements: calcDelta(currentTotals.postEngagements, prevTotals.postEngagements),
          fanAdds: calcDelta(currentTotals.fanAdds, prevTotals.fanAdds),
          videoViews: calcDelta(currentTotals.videoViews, prevTotals.videoViews),
          fanCount: calcDelta(currentTotals.fanCount, prevTotals.fanCount),
        } : null,
      };
    }),

  /**
   * Get insights for a specific published post across all platforms it was published to.
   */
  getPostInsights: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Find the post and verify agency ownership
      const post = await ctx.db.post.findFirst({
        where: { id: input.postId, agencyId },
        select: {
          id: true,
          title: true,
          clientId: true,
          network: true,
          publishLogs: {
            where: {
              status: "SUCCESS",
              platformPostId: { not: null },
            },
            select: {
              id: true,
              network: true,
              platformPostId: true,
              platformUrl: true,
              networkId: true,
              agencyAccountId: true,
              publishedAt: true,
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Publicacion no encontrada.",
        });
      }

      if (post.publishLogs.length === 0) {
        return {
          postId: post.id,
          title: post.title,
          insights: [],
        };
      }

      console.log(
        `[socialInsights] getPostInsights: post=${input.postId}, ${post.publishLogs.length} successful publish(es)`
      );

      const insights = await Promise.all(
        post.publishLogs.map(async (log) => {
          // Only Instagram media insights are supported currently
          if (log.network !== "INSTAGRAM") {
            return {
              logId: log.id,
              network: log.network,
              platformPostId: log.platformPostId,
              platformUrl: log.platformUrl,
              publishedAt: log.publishedAt,
              insights: null,
              unsupported: true,
            };
          }

          // Resolve access token for this publish log
          let accessToken: string | null = null;

          if (log.networkId) {
            const csn = await ctx.db.clientSocialNetwork.findUnique({
              where: { id: log.networkId },
              select: { accessToken: true },
            });
            accessToken = csn?.accessToken ?? null;
          }

          if (!accessToken && log.agencyAccountId) {
            const asa = await ctx.db.agencySocialAccount.findUnique({
              where: { id: log.agencyAccountId },
              select: { accessToken: true },
            });
            accessToken = asa?.accessToken ?? null;
          }

          if (!accessToken) {
            console.warn(
              `[socialInsights] No access token found for publish log ${log.id}`
            );
            return {
              logId: log.id,
              network: log.network,
              platformPostId: log.platformPostId,
              platformUrl: log.platformUrl,
              publishedAt: log.publishedAt,
              insights: null,
              unsupported: false,
              error: "No access token available",
            };
          }

          const data = await fetchInstagramMediaInsights(
            log.platformPostId!,
            accessToken
          );

          return {
            logId: log.id,
            network: log.network,
            platformPostId: log.platformPostId,
            platformUrl: log.platformUrl,
            publishedAt: log.publishedAt,
            insights: data,
            unsupported: false,
          };
        })
      );

      return {
        postId: post.id,
        title: post.title,
        insights,
      };
    }),

  /**
   * Get the full media list for an Instagram account (all historical posts)
   * with their insights. Uses /media endpoint to pull posts not created via Isysocial.
   */
  getIGMediaList: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: { id: true, companyName: true },
      });
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado." });

      const creds = await resolveNetworkCredentials(ctx.db, input.clientId, "INSTAGRAM", agencyId);
      if (!creds) throw new TRPCError({ code: "BAD_REQUEST", message: "No hay cuenta de Instagram conectada." });

      // Fetch media list from IG API
      const url = `https://graph.facebook.com/v20.0/${creds.accountId}/media?fields=id,timestamp,media_type,like_count,comments_count,permalink,caption,thumbnail_url,media_url&limit=${input.limit}&access_token=${creds.accessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Error de API: ${body}` });
      }
      const json = await res.json() as { data: any[] };
      const media = json.data ?? [];

      // Fetch insights for each media item in parallel (batch of 10 max)
      const withInsights = await Promise.all(
        media.slice(0, input.limit).map(async (item: any) => {
          const insightsUrl = `https://graph.facebook.com/v20.0/${item.id}/insights?metric=impressions,reach,saved,shares${item.media_type === "VIDEO" ? ",plays" : ""}&access_token=${creds.accessToken}`;
          const insRes = await fetch(insightsUrl).catch(() => null);
          let insights: Record<string, number> = {};
          if (insRes?.ok) {
            const insJson = await insRes.json() as { data: any[] };
            for (const entry of insJson.data ?? []) {
              insights[entry.name] = entry.values?.[0]?.value ?? 0;
            }
          }
          const likes = item.like_count ?? 0;
          const comments = item.comments_count ?? 0;
          const reach = insights["reach"] ?? 0;
          const saved = insights["saved"] ?? 0;
          const shares = insights["shares"] ?? 0;
          const engagementRate = reach > 0
            ? Math.round(((likes + comments + saved + shares) / reach) * 10000) / 100
            : 0;

          return {
            id: item.id,
            timestamp: item.timestamp,
            mediaType: item.media_type,
            permalink: item.permalink,
            caption: item.caption?.slice(0, 120) ?? null,
            thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
            likes,
            comments,
            impressions: insights["impressions"] ?? 0,
            reach,
            saved,
            shares,
            plays: insights["plays"] ?? 0,
            engagementRate,
          };
        })
      );

      // Sort by reach desc
      withInsights.sort((a, b) => b.reach - a.reach);

      return { media: withInsights, total: media.length };
    }),

  /**
   * Get a client overview with insights aggregated across all connected networks.
   */
  getClientOverview: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        range: z.enum(["7d", "14d", "30d", "90d"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client belongs to this agency
      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: { id: true, companyName: true },
      });
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cliente no encontrado en esta agencia.",
        });
      }

      // Find all connected networks for this client
      const clientNetworks = await ctx.db.clientSocialNetwork.findMany({
        where: {
          clientId: input.clientId,
          isActive: true,
          accessToken: { not: null },
        },
        select: {
          network: true,
          accountId: true,
          pageId: true,
          accessToken: true,
          accountName: true,
        },
      });

      // Also check agency-level accounts for networks not directly connected
      const connectedNetworks = new Set(clientNetworks.map((cn) => cn.network));
      const agencyAccounts = await ctx.db.agencySocialAccount.findMany({
        where: {
          agencyId,
          isActive: true,
          network: { notIn: Array.from(connectedNetworks) as any },
        },
        select: {
          network: true,
          accountId: true,
          pageId: true,
          accessToken: true,
          accountName: true,
        },
      });

      const { since, until } = getRangeDate(input.range);
      const supportedNetworks: NetworkType[] = ["INSTAGRAM", "FACEBOOK"];

      console.log(
        `[socialInsights] getClientOverview: client=${input.clientId}, range=${input.range}, clientNetworks=${clientNetworks.length}, agencyAccounts=${agencyAccounts.length}`
      );

      type NetworkBreakdown = {
        network: string;
        accountName: string | null;
        source: string;
        data: InstagramAccountInsights | FacebookPageInsights | null;
        error?: string;
      };

      const breakdown: NetworkBreakdown[] = [];
      let totalReach = 0;
      let totalImpressions = 0;

      // Fetch insights for each client-connected network
      for (const cn of clientNetworks) {
        if (!supportedNetworks.includes(cn.network as NetworkType)) {
          breakdown.push({
            network: cn.network,
            accountName: cn.accountName,
            source: "clientSocialNetwork",
            data: null,
            error: "Insights not supported for this network yet",
          });
          continue;
        }

        const id =
          cn.network === "FACEBOOK"
            ? cn.pageId || cn.accountId
            : cn.accountId;

        if (!id || !cn.accessToken) continue;

        if (cn.network === "INSTAGRAM") {
          const data = await fetchInstagramAccountInsights(id, cn.accessToken, since, until);
          totalReach += data.reach.reduce((a, b) => a + b, 0);
          totalImpressions += data.impressions.reduce((a, b) => a + b, 0);
          breakdown.push({
            network: cn.network,
            accountName: cn.accountName,
            source: "clientSocialNetwork",
            data,
          });
        } else if (cn.network === "FACEBOOK") {
          const data = await fetchFacebookPageInsights(id, cn.accessToken, since, until);
          totalImpressions += data.impressions.reduce((a, b) => a + b, 0);
          totalReach += data.reach.reduce((a, b) => a + b, 0);
          breakdown.push({
            network: cn.network,
            accountName: cn.accountName,
            source: "clientSocialNetwork",
            data,
          });
        }
      }

      // Fetch insights for agency-level accounts (fallback for unconnected networks)
      for (const aa of agencyAccounts) {
        if (!supportedNetworks.includes(aa.network as NetworkType)) {
          breakdown.push({
            network: aa.network,
            accountName: aa.accountName,
            source: "agencySocialAccount",
            data: null,
            error: "Insights not supported for this network yet",
          });
          continue;
        }

        const id =
          aa.network === "FACEBOOK"
            ? aa.pageId || aa.accountId
            : aa.accountId;

        if (!id || !aa.accessToken) continue;

        if (aa.network === "INSTAGRAM") {
          const data = await fetchInstagramAccountInsights(id, aa.accessToken, since, until);
          totalReach += data.reach.reduce((a, b) => a + b, 0);
          totalImpressions += data.impressions.reduce((a, b) => a + b, 0);
          breakdown.push({
            network: aa.network,
            accountName: aa.accountName,
            source: "agencySocialAccount",
            data,
          });
        } else if (aa.network === "FACEBOOK") {
          const data = await fetchFacebookPageInsights(id, aa.accessToken, since, until);
          totalImpressions += data.impressions.reduce((a, b) => a + b, 0);
          totalReach += data.reach.reduce((a, b) => a + b, 0);
          breakdown.push({
            network: aa.network,
            accountName: aa.accountName,
            source: "agencySocialAccount",
            data,
          });
        }
      }

      return {
        clientId: input.clientId,
        clientName: client.companyName,
        range: input.range,
        totals: {
          reach: totalReach,
          impressions: totalImpressions,
          networksConnected: breakdown.filter((b) => b.data !== null).length,
        },
        breakdown,
      };
    }),

  /**
   * Get the most recent posts from a Facebook Page with their insights.
   */
  getFBPostsList: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: { id: true, companyName: true },
      });
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado." });

      const creds = await resolveNetworkCredentials(ctx.db, input.clientId, "FACEBOOK", agencyId);
      if (!creds) throw new TRPCError({ code: "BAD_REQUEST", message: "No hay cuenta de Facebook conectada." });

      // Fetch page posts
      const url = `https://graph.facebook.com/v20.0/${creds.accountId}/posts?fields=id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares&limit=${input.limit}&access_token=${creds.accessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Error de API de Facebook: ${body}` });
      }
      const json = await res.json() as { data: any[] };
      const posts = json.data ?? [];

      // Fetch insights for each post in parallel (max 10 at a time to respect rate limits)
      const withInsights = await Promise.all(
        posts.slice(0, input.limit).map(async (post: any) => {
          const insights = await fetchFacebookPostInsights(post.id, creds.accessToken);
          return {
            id: post.id,
            message: post.message?.slice(0, 150) ?? null,
            createdTime: post.created_time,
            permalinkUrl: post.permalink_url ?? null,
            picture: post.full_picture ?? null,
            reactions: post.likes?.summary?.total_count ?? 0,
            comments: post.comments?.summary?.total_count ?? 0,
            shares: post.shares?.count ?? 0,
            impressions: insights.impressions,
            reach: insights.reach,
            engagedUsers: insights.engagedUsers,
            clicks: insights.clicks,
          };
        })
      );

      // Sort by reach desc
      withInsights.sort((a, b) => b.reach - a.reach);

      return { posts: withInsights, total: posts.length };
    }),

  // ─── Send Analytics Report by Email ─────────────────────────────────────────
  sendAnalyticsReport: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        network: z.enum(["INSTAGRAM", "FACEBOOK"]),
        range: z.enum(["7d", "14d", "30d", "90d"]),
        emails: z.array(z.string().email()).min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: { companyName: true },
      });
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });

      const creds = await resolveNetworkCredentials(ctx.db, input.clientId, input.network, agencyId);
      if (!creds) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `El cliente no tiene ${input.network === "INSTAGRAM" ? "Instagram" : "Facebook"} conectado con credenciales válidas.`,
        });
      }

      const rangeDays = getRangeDays(input.range);
      const { since, until } = getRangeDate(input.range);
      const { since: prevSince, until: prevUntil } = getPrevRangeDate(input.range);
      const networkLabel = input.network === "INSTAGRAM" ? "Instagram" : "Facebook";
      const accentColor = input.network === "INSTAGRAM" ? "#E1306C" : "#1877F2";
      const headerBg = input.network === "INSTAGRAM" ? "#fdf2f8" : "#eff6ff";
      const headerBorder = input.network === "INSTAGRAM" ? "#fbcfe8" : "#bfdbfe";

      const deltaStr = (d: number | null) =>
        d === null ? "—" : d > 0 ? `+${d}%` : d < 0 ? `${d}%` : "Sin cambio";
      const deltaColor = (d: number | null) =>
        d === null ? "#6b7280" : d > 0 ? "#059669" : d < 0 ? "#dc2626" : "#6b7280";

      let rows = "";

      if (input.network === "INSTAGRAM") {
        const [current, prev] = await Promise.all([
          fetchInstagramAccountInsights(creds.accountId, creds.accessToken, since, until).catch(() => null),
          fetchInstagramAccountInsights(creds.accountId, creds.accessToken, prevSince, prevUntil).catch(() => null),
        ]);

        const followers = current?.followerCount ?? 0;
        const reach = sumArr(current?.reach ?? []);
        const impressions = sumArr(current?.impressions ?? []);
        const profileViews = sumArr(current?.profileViews ?? []);
        const websiteClicks = sumArr(current?.websiteClicks ?? []);
        const prevReach = sumArr(prev?.reach ?? []);
        const prevImpressions = sumArr(prev?.impressions ?? []);

        const dReach = calcDelta(reach, prevReach);
        const dImp = calcDelta(impressions, prevImpressions);

        const row = (label: string, val: number, delta: number | null = null) => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 14px;font-size:13px;color:#374151;">${label}</td>
            <td style="text-align:right;padding:10px 14px;font-size:14px;font-weight:700;color:#111827;">${val.toLocaleString("es-MX")}</td>
            <td style="text-align:right;padding:10px 14px;font-size:12px;font-weight:600;color:${deltaColor(delta)};">${deltaStr(delta)}</td>
          </tr>`;

        rows =
          row("Seguidores", followers) +
          row(`Alcance (${rangeDays}d)`, reach, dReach) +
          row(`Impresiones (${rangeDays}d)`, impressions, dImp) +
          (profileViews > 0 ? row(`Visitas al perfil (${rangeDays}d)`, profileViews) : "") +
          (websiteClicks > 0 ? row(`Clicks al sitio web (${rangeDays}d)`, websiteClicks) : "");
      } else {
        const [current, prev] = await Promise.all([
          fetchFacebookPageInsights(creds.accountId, creds.accessToken, since, until).catch(() => null),
          fetchFacebookPageInsights(creds.accountId, creds.accessToken, prevSince, prevUntil).catch(() => null),
        ]);

        const fans = current?.fanCount ?? 0;
        const reach = sumArr(current?.reach ?? []);
        const impressions = sumArr(current?.impressions ?? []);
        const engagements = sumArr(current?.postEngagements ?? []);
        const fanAdds = sumArr(current?.fanAdds ?? []);
        const prevReach = sumArr(prev?.reach ?? []);
        const prevImpressions = sumArr(prev?.impressions ?? []);

        const dReach = calcDelta(reach, prevReach);
        const dImp = calcDelta(impressions, prevImpressions);

        const row = (label: string, val: number, delta: number | null = null) => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 14px;font-size:13px;color:#374151;">${label}</td>
            <td style="text-align:right;padding:10px 14px;font-size:14px;font-weight:700;color:#111827;">${val.toLocaleString("es-MX")}</td>
            <td style="text-align:right;padding:10px 14px;font-size:12px;font-weight:600;color:${deltaColor(delta)};">${deltaStr(delta)}</td>
          </tr>`;

        rows =
          row("Fans totales", fans) +
          row(`Alcance (${rangeDays}d)`, reach, dReach) +
          row(`Impresiones (${rangeDays}d)`, impressions, dImp) +
          row(`Engagements (${rangeDays}d)`, engagements) +
          (fanAdds > 0 ? row(`Nuevos fans (${rangeDays}d)`, fanAdds) : "");
      }

      const reportDate = new Date().toLocaleDateString("es-MX", {
        year: "numeric", month: "long", day: "numeric",
      });
      const rangeLabel = input.range === "7d" ? "últimos 7 días" : input.range === "14d" ? "últimas 2 semanas" : input.range === "30d" ? "últimos 30 días" : "últimos 90 días";

      const tableHtml = `
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          Reporte de <strong style="color:${accentColor};">${networkLabel}</strong> para <strong>${client.companyName}</strong> — ${rangeLabel}.<br>
          <span style="font-size:12px;color:#9ca3af;">Generado el ${reportDate}.</span>
        </p>
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <thead>
            <tr style="background:${headerBg};">
              <th style="text-align:left;padding:10px 14px;font-size:12px;font-weight:600;color:#374151;border-bottom:2px solid ${headerBorder};">Métrica</th>
              <th style="text-align:right;padding:10px 14px;font-size:12px;font-weight:600;color:#374151;border-bottom:2px solid ${headerBorder};">Valor</th>
              <th style="text-align:right;padding:10px 14px;font-size:12px;font-weight:600;color:#374151;border-bottom:2px solid ${headerBorder};">Vs período anterior</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://isysocial.com";

      for (const email of input.emails) {
        await sendEmailNotification({
          db: ctx.db,
          to: email,
          subject: `Reporte ${networkLabel} — ${client.companyName} (${rangeLabel})`,
          title: `Analytics de ${networkLabel} — ${client.companyName}`,
          body: tableHtml,
          actionUrl: `${appUrl}/admin/analiticas/social`,
          actionLabel: "Ver analytics completos",
        });
      }

      return { success: true, sentTo: input.emails.length };
    }),

  // ─── Get Report Schedule ─────────────────────────────────────────────────────
  getReportSchedule: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        network: z.enum(["INSTAGRAM", "FACEBOOK"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const key = `report_schedule_${agencyId}_${input.clientId}_${input.network}`;
      const config = await ctx.db.systemConfig.findUnique({ where: { key } });
      if (!config) return null;
      try {
        return JSON.parse(config.value as string) as {
          enabled: boolean;
          frequency: "weekly" | "monthly";
          emails: string[];
          range: "7d" | "14d" | "30d" | "90d";
          updatedAt: string;
        };
      } catch {
        return null;
      }
    }),

  // ─── Set Report Schedule ─────────────────────────────────────────────────────
  setReportSchedule: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        network: z.enum(["INSTAGRAM", "FACEBOOK"]),
        enabled: z.boolean(),
        frequency: z.enum(["weekly", "monthly"]),
        emails: z.array(z.string().email()).min(1).max(5),
        range: z.enum(["7d", "14d", "30d", "90d"]).default("30d"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const key = `report_schedule_${agencyId}_${input.clientId}_${input.network}`;
      const value = JSON.stringify({
        enabled: input.enabled,
        frequency: input.frequency,
        emails: input.emails,
        range: input.range,
        agencyId,
        clientId: input.clientId,
        network: input.network,
        updatedAt: new Date().toISOString(),
      });
      await ctx.db.systemConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      return { success: true };
    }),
});
