import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, protectedProcedure, getAgencyId } from "../trpc";

export const agenciesRouter = router({
  /** Public query for all authenticated users — returns agency logo for sidebar */
  getAgencyLogo: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = ctx.session.user.agencyId as string | undefined;
    if (!agencyId) return null;
    return ctx.db.agency.findUnique({
      where: { id: agencyId },
      select: { logoUrl: true, logoDarkUrl: true, name: true, timezone: true },
    });
  }),

  /** Public query for all authenticated users — returns agency timezone */
  getTimezone: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = ctx.session.user.agencyId as string | undefined;
    if (!agencyId) return null;
    const agency = await ctx.db.agency.findUnique({
      where: { id: agencyId },
      select: { timezone: true },
    });
    return agency?.timezone ?? "America/Mexico_City";
  }),

  get: adminProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    const agency = await ctx.db.agency.findUnique({
      where: { id: agencyId },
      include: {
        _count: {
          select: { users: true, clients: true, posts: true },
        },
      },
    });

    if (!agency) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agencia no encontrada" });
    }

    return agency;
  }),

  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        logoUrl: z.string().url().optional().or(z.literal("")),
        logoDarkUrl: z.string().url().optional().or(z.literal("")),
        primaryColor: z.string().optional(),
        accentColor: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      await ctx.db.agency.update({
        where: { id: agencyId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl || null }),
          ...(input.logoDarkUrl !== undefined && { logoDarkUrl: input.logoDarkUrl || null }),
          ...(input.primaryColor && { primaryColor: input.primaryColor }),
          ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
          ...(input.timezone && { timezone: input.timezone }),
        },
      });

      return { success: true };
    }),

  getStats: adminProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    const [totalClients, totalEditors, totalPosts, pendingApprovals] =
      await Promise.all([
        ctx.db.clientProfile.count({ where: { agencyId, isActive: true } }),
        ctx.db.user.count({ where: { agencyId, role: "EDITOR", isActive: true } }),
        ctx.db.post.count({ where: { agencyId } }),
        ctx.db.post.count({ where: { agencyId, status: "IN_REVIEW" } }),
      ]);

    return { totalClients, totalEditors, totalPosts, pendingApprovals };
  }),

  /** Enriched admin dashboard data — pipeline, recent activity, upcoming posts */
  getDashboardData: adminProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalClients,
      totalEditors,
      totalPosts,
      postsThisMonth,
      publishedThisMonth,
      pendingApprovals,
      changesRequested,
      scheduledCount,
      draftCount,
      // Pipeline: posts by status
      pipelineCounts,
      // Recent activity
      recentActivity,
      // Upcoming scheduled posts
      upcomingPosts,
      // Posts waiting longest for approval
      oldestPending,
    ] = await Promise.all([
      ctx.db.clientProfile.count({ where: { agencyId, isActive: true } }),
      ctx.db.user.count({ where: { agencyId, role: "EDITOR", isActive: true } }),
      ctx.db.post.count({ where: { agencyId } }),
      ctx.db.post.count({ where: { agencyId, createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.post.count({ where: { agencyId, status: "PUBLISHED", publishedAt: { gte: thirtyDaysAgo } } }),
      ctx.db.post.count({ where: { agencyId, status: "IN_REVIEW" } }),
      ctx.db.post.count({ where: { agencyId, status: "CLIENT_CHANGES" } }),
      ctx.db.post.count({ where: { agencyId, status: "SCHEDULED" } }),
      ctx.db.post.count({ where: { agencyId, status: "DRAFT" } }),
      // Pipeline
      ctx.db.post.groupBy({
        by: ["status"],
        where: { agencyId },
        _count: { id: true },
      }),
      // Recent activity (last 8 status changes)
      ctx.db.postStatusLog.findMany({
        where: { post: { agencyId } },
        orderBy: { changedAt: "desc" },
        take: 8,
        include: {
          post: {
            select: {
              id: true,
              title: true,
              copy: true,
              network: true,
              client: { select: { companyName: true } },
            },
          },
          changedBy: { select: { name: true, avatarUrl: true } },
        },
      }),
      // Upcoming 7 days
      ctx.db.post.findMany({
        where: {
          agencyId,
          scheduledAt: { gte: now, lte: sevenDaysFromNow },
          status: { in: ["APPROVED", "SCHEDULED"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: {
          client: { select: { companyName: true, logoUrl: true } },
          media: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      }),
      // Oldest pending approval posts
      ctx.db.post.findMany({
        where: { agencyId, status: "IN_REVIEW" },
        orderBy: { updatedAt: "asc" },
        take: 5,
        include: {
          client: { select: { companyName: true, logoUrl: true } },
          media: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    const pipeline = pipelineCounts.map((p) => ({
      status: p.status,
      count: p._count.id,
    }));

    return {
      stats: {
        totalClients,
        totalEditors,
        totalPosts,
        postsThisMonth,
        publishedThisMonth,
        pendingApprovals,
        changesRequested,
        scheduledCount,
        draftCount,
      },
      pipeline,
      recentActivity,
      upcomingPosts,
      oldestPending,
    };
  }),

  // ─── Agency Social Accounts ──────────────────────────────────────────────

  /** Returns all agency-level social accounts (Meta pages, IG, etc.) */
  getSocialAccounts: adminProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    return ctx.db.agencySocialAccount.findMany({
      where: { agencyId },
      orderBy: [{ network: "asc" }, { accountName: "asc" }],
      select: {
        id: true,
        network: true,
        accountId: true,
        accountName: true,
        profilePic: true,
        pageId: true,
        tokenExpiresAt: true,
        isActive: true,
        connectedAt: true,
      },
    });
  }),

  /** Disconnects (deletes) a specific agency social account */
  disconnectSocialAccount: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify the account belongs to this agency
      const account = await ctx.db.agencySocialAccount.findFirst({
        where: { id: input.id, agencyId },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cuenta social no encontrada",
        });
      }

      await ctx.db.agencySocialAccount.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /** Confirms & stores selected Facebook/Instagram pages from Meta OAuth */
  selectAndConnectPages: adminProcedure
    .input(
      z.object({
        accountIds: z.array(z.string()).min(1, "Debes seleccionar al menos una cuenta"),
        // The full account data is sent from the client to avoid cookie parsing issues
        accounts: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            network: z.enum(["FACEBOOK", "INSTAGRAM"]),
            accessToken: z.string(),
            profilePic: z.string().nullable(),
            tokenExpiresAt: z.string().nullable(),
            linkedPageId: z.string().optional(),
          })
        ),
        timestamp: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Check if session expired (> 15 minutes)
      if (Date.now() - input.timestamp > 15 * 60 * 1000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sesión expirada. Por favor intenta conectar Meta nuevamente.",
        });
      }

      // Filter selected accounts from input
      const selectedAccounts = input.accounts.filter((acc) =>
        input.accountIds.includes(acc.id)
      );

      if (selectedAccounts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se encontraron cuentas seleccionadas",
        });
      }

      // Store each selected account
      const connectedAccounts = [];

      for (const account of selectedAccounts) {
        const upsertedAccount = await ctx.db.agencySocialAccount.upsert({
          where: {
            agencyId_network_accountId: {
              agencyId,
              network: account.network,
              accountId: account.id,
            },
          },
          update: {
            accountName: account.name,
            accessToken: account.accessToken,
            tokenExpiresAt: account.tokenExpiresAt
              ? new Date(account.tokenExpiresAt)
              : null,
            profilePic: account.profilePic,
            pageId: "linkedPageId" in account ? account.linkedPageId : account.id,
            isActive: true,
            connectedAt: new Date(),
          },
          create: {
            agencyId,
            network: account.network,
            accountId: account.id,
            accountName: account.name,
            accessToken: account.accessToken,
            tokenExpiresAt: account.tokenExpiresAt
              ? new Date(account.tokenExpiresAt)
              : null,
            profilePic: account.profilePic,
            pageId: "linkedPageId" in account ? account.linkedPageId : account.id,
            isActive: true,
            connectedAt: new Date(),
          },
        });

        connectedAccounts.push(upsertedAccount);
      }

      return {
        success: true,
        connected: connectedAccounts.length,
        accounts: connectedAccounts.map((acc) => ({
          id: acc.id,
          name: acc.accountName,
          network: acc.network,
        })),
      };
    }),
});
