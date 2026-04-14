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
import { checkRateLimit } from "../lib/rate-limit";

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
      // DB-backed rate limiting: 3 reset attempts per 15 minutes
      const allowed = await checkRateLimit(
        ctx.db,
        `reset:${input.email.toLowerCase()}`,
        3,
        15 * 60 * 1000
      );
      if (!allowed) return { success: true }; // silent fail — don't expose rate limit info

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
      // DB-backed rate limiting: 5 registrations per hour per email
      const allowed = await checkRateLimit(
        ctx.db,
        `register:${input.email.toLowerCase()}`,
        5,
        60 * 60 * 1000
      );
      if (!allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Demasiados intentos. Intenta de nuevo más tarde.",
        });
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
            emailVerified: false,  // Must verify email before login
          },
        });

        return { agency, user };
      });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      // Send email verification (required before login)
      const verifyToken = await createToken(ctx.db, result.user.id, "EMAIL_VERIFICATION");
      const verifyUrl = `${baseUrl}/verificar-email?token=${verifyToken}`;

      sendEmailNotification({
        db: ctx.db,
        to: input.email,
        subject: "Verifica tu correo — Isysocial",
        title: "Verifica tu correo electrónico",
        body: `Hola ${input.adminName},<br><br>Tu agencia <strong>${input.agencyName}</strong> ha sido creada exitosamente. Para activar tu cuenta y acceder a la plataforma, verifica tu correo electrónico.<br><br>Este enlace expira en 24 horas.`,
        actionUrl: verifyUrl,
        actionLabel: "Verificar mi correo",
      }).catch(console.error);

      return { success: true, email: input.email, slug: result.agency.slug };
    }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const token = await validateToken(ctx.db, input.token, "EMAIL_VERIFICATION");
      if (!token) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "El enlace de verificación es inválido o ha expirado.",
        });
      }

      await ctx.db.$transaction([
        ctx.db.user.update({
          where: { id: token.user.id },
          data: {
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        }),
        ctx.db.token.update({
          where: { id: token.id },
          data: { usedAt: new Date() },
        }),
      ]);

      return { success: true, email: token.user.email };
    }),

  resendVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      // Rate limit resend: 3 per hour
      const allowed = await checkRateLimit(
        ctx.db,
        `verify-resend:${input.email.toLowerCase()}`,
        3,
        60 * 60 * 1000
      );
      if (!allowed) return { success: true };

      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true, name: true, email: true, emailVerified: true, isActive: true },
      });

      // Silent fail if user not found or already verified
      if (!user || user.emailVerified || !user.isActive) return { success: true };

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const verifyToken = await createToken(ctx.db, user.id, "EMAIL_VERIFICATION");
      const verifyUrl = `${baseUrl}/verificar-email?token=${verifyToken}`;

      await sendEmailNotification({
        db: ctx.db,
        to: user.email,
        subject: "Verifica tu correo — Isysocial",
        title: "Verifica tu correo electrónico",
        body: `Hola ${user.name},<br><br>Haz clic en el botón de abajo para verificar tu correo y activar tu cuenta de Isysocial.<br><br>Este enlace expira en 24 horas.`,
        actionUrl: verifyUrl,
        actionLabel: "Verificar mi correo",
      });

      return { success: true };
    }),
});
