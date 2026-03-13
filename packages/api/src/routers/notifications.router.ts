import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(50).default(20),
        page: z.number().int().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const where = {
        userId,
        ...(input.unreadOnly ? { isRead: false } : {}),
      };

      const [notifications, total, unreadCount] = await Promise.all([
        ctx.db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: (input.page - 1) * input.limit,
        }),
        ctx.db.notification.count({ where }),
        ctx.db.notification.count({ where: { userId, isRead: false } }),
      ]);

      return {
        notifications,
        unreadCount,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { isRead: true },
      });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: { userId: ctx.session.user.id, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: { userId: ctx.session.user.id, isRead: false },
    });
    return { count };
  }),
});
