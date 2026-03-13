import { z } from "zod";
import { hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import {
  setupPasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  registerAgencySchema,
} from "@isysocial/shared";
import { validateToken, createToken } from "../lib/tokens";
import { sendEmailNotification } from "../lib/email";

const resetRequestCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_RESET_REQUESTS = 3;
const RESET_WINDOW_MS = 15 * 60 * 1000;

const registerRequestCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_REGISTER_REQUESTS = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

function checkResetRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = resetRequestCounts.get(email);
  if (!entry || now > entry.resetAt) {
    resetRequestCounts.set(email, { count: 1, resetAt: now + RESET_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_RESET_REQUESTS) return false;
  entry.count++;
  return true;
}

export const authRouter = router({
  validateToken: publicProcedure
    .input(z.object({ token: z.string(), type: z.enum(["INVITATION", "PASSWORD_RESET"]) }))
    .query(async ({ ctx, input }) => {
      const token = await validateToken(ctx.db, input.token, input.type);
      if (!token) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "El enlace es inválido o ha expirado.",
        });
      }
      return {
        valid: true,
        userName: token.user.name,
        userEmail: token.user.email,
        hasPassword: !!token.user.passwordHash,
      };
    }),

  setupPassword: publicProcedure
    .input(setupPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const token = await validateToken(ctx.db, input.token, "INVITATION");
      if (!token) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "El enlace de invitación es inválido o ha expirado. Solicita al administrador que te reenvíe la invitación.",
        });
      }

      const passwordHash = await hash(input.password, 12);

      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: token.user.id },
          data: { passwordHash },
        }),
        ctx.db.token.update({
          where: { id: token.id },
          data: { usedAt: new Date() },
        }),
      ]);

      return { success: true, email: token.user.email };
    }),

  requestReset: publicProcedure
    .input(resetPasswordRequestSchema)
    .mutation(async ({ ctx, input }) => {
      if (!checkResetRateLimit(input.email)) return { success: true };

      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, name: true, isActive: true, passwordHash: true },
      });

      if (!user || !user.isActive || !user.passwordHash) return { success: true };

      const tokenString = await createToken(ctx.db, user.id, "PASSWORD_RESET");
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${tokenString}`;

      await sendEmailNotification({
        db: ctx.db,
        to: user.email,
        subject: "Restablecer tu contraseña — Isysocial",
        title: "Restablecer contraseña",
        body: `Hola ${user.name},<br><br>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva.<br><br>Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.`,
        actionUrl: resetUrl,
        actionLabel: "Restablecer contraseña",
      });

      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const token = await validateToken(ctx.db, input.token, "PASSWORD_RESET");
      if (!token) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "El enlace de restablecimiento es inválido o ha expirado. Solicita uno nuevo.",
        });
      }

      const passwordHash = await hash(input.password, 12);

      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: token.user.id },
          data: { passwordHash },
        }),
        ctx.db.token.update({
          where: { id: token.id },
          data: { usedAt: new Date() },
        }),
      ]);

      return { success: true, email: token.user.email };
    }),

  registerAgency: publicProcedure
    .input(registerAgencySchema)
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const entry = registerRequestCounts.get(input.email);
      if (entry && now < entry.resetAt && entry.count >= MAX_REGISTER_REQUESTS) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Demasiados intentos. Intenta de nuevo más tarde.",
        });
      }
      if (!entry || now > (entry?.resetAt ?? 0)) {
        registerRequestCounts.set(input.email, {
          count: 1,
          resetAt: now + REGISTER_WINDOW_MS,
        });
      } else {
        entry.count++;
      }

      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email ya está registrado. Inicia sesión o usa otro email.",
        });
      }

      const baseSlug = input.agencyName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      let slug = baseSlug || "agencia";
      let attempt = 0;
      while (await ctx.db.agency.findUnique({ where: { slug } })) {
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      const passwordHash = await hash(input.password, 12);
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const result = await ctx.db.$transaction(async (tx) => {
        const agency = await tx.agency.create({
          data: {
            name: input.agencyName,
            slug,
            planTier: "trial",
            trialEndsAt,
          },
        });

        const user = await tx.user.create({
          data: {
            email: input.email,
            name: input.adminName,
            passwordHash,
            role: "ADMIN",
            agencyId: agency.id,
          },
        });

        return { agency, user };
      });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      sendEmailNotification({
        db: ctx.db,
        to: input.email,
        subject: "Bienvenido a Isysocial — Tu agencia está lista",
        title: "¡Bienvenido a Isysocial!",
        body: `Hola ${input.adminName},<br><br>Tu agencia <strong>${input.agencyName}</strong> ha sido creada exitosamente. Tu prueba gratuita de 14 días comienza hoy.<br><br>Inicia sesión para empezar a gestionar tu contenido.`,
        actionUrl: `${baseUrl}/login`,
        actionLabel: "Iniciar sesión",
      }).catch(console.error);

      return { success: true, email: input.email, slug: result.agency.slug };
    }),
});
