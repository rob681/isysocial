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

      // Widen the query window by ±1 day so posts that fall outside the
      // month in UTC but inside the month in the user's local timezone
      // still come through. The client re-buckets by local date.
      const startDate = new Date(input.year, input.month - 1, 1);
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);
      endDate.setDate(endDate.getDate() + 1);

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

      // NOTE: grouping by day is done on the CLIENT using the browser's
      // local timezone. Previously we grouped here with
      // `post.scheduledAt.toISOString().split("T")[0]` which always uses
      // UTC — so a post scheduled at 22:00 Mexico local (04:00 UTC next
      // day) bucketed into the wrong day on the calendar.
      return { posts, month: input.month, year: input.year };
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

      // Widen by ±1 day so timezone edges don't drop posts. Client re-buckets.
      const start = new Date(input.startDate + "T00:00:00");
      start.setDate(start.getDate() - 1);
      const end = new Date(input.startDate + "T00:00:00");
      end.setDate(end.getDate() + 7);
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

      // Grouping by day happens on the client using local timezone. See
      // getMonth for rationale.
      return { posts, startDate: input.startDate };
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

      // Widen by ±1 day so timezone edges don't drop posts. Client re-buckets.
      const start = new Date(input.date + "T00:00:00");
      start.setDate(start.getDate() - 1);
      const end = new Date(input.date + "T23:59:59.999");
      end.setDate(end.getDate() + 1);

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

      // NOTE: grouping by hour is done on the CLIENT with the browser's
      // local timezone. `scheduledAt.getHours()` here would return the
      // hour in UTC (Vercel runtime), so a post scheduled for 11:00
      // Mexico local showed up in the 17:00 bucket — off by UTC offset.
      return { posts, date: input.date };
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
