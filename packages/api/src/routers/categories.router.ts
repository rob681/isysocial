import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, getAgencyId } from "../trpc";
import { createPostCategorySchema, updatePostCategorySchema } from "@isysocial/shared";

export const categoriesRouter = router({
  // List all active categories for the agency (available to all roles)
  list: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    return ctx.db.postCategory.findMany({
      where: { agencyId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }),

  // List all categories including inactive (admin only)
  listAll: adminProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    return ctx.db.postCategory.findMany({
      where: { agencyId },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { posts: true } },
      },
    });
  }),

  // Create a new category (admin only)
  create: adminProcedure
    .input(createPostCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Check for duplicate name
      const existing = await ctx.db.postCategory.findUnique({
        where: { agencyId_name: { agencyId, name: input.name } },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe una categoría con ese nombre",
        });
      }

      // Get the next sort order
      const maxSort = await ctx.db.postCategory.findFirst({
        where: { agencyId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      return ctx.db.postCategory.create({
        data: {
          agencyId,
          name: input.name,
          color: input.color,
          sortOrder: (maxSort?.sortOrder ?? -1) + 1,
        },
      });
    }),

  // Update a category (admin only)
  update: adminProcedure
    .input(updatePostCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const category = await ctx.db.postCategory.findFirst({
        where: { id: input.id, agencyId },
      });
      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Categoría no encontrada" });
      }

      // Check for duplicate name if name is being changed
      if (input.name && input.name !== category.name) {
        const existing = await ctx.db.postCategory.findUnique({
          where: { agencyId_name: { agencyId, name: input.name } },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe una categoría con ese nombre",
          });
        }
      }

      return ctx.db.postCategory.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.color !== undefined && { color: input.color }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        },
      });
    }),

  // Delete a category (admin only) - soft delete if posts use it
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const category = await ctx.db.postCategory.findFirst({
        where: { id: input.id, agencyId },
        include: { _count: { select: { posts: true } } },
      });
      if (!category) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Categoría no encontrada" });
      }

      if (category._count.posts > 0) {
        // Soft delete: mark as inactive
        return ctx.db.postCategory.update({
          where: { id: input.id },
          data: { isActive: false },
        });
      } else {
        // Hard delete: no posts reference it
        return ctx.db.postCategory.delete({
          where: { id: input.id },
        });
      }
    }),

  // Reorder categories (admin only)
  reorder: adminProcedure
    .input(
      z.object({
        items: z.array(z.object({ id: z.string(), sortOrder: z.number().int() })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      await Promise.all(
        input.items.map((item) =>
          ctx.db.postCategory.updateMany({
            where: { id: item.id, agencyId },
            data: { sortOrder: item.sortOrder },
          })
        )
      );

      return { success: true };
    }),
});
