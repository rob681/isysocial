import type { PrismaClient } from "@isysocial/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SendEmailParams {
  db: PrismaClient;
  to: string;
  subject: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

// ─── Config Helper ──────────────────────────────────────────────────────────

async function getConfig(
  db: PrismaClient,
  key: string,
  defaultValue: any = null
) {
  const config = await db.systemConfig.findUnique({ where: { key } });
  return config?.value ?? defaultValue;
}

// ─── Branded HTML Template ──────────────────────────────────────────────────

function buildEmailHtml({
  title,
  body,
  companyName,
  actionUrl,
  actionLabel,
}: {
  title: string;
  body: string;
  companyName: string;
  actionUrl?: string;
  actionLabel?: string;
}): string {
  const buttonHtml = actionUrl
    ? `
    <table cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
      <tr>
        <td style="border-radius:8px;overflow:hidden;">
          <a href="${actionUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#10b981,#2563eb);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">${actionLabel || "Ver en Isysocial"}</a>
        </td>
      </tr>
    </table>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header with gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#2563eb 100%);padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">${companyName}</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:12px;font-weight:500;">Gestión de Redes Sociales</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;font-weight:600;">${title}</h2>
              <div style="margin:0 0 8px;color:#52525b;font-size:15px;line-height:1.7;">${body}</div>
              ${buttonHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.5;">
                Este email fue enviado por ${companyName} a través de Isysocial.
                <br>Si no deseas recibir estas notificaciones, puedes desactivarlas en tu perfil.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ─── Send Email ─────────────────────────────────────────────────────────────

/**
 * Send a branded email via Resend.
 * Reads config from DB with env var fallback for API key.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendEmailNotification({
  db,
  to,
  subject,
  title,
  body,
  actionUrl,
  actionLabel,
}: SendEmailParams): Promise<boolean> {
  try {
    const emailEnabled = await getConfig(
      db,
      "notification_email_enabled",
      true
    );
    if (!emailEnabled) return false;

    const apiKey =
      (await getConfig(db, "resend_api_key", "")) ||
      process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[Email] No Resend API key configured");
      return false;
    }

    const fromAddress = await getConfig(
      db,
      "email_from_address",
      process.env.EMAIL_FROM_ADDRESS || "noreply@isysocial.com"
    );
    const fromName = await getConfig(db, "email_from_name", "Isysocial");
    const companyName = await getConfig(db, "company_name", "Isysocial");

    const html = buildEmailHtml({
      title,
      body,
      companyName,
      actionUrl,
      actionLabel,
    });

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error("[Email] Send failed:", result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}

// ─── Fire-and-Forget Helper ─────────────────────────────────────────────────

/**
 * Send email without blocking. Logs errors but never throws.
 * Use this in router mutations to avoid slowing down the response.
 */
export function sendEmailFireAndForget(params: SendEmailParams): void {
  sendEmailNotification(params).catch((err) => {
    console.error("[Email] Fire-and-forget error:", err);
  });
}
