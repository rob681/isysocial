import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, getAgencyId } from "../trpc";
import { inviteEditorSchema, updateEditorPermissionsSchema } from "@isysocial/shared";
import { createToken } from "../lib/tokens";
import { sendEmailNotification } from "../lib/email";

export const editorsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const skip = (input.page - 1) * input.limit;

      const where = {
        agencyId,
        role: "EDITOR" as const,
        isActive: true,
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" as const } },
                { email: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [editors, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            editorProfile: {
              include: {
                assignedClients: {
                  include: {
                    client: { select: { id: true, companyName: true, logoUrl: true } },
                  },
                },
              },
            },
          },
        }),
        ctx.db.user.count({ where }),
      ]);

      return {
        editors,
        total,
        pages: Math.ceil(total / input.limit),
        page: input.page,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const editor = await ctx.db.user.findFirst({
        where: { id: input.id, agencyId, role: "EDITOR" },
        include: {
          editorProfile: {
            include: {
              assignedClients: {
                include: {
                  client: {
                    include: {
                      socialNetworks: { where: { isActive: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!editor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Editor no encontrado" });
      }

      return editor;
    }),

  invite: adminProcedure
    .input(inviteEditorSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email ya está registrado.",
        });
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            role: "EDITOR",
            agencyId,
            isActive: true,
            editorProfile: {
              create: {
                permissions: input.permissions,
              },
            },
          },
        });
        return user;
      });

      const tokenString = await createToken(ctx.db, result.id, "INVITATION");
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/setup-password?token=${tokenString}`;

      await sendEmailNotification({
        db: ctx.db,
        to: input.email,
        subject: "Invitación — Únete a tu equipo en Isysocial",
        title: `Bienvenido, ${input.name}`,
        body: `Has sido invitado a unirte al equipo de contenido en Isysocial.<br><br>Haz clic en el botón de abajo para crear tu contraseña y empezar a trabajar.`,
        actionUrl: inviteUrl,
        actionLabel: "Crear contraseña y acceder",
      });

      return { success: true, userId: result.id };
    }),

  updatePermissions: adminProcedure
    .input(updateEditorPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const editor = await ctx.db.user.findFirst({
        where: { id: input.editorId, agencyId, role: "EDITOR" },
        include: { editorProfile: true },
      });

      if (!editor?.editorProfile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Editor no encontrado" });
      }

      await ctx.db.editorProfile.update({
        where: { id: editor.editorProfile.id },
        data: { permissions: input.permissions },
      });

      return { success: true };
    }),

  deactivate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const editor = await ctx.db.user.findFirst({
        where: { id: input.id, agencyId, role: "EDITOR" },
      });
      if (!editor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Editor no encontrado" });
      }

      await ctx.db.user.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  resendInvite: adminProcedure
    .input(z.object({ editorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const editor = await ctx.db.user.findFirst({
        where: { id: input.editorId, agencyId, role: "EDITOR" },
        select: { id: true, email: true, name: true, passwordHash: true },
      });
      if (!editor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Editor no encontrado" });
      }

      if (editor.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este editor ya configuró su contraseña.",
        });
      }

      const tokenString = await createToken(ctx.db, editor.id, "INVITATION");
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/setup-password?token=${tokenString}`;

      await sendEmailNotification({
        db: ctx.db,
        to: editor.email,
        subject: "Recordatorio de invitación — Isysocial",
        title: `Hola, ${editor.name}`,
        body: `Te recordamos que tienes una invitación pendiente para unirte al equipo en Isysocial.<br><br>Haz clic en el botón de abajo para crear tu contraseña.`,
        actionUrl: inviteUrl,
        actionLabel: "Crear contraseña y acceder",
      });

      return { success: true };
    }),

  // ─── Assign Clients to Editor ─────────────────────────────────────────────
  assignClients: adminProcedure
    .input(
      z.object({
        editorId: z.string(), // User ID of the editor
        clientIds: z.array(z.string()), // ClientProfile IDs
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify the editor belongs to this agency
      const editorProfile = await ctx.db.editorProfile.findFirst({
        where: { user: { id: input.editorId, agencyId, role: "EDITOR" } },
        select: { id: true },
      });
      if (!editorProfile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Editor no encontrado" });
      }

      // Verify all clientIds belong to this agency
      const validClients = input.clientIds.length > 0
        ? await ctx.db.clientProfile.findMany({
            where: { id: { in: input.clientIds }, agencyId },
            select: { id: true },
          })
        : [];

      const validClientIds = validClients.map((c) => c.id);

      // Replace all assignments atomically
      await ctx.db.$transaction(async (tx) => {
        await tx.editorClientAssignment.deleteMany({
          where: { editorId: editorProfile.id },
        });
        if (validClientIds.length > 0) {
          await tx.editorClientAssignment.createMany({
            data: validClientIds.map((clientId) => ({
              editorId: editorProfile.id,
              clientId,
            })),
          });
        }
      });

      return { success: true };
    }),

  // ─── My Assigned Clients (for the editor themselves) ─────────────────────
  myAssignedClients: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    if (user.role !== "EDITOR") return { clients: [], hasManageAll: true };

    const perms = (user.permissions ?? []) as string[];
    if (perms.includes("MANAGE_ALL_CLIENTS")) {
      return { clients: null, hasManageAll: true }; // null = all clients
    }

    const assignments = await ctx.db.editorClientAssignment.findMany({
      where: { editor: { userId: user.id } },
      select: {
        client: {
          select: { id: true, companyName: true },
        },
      },
    });

    return {
      clients: assignments.map((a) => a.client),
      hasManageAll: false,
    };
  }),
});
