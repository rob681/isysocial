import { z } from "zod";
import { router, superAdminProcedure } from "../trpc";

export const platformRouter = router({
  /**
   * Platform overview — global stats for SuperAdmin dashboard
   */
  overview: superAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalAgencies,
      activeAgencies,
      totalUsers,
      totalPosts,
      publishedThisMonth,
      recentAgencies,
    ] = await Promise.all([
      ctx.db.agency.count(),
      ctx.db.agency.count({ where: { isActive: true } }),
      ctx.db.user.count(),
      ctx.db.post.count(),
      ctx.db.post.count({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: startOfMonth },
        },
      }),
      ctx.db.agency.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          slug: true,
          planTier: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              posts: true,
            },
          },
        },
      }),
    ]);

    return {
      totalAgencies,
      activeAgencies,
      totalUsers,
      totalPosts,
      publishedThisMonth,
      recentAgencies,
    };
  }),

  /**
   * Paginated list of all agencies with counts
   */
  listAgencies: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(50).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, perPage, search } = input;
      const skip = (page - 1) * perPage;

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [agencies, total] = await Promise.all([
        ctx.db.agency.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: perPage,
          select: {
            id: true,
            name: true,
            slug: true,
            planTier: true,
            isActive: true,
            createdAt: true,
            logoUrl: true,
            _count: {
              select: {
                users: true,
                posts: true,
                clients: true,
                socialAccounts: true,
              },
            },
          },
        }),
        ctx.db.agency.count({ where }),
      ]);

      return {
        agencies,
        total,
        totalPages: Math.ceil(total / perPage),
        page,
      };
    }),

  /**
   * Single agency detail with users, posts stats, social accounts
   */
  agencyDetail: superAdminProcedure
    .input(z.object({ agencyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agency = await ctx.db.agency.findUnique({
        where: { id: input.agencyId },
        include: {
          _count: {
            select: {
              users: true,
              posts: true,
              clients: true,
              ideas: true,
              socialAccounts: true,
            },
          },
        },
      });

      if (!agency) {
        throw new Error("Agencia no encontrada");
      }

      const [users, postsByStatus, socialAccounts] = await Promise.all([
        ctx.db.user.findMany({
          where: { agencyId: input.agencyId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.post.groupBy({
          by: ["status"],
          where: { agencyId: input.agencyId },
          _count: { id: true },
        }),
        ctx.db.agencySocialAccount.findMany({
          where: { agencyId: input.agencyId },
          select: {
            id: true,
            network: true,
            accountName: true,
            isActive: true,
            connectedAt: true,
          },
        }),
      ]);

      return {
        agency,
        users,
        postsByStatus: postsByStatus.map((r) => ({
          status: r.status,
          count: r._count.id,
        })),
        socialAccounts,
      };
    }),
});
