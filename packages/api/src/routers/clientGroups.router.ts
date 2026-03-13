import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, protectedProcedure, getAgencyId } from "../trpc";

export const clientGroupsRouter = router({
  // List all groups for the agency (with client counts)
  list: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    return ctx.db.clientGroup.findMany({
      where: { agencyId },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { clients: true } },
      },
    });
  }),

  // Create a new group
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Get max order
      const last = await ctx.db.clientGroup.findFirst({
        where: { agencyId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      return ctx.db.clientGroup.create({
        data: {
          agencyId,
          name: input.name,
          color: input.color ?? "#6B7280",
          order: (last?.order ?? 0) + 1,
        },
      });
    }),

  // Update a group (name and/or color)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const group = await ctx.db.clientGroup.findUnique({
        where: { id: input.id },
      });

      if (!group || group.agencyId !== agencyId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
      }

      return ctx.db.clientGroup.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.color !== undefined && { color: input.color }),
        },
      });
    }),

  // Delete a group (clients become ungrouped)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const group = await ctx.db.clientGroup.findUnique({
        where: { id: input.id },
      });

      if (!group || group.agencyId !== agencyId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
      }

      // Unassign all clients from this group first
      await ctx.db.clientProfile.updateMany({
        where: { groupId: input.id },
        data: { groupId: null },
      });

      return ctx.db.clientGroup.delete({
        where: { id: input.id },
      });
    }),

  // Assign a client to a group (or remove from group with groupId = null)
  assignClient: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        groupId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findUnique({
        where: { id: input.clientId },
      });

      if (!client || client.agencyId !== agencyId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      // Validate group belongs to agency
      if (input.groupId) {
        const group = await ctx.db.clientGroup.findUnique({
          where: { id: input.groupId },
        });
        if (!group || group.agencyId !== agencyId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Grupo no encontrado" });
        }
      }

      return ctx.db.clientProfile.update({
        where: { id: input.clientId },
        data: { groupId: input.groupId },
      });
    }),

  // Reorder groups
  reorder: adminProcedure
    .input(
      z.object({
        groupIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Update order for each group
      await Promise.all(
        input.groupIds.map((id, index) =>
          ctx.db.clientGroup.updateMany({
            where: { id, agencyId },
            data: { order: index },
          })
        )
      );

      return { success: true };
    }),
});
