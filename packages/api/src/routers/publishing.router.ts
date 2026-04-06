// ─── Publishing Router ────────────────────────────────────────────────────────
// Handles direct publishing of posts to social networks

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAgencyId,
  adminOrPermissionProcedure,
} from "../trpc";
import { publishToNetwork } from "../lib/publishers/index";
import type { SocialNetwork } from "@isysocial/db";

export const publishingRouter = router({
  // ─── Get network connection status for a client ───────────────────────────
  getNetworkStatus: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client belongs to agency
      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: { id: true },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      // Fetch client-level networks
      const clientNetworks = await ctx.db.clientSocialNetwork.findMany({
        where: { clientId: input.clientId },
        select: {
          id: true,
          network: true,
          accountName: true,
          profilePic: true,
          isActive: true,
          accessToken: true,
          accountId: true,
          pageId: true,
          assignedAt: true,
          tokenExpiresAt: true,
          agencyAccountId: true,
        },
      });

      // Fetch agency-level accounts
      const agencyAccounts = await ctx.db.agencySocialAccount.findMany({
        where: { agencyId, isActive: true },
        select: {
          id: true,
          network: true,
          accountName: true,
          profilePic: true,
          isActive: true,
          accessToken: true,
          accountId: true,
          pageId: true,
          connectedAt: true,
          tokenExpiresAt: true,
        },
      });

      const clientResults = clientNetworks.map((n) => ({
        id: n.id,
        network: n.network,
        connected: !!n.accessToken && n.isActive,
        accountName: n.accountName,
        profilePic: n.profilePic,
        assignedAt: n.assignedAt,
        expiresAt: n.tokenExpiresAt,
        hasPageId: !!n.pageId,
        source: "client" as const,
      }));

      // Deduplicate: exclude agency accounts already linked via ClientSocialNetwork
      const linkedAgencyIds = new Set(
        clientNetworks.filter((n) => n.agencyAccountId).map((n) => n.agencyAccountId!)
      );
      const filteredAgencyAccounts = agencyAccounts.filter((a) => !linkedAgencyIds.has(a.id));

      const agencyResults = filteredAgencyAccounts.map((n) => ({
        id: n.id,
        network: n.network,
        connected: !!n.accessToken && n.isActive,
        accountName: n.accountName,
        profilePic: n.profilePic,
        assignedAt: n.connectedAt,
        expiresAt: n.tokenExpiresAt,
        hasPageId: !!n.pageId,
        source: "agency" as const,
      }));

      return [...clientResults, ...agencyResults];
    }),

  // ─── Publish a post to one or more networks ───────────────────────────────
  publishPost: adminOrPermissionProcedure("PUBLISH_POSTS")
    .input(
      z.object({
        postId: z.string(),
        networkIds: z.array(z.string()).default([]),
        agencyNetworkIds: z.array(z.string()).default([]),
      }).refine((d) => d.networkIds.length > 0 || d.agencyNetworkIds.length > 0, {
        message: "Debe seleccionar al menos una red social",
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Fetch post with media and client social networks
      const post = await ctx.db.post.findFirst({
        where: { id: input.postId, agencyId },
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          client: {
            include: {
              socialNetworks: input.networkIds.length > 0
                ? {
                    where: {
                      id: { in: input.networkIds },
                      isActive: true,
                      accessToken: { not: null },
                    },
                  }
                : false,
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post no encontrado" });
      }

      if (post.status !== "APPROVED" && post.status !== "SCHEDULED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo se pueden publicar posts con estado APPROVED o SCHEDULED",
        });
      }

      // Fetch agency accounts if needed
      let agencyAccounts: {
        id: string;
        network: SocialNetwork;
        accountName: string;
        accountId: string;
        accessToken: string;
        pageId: string | null;
      }[] = [];
      if (input.agencyNetworkIds.length > 0) {
        agencyAccounts = await ctx.db.agencySocialAccount.findMany({
          where: {
            id: { in: input.agencyNetworkIds },
            agencyId,
            isActive: true,
          },
          select: {
            id: true,
            network: true,
            accountName: true,
            accountId: true,
            accessToken: true,
            pageId: true,
          },
        });
      }

      const mediaUrls = post.media.map((m) => m.fileUrl);
      const results: {
        networkId: string;
        network: string;
        status: "SUCCESS" | "FAILED" | "SKIPPED";
        platformUrl?: string;
        error?: string;
        source: "client" | "agency";
      }[] = [];

      let anySuccess = false;

      // ── Publish to client-level networks ──
      const clientSocialNetworks = post.client.socialNetworks ?? [];
      for (const networkId of input.networkIds) {
        const sn = clientSocialNetworks.find((n) => n.id === networkId);

        if (!sn) {
          results.push({
            networkId,
            network: networkId,
            status: "SKIPPED",
            error: "Red social no conectada o token no disponible",
            source: "client",
          });
          continue;
        }

        // Create PENDING log
        const log = await ctx.db.postPublishLog.create({
          data: {
            postId: post.id,
            networkId: sn.id,
            network: sn.network,
            status: "PENDING",
            requestedById: ctx.session.user.id,
          },
        });

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

        await ctx.db.postPublishLog.update({
          where: { id: log.id },
          data: {
            status: publishResult.success ? "SUCCESS" : "FAILED",
            platformPostId: publishResult.platformPostId ?? null,
            platformUrl: publishResult.platformUrl ?? null,
            errorMessage: publishResult.error ?? null,
            publishedAt: publishResult.success ? new Date() : null,
          },
        });

        if (publishResult.success) anySuccess = true;

        results.push({
          networkId,
          network: sn.network,
          status: publishResult.success ? "SUCCESS" : "FAILED",
          platformUrl: publishResult.platformUrl,
          error: publishResult.error,
          source: "client",
        });
      }

      // ── Publish to agency-level networks ──
      for (const agencyNetworkId of input.agencyNetworkIds) {
        const sn = agencyAccounts.find((a) => a.id === agencyNetworkId);

        if (!sn) {
          results.push({
            networkId: agencyNetworkId,
            network: agencyNetworkId,
            status: "SKIPPED",
            error: "Cuenta de agencia no encontrada o inactiva",
            source: "agency",
          });
          continue;
        }

        // Create PENDING log with agencyAccountId
        const log = await ctx.db.postPublishLog.create({
          data: {
            postId: post.id,
            agencyAccountId: sn.id,
            network: sn.network,
            status: "PENDING",
            requestedById: ctx.session.user.id,
          },
        });

        const publishResult = await publishToNetwork({
          network: sn.network,
          copy: post.copy ?? "",
          hashtags: post.hashtags ?? "",
          mediaUrls,
          postType: post.postType,
          accountId: sn.accountId,
          accessToken: sn.accessToken,
          pageId: sn.pageId ?? undefined,
        });

        await ctx.db.postPublishLog.update({
          where: { id: log.id },
          data: {
            status: publishResult.success ? "SUCCESS" : "FAILED",
            platformPostId: publishResult.platformPostId ?? null,
            platformUrl: publishResult.platformUrl ?? null,
            errorMessage: publishResult.error ?? null,
            publishedAt: publishResult.success ? new Date() : null,
          },
        });

        if (publishResult.success) anySuccess = true;

        results.push({
          networkId: agencyNetworkId,
          network: sn.network,
          status: publishResult.success ? "SUCCESS" : "FAILED",
          platformUrl: publishResult.platformUrl,
          error: publishResult.error,
          source: "agency",
        });
      }

      // Update post status to PUBLISHED if at least one network succeeded
      if (anySuccess) {
        await ctx.db.post.update({
          where: { id: post.id },
          data: { status: "PUBLISHED" },
        });

        // Log status change
        await ctx.db.postStatusLog.create({
          data: {
            postId: post.id,
            fromStatus: post.status,
            toStatus: "PUBLISHED",
            changedById: ctx.session.user.id,
            note: `Publicado en: ${results.filter((r) => r.status === "SUCCESS").map((r) => r.network).join(", ")}`,
          },
        });
      }

      return { results, anySuccess };
    }),

  // ─── Get publish logs for a post ─────────────────────────────────────────
  getPublishLogs: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify post belongs to agency
      const post = await ctx.db.post.findFirst({
        where: { id: input.postId, agencyId },
        select: { id: true },
      });
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post no encontrado" });
      }

      return ctx.db.postPublishLog.findMany({
        where: { postId: input.postId },
        orderBy: { attemptedAt: "desc" },
        include: {
          requestedBy: { select: { id: true, name: true } },
          socialNetwork: { select: { accountName: true, profilePic: true } },
          agencyAccount: { select: { accountName: true, profilePic: true } },
        },
      });
    }),

  // ─── Retry a failed publish ───────────────────────────────────────────────
  retryPublish: adminOrPermissionProcedure("PUBLISH_POSTS")
    .input(z.object({ publishLogId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const log = await ctx.db.postPublishLog.findFirst({
        where: { id: input.publishLogId, status: "FAILED" },
        include: {
          post: {
            include: { media: { orderBy: { sortOrder: "asc" } } },
          },
          socialNetwork: true,
          agencyAccount: true,
        },
      });

      if (!log || !log.post || log.post.agencyId !== agencyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Log de publicación no encontrado o no puede reintentarse",
        });
      }

      // Determine which account to use: agency or client
      const sn = log.agencyAccount ?? log.socialNetwork;
      if (!sn || !sn.accessToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La red social no tiene token de acceso. Por favor reconecta la red.",
        });
      }

      // Update log to PENDING
      await ctx.db.postPublishLog.update({
        where: { id: log.id },
        data: { status: "PENDING", errorMessage: null, attemptedAt: new Date() },
      });

      const mediaUrls = log.post.media.map((m) => m.fileUrl);

      const result = await publishToNetwork({
        network: sn.network,
        copy: log.post.copy ?? "",
        hashtags: log.post.hashtags ?? "",
        mediaUrls,
        postType: log.post.postType,
        accountId: sn.accountId ?? "",
        accessToken: sn.accessToken,
        pageId: sn.pageId ?? undefined,
      });

      await ctx.db.postPublishLog.update({
        where: { id: log.id },
        data: {
          status: result.success ? "SUCCESS" : "FAILED",
          platformPostId: result.platformPostId ?? null,
          platformUrl: result.platformUrl ?? null,
          errorMessage: result.error ?? null,
          publishedAt: result.success ? new Date() : null,
        },
      });

      // If success, update post to PUBLISHED
      if (result.success) {
        await ctx.db.post.update({
          where: { id: log.postId },
          data: { status: "PUBLISHED" },
        });
      }

      return { success: result.success, platformUrl: result.platformUrl, error: result.error };
    }),

  // ─── Publish a story batch ────────────────────────────────────────────────
  publishBatch: adminOrPermissionProcedure("PUBLISH_POSTS")
    .input(
      z.object({
        batchId: z.string(),
        networkIds: z.array(z.string()).default([]),
        agencyNetworkIds: z.array(z.string()).default([]),
      }).refine((d) => d.networkIds.length > 0 || d.agencyNetworkIds.length > 0, {
        message: "Debe seleccionar al menos una red social",
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Fetch all posts in batch, ordered by sequence
      const posts = await ctx.db.post.findMany({
        where: { agencyId, storyBatchId: input.batchId },
        orderBy: { storySequence: "asc" },
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          client: {
            include: {
              socialNetworks: input.networkIds.length > 0
                ? {
                    where: {
                      id: { in: input.networkIds },
                      isActive: true,
                      accessToken: { not: null },
                    },
                  }
                : false,
            },
          },
        },
      });

      if (posts.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batería no encontrada" });
      }

      // Verify all posts are APPROVED
      const notApproved = posts.filter((p) => p.status !== "APPROVED" && p.status !== "SCHEDULED");
      if (notApproved.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No se pueden publicar ${notApproved.length} historias que no están aprobadas`,
        });
      }

      // Fetch agency accounts if needed
      let agencyAccounts: {
        id: string;
        network: SocialNetwork;
        accountName: string;
        accountId: string;
        accessToken: string;
        pageId: string | null;
      }[] = [];
      if (input.agencyNetworkIds.length > 0) {
        agencyAccounts = await ctx.db.agencySocialAccount.findMany({
          where: {
            id: { in: input.agencyNetworkIds },
            agencyId,
            isActive: true,
          },
          select: {
            id: true,
            network: true,
            accountName: true,
            accountId: true,
            accessToken: true,
            pageId: true,
          },
        });
      }

      const batchResults: {
        postId: string;
        sequence: number;
        title?: string | null;
        results: Array<{
          networkId: string;
          network: string;
          status: "SUCCESS" | "FAILED" | "SKIPPED";
          platformUrl?: string;
          error?: string;
          source: "client" | "agency";
        }>;
      }[] = [];

      // Publish each story with 5s delay between them
      for (let postIndex = 0; postIndex < posts.length; postIndex++) {
        const post = posts[postIndex];
        const results: {
          networkId: string;
          network: string;
          status: "SUCCESS" | "FAILED" | "SKIPPED";
          platformUrl?: string;
          error?: string;
          source: "client" | "agency";
        }[] = [];

        let anySuccess = false;

        // Publish to client-level networks
        const clientSocialNetworks = post.client.socialNetworks ?? [];
        for (const networkId of input.networkIds) {
          const sn = clientSocialNetworks.find((n) => n.id === networkId);

          if (!sn) {
            results.push({
              networkId,
              network: networkId,
              status: "SKIPPED",
              error: "Red social no conectada o token no disponible",
              source: "client",
            });
            continue;
          }

          // Create PENDING log
          const log = await ctx.db.postPublishLog.create({
            data: {
              postId: post.id,
              networkId: sn.id,
              network: sn.network,
              status: "PENDING",
              requestedById: ctx.session.user.id,
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

          await ctx.db.postPublishLog.update({
            where: { id: log.id },
            data: {
              status: publishResult.success ? "SUCCESS" : "FAILED",
              platformPostId: publishResult.platformPostId ?? null,
              platformUrl: publishResult.platformUrl ?? null,
              errorMessage: publishResult.error ?? null,
              publishedAt: publishResult.success ? new Date() : null,
            },
          });

          if (publishResult.success) anySuccess = true;

          results.push({
            networkId,
            network: sn.network,
            status: publishResult.success ? "SUCCESS" : "FAILED",
            platformUrl: publishResult.platformUrl,
            error: publishResult.error,
            source: "client",
          });
        }

        // Publish to agency-level networks
        for (const agencyNetworkId of input.agencyNetworkIds) {
          const sn = agencyAccounts.find((a) => a.id === agencyNetworkId);

          if (!sn) {
            results.push({
              networkId: agencyNetworkId,
              network: agencyNetworkId,
              status: "SKIPPED",
              error: "Red social no conectada",
              source: "agency",
            });
            continue;
          }

          // Create PENDING log
          const log = await ctx.db.postPublishLog.create({
            data: {
              postId: post.id,
              agencyAccountId: sn.id,
              network: sn.network,
              status: "PENDING",
              requestedById: ctx.session.user.id,
            },
          });

          const mediaUrls = post.media.map((m) => m.fileUrl);
          const publishResult = await publishToNetwork({
            network: sn.network,
            copy: post.copy ?? "",
            hashtags: post.hashtags ?? "",
            mediaUrls,
            postType: post.postType,
            accountId: sn.accountId,
            accessToken: sn.accessToken,
            pageId: sn.pageId ?? undefined,
          });

          await ctx.db.postPublishLog.update({
            where: { id: log.id },
            data: {
              status: publishResult.success ? "SUCCESS" : "FAILED",
              platformPostId: publishResult.platformPostId ?? null,
              platformUrl: publishResult.platformUrl ?? null,
              errorMessage: publishResult.error ?? null,
              publishedAt: publishResult.success ? new Date() : null,
            },
          });

          if (publishResult.success) anySuccess = true;

          results.push({
            networkId: agencyNetworkId,
            network: sn.network,
            status: publishResult.success ? "SUCCESS" : "FAILED",
            platformUrl: publishResult.platformUrl,
            error: publishResult.error,
            source: "agency",
          });
        }

        // Update post status if any publish succeeded
        if (anySuccess) {
          await ctx.db.post.update({
            where: { id: post.id },
            data: { status: "PUBLISHED" },
          });
        }

        batchResults.push({
          postId: post.id,
          sequence: post.storySequence ?? postIndex,
          title: post.title,
          results,
        });

        // Add 5s delay between publications (except after the last one)
        if (postIndex < posts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      return { batchId: input.batchId, publishedCount: posts.length, results: batchResults };
    }),
});
