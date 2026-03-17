import { z } from "zod";
import { router, adminProcedure, adminOrPermissionProcedure, getAgencyId } from "../trpc";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDateRange(range: string) {
  const now = new Date();
  let from: Date;

  switch (range) {
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "12m":
      from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { from, to: now };
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const analyticsRouter = router({
  /**
   * Overview — key metrics cards
   */
  getOverview: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "12m"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { from, to } = getDateRange(input.range);

      const [
        totalPosts,
        postsInRange,
        publishedInRange,
        pendingApproval,
        approvedInRange,
        totalClients,
        totalEditors,
        totalIdeas,
        ideasConverted,
      ] = await Promise.all([
        ctx.db.post.count({ where: { agencyId } }),
        ctx.db.post.count({ where: { agencyId, createdAt: { gte: from, lte: to } } }),
        ctx.db.post.count({
          where: { agencyId, status: "PUBLISHED", publishedAt: { gte: from, lte: to } },
        }),
        ctx.db.post.count({ where: { agencyId, status: "IN_REVIEW" } }),
        ctx.db.post.count({
          where: {
            agencyId,
            status: { in: ["APPROVED", "SCHEDULED", "PUBLISHED"] },
            createdAt: { gte: from, lte: to },
          },
        }),
        ctx.db.clientProfile.count({ where: { agencyId, isActive: true } }),
        ctx.db.user.count({ where: { agencyId, role: "EDITOR", isActive: true } }),
        ctx.db.idea.count({ where: { agencyId, createdAt: { gte: from, lte: to } } }),
        ctx.db.idea.count({
          where: { agencyId, status: "CONVERTED", createdAt: { gte: from, lte: to } },
        }),
      ]);

      // Previous period for comparison
      const rangeDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
      const prevFrom = new Date(from.getTime() - rangeDays * 24 * 60 * 60 * 1000);

      const [prevPosts, prevPublished] = await Promise.all([
        ctx.db.post.count({ where: { agencyId, createdAt: { gte: prevFrom, lt: from } } }),
        ctx.db.post.count({
          where: { agencyId, status: "PUBLISHED", publishedAt: { gte: prevFrom, lt: from } },
        }),
      ]);

      const postsGrowth = prevPosts === 0 ? 100 : Math.round(((postsInRange - prevPosts) / prevPosts) * 100);
      const publishedGrowth = prevPublished === 0 ? 100 : Math.round(((publishedInRange - prevPublished) / prevPublished) * 100);

      return {
        totalPosts,
        postsInRange,
        publishedInRange,
        pendingApproval,
        approvedInRange,
        totalClients,
        totalEditors,
        totalIdeas,
        ideasConverted,
        postsGrowth,
        publishedGrowth,
        approvalRate: postsInRange > 0 ? Math.round((approvedInRange / postsInRange) * 100) : 0,
        conversionRate: totalIdeas > 0 ? Math.round((ideasConverted / totalIdeas) * 100) : 0,
      };
    }),

  /**
   * Posts by status — for pie chart
   */
  getPostsByStatus: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "12m"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { from } = getDateRange(input.range);

      const results = await ctx.db.post.groupBy({
        by: ["status"],
        where: { agencyId, createdAt: { gte: from } },
        _count: { id: true },
      });

      const statusLabels: Record<string, string> = {
        DRAFT: "Borrador",
        IN_REVIEW: "En revisión",
        CLIENT_CHANGES: "Cambios solicitados",
        APPROVED: "Aprobado",
        SCHEDULED: "Programado",
        PUBLISHED: "Publicado",
        PAUSED: "Pausado",
        CANCELLED: "Cancelado",
      };

      const statusColors: Record<string, string> = {
        DRAFT: "#94a3b8",
        IN_REVIEW: "#3b82f6",
        CLIENT_CHANGES: "#f97316",
        APPROVED: "#22c55e",
        SCHEDULED: "#06b6d4",
        PUBLISHED: "#8b5cf6",
        PAUSED: "#eab308",
        CANCELLED: "#ef4444",
      };

      return results.map((r) => ({
        status: r.status,
        label: statusLabels[r.status] || r.status,
        count: r._count.id,
        color: statusColors[r.status] || "#94a3b8",
      }));
    }),

  /**
   * Posts by network — for pie chart
   */
  getPostsByNetwork: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "12m"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { from } = getDateRange(input.range);

      const results = await ctx.db.post.groupBy({
        by: ["network"],
        where: { agencyId, createdAt: { gte: from } },
        _count: { id: true },
      });

      const networkColors: Record<string, string> = {
        INSTAGRAM: "#E4405F",
        FACEBOOK: "#1877F2",
        LINKEDIN: "#0A66C2",
        TIKTOK: "#000000",
        X: "#1DA1F2",
      };

      return results.map((r) => ({
        network: r.network,
        count: r._count.id,
        color: networkColors[r.network] || "#94a3b8",
      }));
    }),

  /**
   * Posts timeline — line chart over date
   */
  getPostsTimeline: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "12m"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { from, to } = getDateRange(input.range);

      // Fetch posts in range
      const posts = await ctx.db.post.findMany({
        where: { agencyId, createdAt: { gte: from, lte: to } },
        select: { createdAt: true, status: true, publishedAt: true },
      });

      // Determine grouping: daily for 7d/30d, weekly for 90d, monthly for 12m
      const isMonthly = input.range === "12m";
      const isWeekly = input.range === "90d";

      function getKey(date: Date) {
        if (isMonthly) {
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        }
        if (isWeekly) {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          return startOfWeek.toISOString().slice(0, 10);
        }
        return date.toISOString().slice(0, 10);
      }

      const buckets = new Map<string, { created: number; published: number }>();

      // Fill buckets with zeros
      const current = new Date(from);
      while (current <= to) {
        const key = getKey(current);
        if (!buckets.has(key)) {
          buckets.set(key, { created: 0, published: 0 });
        }
        if (isMonthly) {
          current.setMonth(current.getMonth() + 1);
        } else if (isWeekly) {
          current.setDate(current.getDate() + 7);
        } else {
          current.setDate(current.getDate() + 1);
        }
      }

      for (const post of posts) {
        const key = getKey(post.createdAt);
        const bucket = buckets.get(key);
        if (bucket) bucket.created++;

        if (post.publishedAt) {
          const pubKey = getKey(post.publishedAt);
          const pubBucket = buckets.get(pubKey);
          if (pubBucket) pubBucket.published++;
        }
      }

      return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          created: data.created,
          published: data.published,
        }));
    }),

  /**
   * Per-client breakdown — table / bar chart
   */
  getClientMetrics: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "12m"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { from } = getDateRange(input.range);

      const clients = await ctx.db.clientProfile.findMany({
        where: { agencyId, isActive: true },
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          user: { select: { name: true } },
        },
      });

      const postsByClient = await ctx.db.post.groupBy({
        by: ["clientId"],
        where: { agencyId, createdAt: { gte: from } },
        _count: { id: true },
      });

      const publishedByClient = await ctx.db.post.groupBy({
        by: ["clientId"],
        where: { agencyId, status: "PUBLISHED", createdAt: { gte: from } },
        _count: { id: true },
      });

      const pendingByClient = await ctx.db.post.groupBy({
        by: ["clientId"],
        where: { agencyId, status: "IN_REVIEW" },
        _count: { id: true },
      });

      const postsMap = new Map(postsByClient.map((r) => [r.clientId, r._count.id]));
      const publishedMap = new Map(publishedByClient.map((r) => [r.clientId, r._count.id]));
      const pendingMap = new Map(pendingByClient.map((r) => [r.clientId, r._count.id]));

      return clients
        .map((c) => ({
          clientId: c.id,
          name: c.companyName || c.user.name || "Sin nombre",
          logoUrl: c.logoUrl,
          totalPosts: postsMap.get(c.id) ?? 0,
          published: publishedMap.get(c.id) ?? 0,
          pending: pendingMap.get(c.id) ?? 0,
        }))
        .sort((a, b) => b.totalPosts - a.totalPosts);
    }),

  /**
   * Editor productivity — posts per editor
   */
  getEditorMetrics: adminProcedure
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "12m"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { from } = getDateRange(input.range);

      const editors = await ctx.db.user.findMany({
        where: { agencyId, role: "EDITOR", isActive: true },
        select: { id: true, name: true, avatarUrl: true },
      });

      const postsByEditor = await ctx.db.post.groupBy({
        by: ["editorId"],
        where: { agencyId, editorId: { not: null }, createdAt: { gte: from } },
        _count: { id: true },
      });

      const publishedByEditor = await ctx.db.post.groupBy({
        by: ["editorId"],
        where: { agencyId, editorId: { not: null }, status: "PUBLISHED", createdAt: { gte: from } },
        _count: { id: true },
      });

      const postsMap = new Map(postsByEditor.map((r) => [r.editorId!, r._count.id]));
      const publishedMap = new Map(publishedByEditor.map((r) => [r.editorId!, r._count.id]));

      return editors
        .map((e) => ({
          editorId: e.id,
          name: e.name || "Sin nombre",
          avatarUrl: e.avatarUrl,
          totalPosts: postsMap.get(e.id) ?? 0,
          published: publishedMap.get(e.id) ?? 0,
        }))
        .sort((a, b) => b.totalPosts - a.totalPosts);
    }),

  /**
   * Posts by type (IMAGE, CAROUSEL, REEL, etc.)
   */
  getPostsByType: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "12m"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { from } = getDateRange(input.range);

      const results = await ctx.db.post.groupBy({
        by: ["postType"],
        where: { agencyId, createdAt: { gte: from } },
        _count: { id: true },
      });

      const typeLabels: Record<string, string> = {
        IMAGE: "Imagen",
        CAROUSEL: "Carrusel",
        STORY: "Story",
        REEL: "Reel",
        VIDEO: "Video",
        TEXT: "Texto",
      };

      const typeColors: Record<string, string> = {
        IMAGE: "#3b82f6",
        CAROUSEL: "#8b5cf6",
        STORY: "#f59e0b",
        REEL: "#ec4899",
        VIDEO: "#ef4444",
        TEXT: "#22c55e",
      };

      return results.map((r) => ({
        type: r.postType,
        label: typeLabels[r.postType] || r.postType,
        count: r._count.id,
        color: typeColors[r.postType] || "#94a3b8",
      }));
    }),

  /**
   * Weekly publishing activity — last 4 weeks
   */
  getWeeklyPublishing: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .query(async ({ ctx }) => {
      const agencyId = getAgencyId(ctx);
      const now = new Date();
      const weeks: { label: string; from: Date; to: Date }[] = [];

      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i + 1) * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - i * 7);
        weekEnd.setHours(23, 59, 59, 999);

        const startDay = weekStart.getDate();
        const startMonth = weekStart.toLocaleDateString("es", { month: "short" });
        const endDay = weekEnd.getDate();
        weeks.push({
          label: `${startDay} ${startMonth} – ${endDay}`,
          from: weekStart,
          to: weekEnd,
        });
      }

      const results = await Promise.all(
        weeks.map(async (week) => {
          const [created, published] = await Promise.all([
            ctx.db.post.count({
              where: { agencyId, createdAt: { gte: week.from, lte: week.to } },
            }),
            ctx.db.post.count({
              where: { agencyId, status: "PUBLISHED", publishedAt: { gte: week.from, lte: week.to } },
            }),
          ]);
          return { label: week.label, created, published };
        })
      );

      return results;
    }),

  /**
   * Recent published posts — last N published with details
   */
  getRecentPublished: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      return ctx.db.post.findMany({
        where: { agencyId, status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          title: true,
          network: true,
          postType: true,
          status: true,
          publishedAt: true,
          client: {
            select: { companyName: true, user: { select: { name: true } } },
          },
        },
      });
    }),

  /**
   * Recent activity — last status changes across all posts
   */
  getRecentActivity: adminOrPermissionProcedure("VIEW_ANALYTICS")
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      return ctx.db.postStatusLog.findMany({
        where: { post: { agencyId } },
        orderBy: { changedAt: "desc" },
        take: input.limit,
        include: {
          post: { select: { id: true, title: true, network: true } },
          changedBy: { select: { name: true, avatarUrl: true } },
        },
      });
    }),
});
