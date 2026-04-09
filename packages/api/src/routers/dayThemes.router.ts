import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const dayThemesRouter = router({
  // Get all themes for a client
  getForClient: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.clientDayTheme.findMany({
        where: { clientProfileId: input.clientId },
        orderBy: { dayOfWeek: "asc" },
      });
    }),

  // Upsert a theme for a specific day
  upsert: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        dayOfWeek: z.number().int().min(0).max(6),
        theme: z.string().max(100),
        emoji: z.string().max(8).optional().nullable(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientDayTheme.upsert({
        where: {
          clientProfileId_dayOfWeek: {
            clientProfileId: input.clientId,
            dayOfWeek: input.dayOfWeek,
          },
        },
        create: {
          clientProfileId: input.clientId,
          dayOfWeek: input.dayOfWeek,
          theme: input.theme,
          emoji: input.emoji ?? null,
          isActive: input.isActive,
        },
        update: {
          theme: input.theme,
          emoji: input.emoji ?? null,
          isActive: input.isActive,
        },
      });
    }),

  // Delete a theme
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.clientDayTheme.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // Bulk set all 7 day themes for a client at once
  bulkSet: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        themes: z.array(
          z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            theme: z.string().max(100),
            emoji: z.string().max(8).optional().nullable(),
            isActive: z.boolean().default(true),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.themes.map((t) =>
          ctx.db.clientDayTheme.upsert({
            where: {
              clientProfileId_dayOfWeek: {
                clientProfileId: input.clientId,
                dayOfWeek: t.dayOfWeek,
              },
            },
            create: {
              clientProfileId: input.clientId,
              dayOfWeek: t.dayOfWeek,
              theme: t.theme,
              emoji: t.emoji ?? null,
              isActive: t.isActive,
            },
            update: {
              theme: t.theme,
              emoji: t.emoji ?? null,
              isActive: t.isActive,
            },
          })
        )
      );
      return results;
    }),
});
