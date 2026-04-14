// ─── Email Settings Router ────────────────────────────────────────────────────
import { z } from "zod";
import { router } from "../trpc";
import { adminProcedure } from "../trpc";
import { sendEmailNotification } from "../lib/email";

const CONFIG_KEYS = [
  "notification_email_enabled",
  "resend_api_key",
  "email_from_address",
  "email_from_name",
  "notify_on_in_review",
  "notify_on_approved",
  "notify_on_changes_requested",
  "notify_on_published",
  "notify_on_comment",
] as const;

async function getConfigValue(
  db: any,
  key: string,
  defaultValue: any = null
) {
  const record = await db.systemConfig.findUnique({ where: { key } });
  return record?.value ?? defaultValue;
}

export const emailRouter = router({
  // ─── Get Settings ───────────────────────────────────────────────────────
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const records = await ctx.db.systemConfig.findMany({
      where: { key: { in: [...CONFIG_KEYS] } },
    });

    const map = new Map(records.map((r: any) => [r.key, r.value]));

    return {
      notificationEmailEnabled: map.get("notification_email_enabled") ?? true,
      resendApiKey: map.get("resend_api_key") ?? "",
      fromAddress:
        map.get("email_from_address") ??
        process.env.EMAIL_FROM_ADDRESS ??
        "noreply@isysocial.com",
      fromName: map.get("email_from_name") ?? "Isysocial",
      notifyOnInReview: map.get("notify_on_in_review") ?? true,
      notifyOnApproved: map.get("notify_on_approved") ?? true,
      notifyOnChangesRequested: map.get("notify_on_changes_requested") ?? true,
      notifyOnPublished: map.get("notify_on_published") ?? true,
      notifyOnComment: map.get("notify_on_comment") ?? true,
    };
  }),

  // ─── Update Settings ────────────────────────────────────────────────────
  updateSettings: adminProcedure
    .input(
      z.object({
        notificationEmailEnabled: z.boolean().optional(),
        resendApiKey: z.string().optional(),
        fromAddress: z.string().email("Dirección de email inválida").optional(),
        fromName: z.string().min(1).max(60).optional(),
        notifyOnInReview: z.boolean().optional(),
        notifyOnApproved: z.boolean().optional(),
        notifyOnChangesRequested: z.boolean().optional(),
        notifyOnPublished: z.boolean().optional(),
        notifyOnComment: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: { key: string; value: any }[] = [];

      if (input.notificationEmailEnabled !== undefined)
        updates.push({ key: "notification_email_enabled", value: input.notificationEmailEnabled });
      if (input.resendApiKey !== undefined && input.resendApiKey !== "")
        updates.push({ key: "resend_api_key", value: input.resendApiKey });
      if (input.fromAddress !== undefined)
        updates.push({ key: "email_from_address", value: input.fromAddress });
      if (input.fromName !== undefined)
        updates.push({ key: "email_from_name", value: input.fromName });
      if (input.notifyOnInReview !== undefined)
        updates.push({ key: "notify_on_in_review", value: input.notifyOnInReview });
      if (input.notifyOnApproved !== undefined)
        updates.push({ key: "notify_on_approved", value: input.notifyOnApproved });
      if (input.notifyOnChangesRequested !== undefined)
        updates.push({ key: "notify_on_changes_requested", value: input.notifyOnChangesRequested });
      if (input.notifyOnPublished !== undefined)
        updates.push({ key: "notify_on_published", value: input.notifyOnPublished });
      if (input.notifyOnComment !== undefined)
        updates.push({ key: "notify_on_comment", value: input.notifyOnComment });

      await Promise.all(
        updates.map(({ key, value }) =>
          ctx.db.systemConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        )
      );

      return { success: true };
    }),

  // ─── Send Test Email ────────────────────────────────────────────────────
  sendTest: adminProcedure
    .input(z.object({ toEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const sent = await sendEmailNotification({
        db: ctx.db,
        to: input.toEmail,
        subject: "✉️ Prueba de email — Isysocial",
        title: "Email de prueba",
        body: `¡Funciona! Este es un email de prueba enviado desde Isysocial.<br><br>Si recibes este mensaje, la configuración de Resend está correcta y los emails de notificación se están enviando correctamente a tus usuarios.`,
        actionUrl: process.env.NEXTAUTH_URL || "https://www.isysocial.com",
        actionLabel: "Ir a Isysocial",
      });

      if (!sent) {
        throw new Error(
          "No se pudo enviar el email. Verifica que el API Key de Resend esté configurado correctamente."
        );
      }

      return { success: true };
    }),
});
