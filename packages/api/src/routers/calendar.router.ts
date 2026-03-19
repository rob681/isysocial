import { z } from "zod";
import { router, protectedProcedure, getAgencyId } from "../trpc";

export const calendarRouter = router({
  // ─── Get Month View ────────────────────────────────────────────────────
  getMonth: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        clientId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      const where: any = {
        agencyId,
        scheduledAt: { gte: startDate, lte: endDate },
        status: { notIn: ["CANCELLED"] },
      };

      // Client sees only their own posts
      if (user.role === "CLIENTE" && user.clientProfileId) {
        where.clientId = user.clientProfileId;
      }

      // Editor: only assigned clients
      if (user.role === "EDITOR") {
        const perms = (user.permissions ?? []) as string[];
        if (!perms.includes("MANAGE_ALL_CLIENTS")) {
          const assignments = await ctx.db.editorClientAssignment.findMany({
            where: { editor: { userId: user.id } },
            select: { clientId: true },
          });
          where.clientId = { in: assignments.map((a) => a.clientId) };
        }
      }

      if (input.clientId) where.clientId = input.clientId;

      const posts = await ctx.db.post.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        include: {
          client: {
            include: {
              user: { select: { name: true } },
            },
          },
          category: true,
          media: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      });

      // Group by day
      const byDay: Record<string, typeof posts> = {};
      for (const post of posts) {
        if (!post.scheduledAt) continue;
        const day = post.scheduledAt.toISOString().split("T")[0]!;
        if (!byDay[day]) byDay[day] = [];
        byDay[day]!.push(post);
      }

      return { posts: byDay, month: input.month, year: input.year };
    }),

  // ─── Get Week View ────────────────────────────────────────────────────
  getWeek: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        clientId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const start = new Date(input.startDate + "T00:00:00");
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const where: any = {
        agencyId,
        scheduledAt: { gte: start, lte: end },
        status: { notIn: ["CANCELLED"] },
      };

      if (user.role === "CLIENTE" && user.clientProfileId) {
        where.clientId = user.clientProfileId;
      }
      if (user.role === "EDITOR") {
        const perms = (user.permissions ?? []) as string[];
        if (!perms.includes("MANAGE_ALL_CLIENTS")) {
          const assignments = await ctx.db.editorClientAssignment.findMany({
            where: { editor: { userId: user.id } },
            select: { clientId: true },
          });
          where.clientId = { in: assignments.map((a) => a.clientId) };
        }
      }
      if (input.clientId) where.clientId = input.clientId;

      const posts = await ctx.db.post.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        include: {
          client: { include: { user: { select: { name: true } } } },
          category: true,
          media: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      });

      const byDay: Record<string, typeof posts> = {};
      for (const post of posts) {
        if (!post.scheduledAt) continue;
        const day = post.scheduledAt.toISOString().split("T")[0]!;
        if (!byDay[day]) byDay[day] = [];
        byDay[day]!.push(post);
      }

      return { posts: byDay, startDate: input.startDate };
    }),

  // ─── Get Day View ─────────────────────────────────────────────────────
  getDay: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        clientId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const start = new Date(input.date + "T00:00:00");
      const end = new Date(input.date + "T23:59:59.999");

      const where: any = {
        agencyId,
        scheduledAt: { gte: start, lte: end },
        status: { notIn: ["CANCELLED"] },
      };

      if (user.role === "CLIENTE" && user.clientProfileId) {
        where.clientId = user.clientProfileId;
      }
      if (user.role === "EDITOR") {
        const perms = (user.permissions ?? []) as string[];
        if (!perms.includes("MANAGE_ALL_CLIENTS")) {
          const assignments = await ctx.db.editorClientAssignment.findMany({
            where: { editor: { userId: user.id } },
            select: { clientId: true },
          });
          where.clientId = { in: assignments.map((a) => a.clientId) };
        }
      }
      if (input.clientId) where.clientId = input.clientId;

      const posts = await ctx.db.post.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        include: {
          client: { include: { user: { select: { name: true } } } },
          category: true,
          media: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      });

      const byHour: Record<number, typeof posts> = {};
      for (const post of posts) {
        if (!post.scheduledAt) continue;
        const hour = post.scheduledAt.getHours();
        if (!byHour[hour]) byHour[hour] = [];
        byHour[hour]!.push(post);
      }

      return { posts, byHour, date: input.date };
    }),

  // ─── Get Upcoming Posts ────────────────────────────────────────────────
  getUpcoming: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        days: z.number().int().min(1).max(90).default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + input.days);

      const where: any = {
        agencyId,
        scheduledAt: { gte: now, lte: end },
        status: { in: ["APPROVED", "SCHEDULED"] },
      };

      if (user.role === "CLIENTE" && user.clientProfileId) {
        where.clientId = user.clientProfileId;
      }

      if (input.clientId) where.clientId = input.clientId;

      const posts = await ctx.db.post.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        include: {
          client: {
            include: { user: { select: { name: true } } },
          },
          media: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      });

      return posts;
    }),
});
