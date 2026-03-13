import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

export const profileRouter = router({
  /**
   * Get current user's profile
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        agency: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
    }

    return user;
  }),

  /**
   * Update profile (name, phone, avatarUrl)
   */
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100).optional(),
        phone: z.string().max(20).optional().nullable(),
        avatarUrl: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          avatarUrl: true,
        },
      });
    }),

  /**
   * Change password (requires current password)
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "La contraseña actual es requerida"),
        newPassword: z
          .string()
          .min(6, "La nueva contraseña debe tener al menos 6 caracteres")
          .max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se puede cambiar la contraseña de este usuario.",
        });
      }

      const isValid = await compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "La contraseña actual es incorrecta.",
        });
      }

      const newHash = await hash(input.newPassword, 12);

      await ctx.db.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      return { success: true };
    }),
});
