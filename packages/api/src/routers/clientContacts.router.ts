import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, getAgencyId } from "../trpc";
import { createToken } from "../lib/tokens";
import { sendEmailNotification } from "../lib/email";

const CONTACT_ROLE_LABELS: Record<string, string> = {
  APPROVER: "Aprobador",
  REVIEWER: "Revisor",
  OBSERVER: "Observador",
};

export const clientContactsRouter = router({
  // ─── Listar contactos de un cliente ─────────────────────────────────────────
  list: adminProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verificar que el cliente pertenece a esta agencia
      const clientProfile = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: { id: true, companyName: true, user: { select: { name: true, email: true } } },
      });
      if (!clientProfile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      const contacts = await ctx.db.clientContact.findMany({
        where: { clientProfileId: input.clientId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        orderBy: { invitedAt: "asc" },
      });

      return {
        contacts,
        primaryUser: clientProfile.user,
        companyName: clientProfile.companyName,
      };
    }),

  // ─── Invitar nuevo contacto ──────────────────────────────────────────────────
  invite: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        name: z.string().min(2, "El nombre es requerido"),
        email: z.string().email("Email inválido"),
        phone: z.string().optional(),
        role: z.enum(["APPROVER", "REVIEWER", "OBSERVER"]).default("REVIEWER"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verificar que el cliente pertenece a esta agencia
      const clientProfile = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: { id: true, companyName: true, agencyId: true },
      });
      if (!clientProfile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      // Verificar que el email no esté ya en uso
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un usuario con ese email",
        });
      }

      // Crear User + ClientContact en transacción
      const result = await ctx.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            phone: input.phone,
            role: "CLIENTE",
            agencyId,
            isActive: true,
            clientContact: {
              create: {
                clientProfileId: input.clientId,
                role: input.role,
                isActive: true,
              },
            },
          },
          include: { clientContact: true },
        });
        return user;
      });

      // Crear token de invitación
      const tokenString = await createToken(ctx.db, result.id, "INVITATION");
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://isysocial.com";
      const inviteUrl = `${baseUrl}/setup-password?token=${tokenString}`;
      const roleLabel = CONTACT_ROLE_LABELS[input.role] ?? input.role;

      // Enviar email de invitación
      await sendEmailNotification({
        db: ctx.db,
        to: input.email,
        subject: `Invitación a revisar contenido de ${clientProfile.companyName}`,
        title: "Te invitaron a revisar contenido en Isysocial",
        body: `Hola ${input.name},\n\nFuiste invitado como <strong>${roleLabel}</strong> para revisar y aprobar el contenido de redes sociales de <strong>${clientProfile.companyName}</strong>.\n\nCrea tu contraseña para acceder:`,
        actionUrl: inviteUrl,
        actionLabel: "Crear contraseña y acceder",
      });

      return {
        contact: result.clientContact,
        userId: result.id,
        email: result.email,
      };
    }),

  // ─── Actualizar rol de un contacto ──────────────────────────────────────────
  updateRole: adminProcedure
    .input(
      z.object({
        contactId: z.string(),
        role: z.enum(["APPROVER", "REVIEWER", "OBSERVER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verificar que el contacto pertenece a un cliente de esta agencia
      const contact = await ctx.db.clientContact.findFirst({
        where: {
          id: input.contactId,
          clientProfile: { agencyId },
        },
      });
      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contacto no encontrado" });
      }

      const updated = await ctx.db.clientContact.update({
        where: { id: input.contactId },
        data: { role: input.role },
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      return updated;
    }),

  // ─── Desactivar / activar contacto ──────────────────────────────────────────
  setActive: adminProcedure
    .input(
      z.object({
        contactId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const contact = await ctx.db.clientContact.findFirst({
        where: {
          id: input.contactId,
          clientProfile: { agencyId },
        },
      });
      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contacto no encontrado" });
      }

      // También actualizar isActive en el User vinculado
      await ctx.db.$transaction([
        ctx.db.clientContact.update({
          where: { id: input.contactId },
          data: { isActive: input.isActive },
        }),
        ctx.db.user.update({
          where: { id: contact.userId },
          data: { isActive: input.isActive },
        }),
      ]);

      return { success: true };
    }),

  // ─── Reenviar invitación ─────────────────────────────────────────────────────
  resendInvite: adminProcedure
    .input(z.object({ contactId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const contact = await ctx.db.clientContact.findFirst({
        where: {
          id: input.contactId,
          clientProfile: { agencyId },
        },
        include: {
          user: { select: { id: true, name: true, email: true, passwordHash: true } },
          clientProfile: { select: { companyName: true } },
        },
      });
      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contacto no encontrado" });
      }

      // Si ya tiene contraseña, no reenviar invitación inicial
      if (contact.user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este contacto ya configuró su contraseña. Si olvidó su contraseña, use la opción de recuperación.",
        });
      }

      const tokenString = await createToken(ctx.db, contact.user.id, "INVITATION");
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://isysocial.com";
      const inviteUrl = `${baseUrl}/setup-password?token=${tokenString}`;
      const roleLabel = CONTACT_ROLE_LABELS[contact.role] ?? contact.role;

      await sendEmailNotification({
        db: ctx.db,
        to: contact.user.email,
        subject: `Recordatorio: Invitación a revisar contenido de ${contact.clientProfile.companyName}`,
        title: "Recordatorio de invitación — Isysocial",
        body: `Hola ${contact.user.name},\n\nTe recordamos que fuiste invitado como <strong>${roleLabel}</strong> para revisar y aprobar el contenido de <strong>${contact.clientProfile.companyName}</strong>.\n\nCrea tu contraseña para acceder:`,
        actionUrl: inviteUrl,
        actionLabel: "Crear contraseña y acceder",
      });

      return { success: true };
    }),

  // ─── Editar nombre y/o email del contacto ───────────────────────────────────
  updateContact: adminProcedure
    .input(
      z.object({
        contactId: z.string(),
        name: z.string().min(2, "El nombre es requerido").optional(),
        email: z.string().email("Email inválido").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const contact = await ctx.db.clientContact.findFirst({
        where: { id: input.contactId, clientProfile: { agencyId } },
        include: { user: { select: { id: true, email: true } } },
      });
      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contacto no encontrado" });
      }

      // Verificar que el nuevo email no esté ya en uso por otro usuario
      if (input.email && input.email !== contact.user.email) {
        const existing = await ctx.db.user.findUnique({ where: { email: input.email } });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este correo ya está registrado por otro usuario.",
          });
        }
      }

      const updated = await ctx.db.user.update({
        where: { id: contact.user.id },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.email ? { email: input.email } : {}),
        },
        select: { name: true, email: true },
      });

      return updated;
    }),

  // ─── Eliminar contacto ───────────────────────────────────────────────────────
  remove: adminProcedure
    .input(z.object({ contactId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const contact = await ctx.db.clientContact.findFirst({
        where: {
          id: input.contactId,
          clientProfile: { agencyId },
        },
      });
      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contacto no encontrado" });
      }

      // Eliminar User y ClientContact en cascada
      await ctx.db.user.delete({ where: { id: contact.userId } });

      return { success: true };
    }),
});
