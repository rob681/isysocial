import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, getAgencyId } from "../trpc";
import {
  fetchInstagramMediaInsights,
  fetchInstagramAccountInsights,
  fetchFacebookPageInsights,
} from "../lib/insights/meta";
import type {
  InstagramAccountInsights,
  FacebookPageInsights,
} from "../lib/insights/meta";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRangeDate(range: string): { since: Date; until: Date } {
  const until = new Date();
  let days: number;
  switch (range) {
    case "7d":
      days = 7;
      break;
    case "14d":
      days = 14;
      break;
    case "90d":
      days = 90;
      break;
    case "30d":
    default:
      days = 30;
  }
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  return { since, until };
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

      console.log(
        `[socialInsights] getAccountInsights: client=${input.clientId}, network=${input.network}, range=${input.range}, source=${creds.source}`
      );

      if (input.network === "INSTAGRAM") {
        const data = await fetchInstagramAccountInsights(
          creds.accountId,
          creds.accessToken,
          since,
          until
        );
        return {
          network: "INSTAGRAM" as const,
          clientId: input.clientId,
          clientName: client.companyName,
          range: input.range,
          data,
        };
      }

      // FACEBOOK
      const data = await fetchFacebookPageInsights(
        creds.accountId,
        creds.accessToken,
        since,
        until
      );
      return {
        network: "FACEBOOK" as const,
        clientId: input.clientId,
        clientName: client.companyName,
        range: input.range,
        data,
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
          // page_views_total as a proxy for reach on FB
          totalReach += data.views.reduce((a, b) => a + b, 0);
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
          totalReach += data.views.reduce((a, b) => a + b, 0);
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
});
