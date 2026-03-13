import type { PrismaClient } from "@isysocial/db";

interface SendEmailParams {
  db: PrismaClient;
  to: string;
  subject: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

async function getConfig(db: PrismaClient, key: string, defaultValue: any = null) {
  const config = await db.systemConfig.findUnique({ where: { key } });
  return config?.value ?? defaultValue;
}

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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#2563eb;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${companyName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;font-weight:600;">${title}</h2>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">${body}</p>
              ${
                actionUrl
                  ? `
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#2563eb;border-radius:8px;">
                    <a href="${actionUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${actionLabel || "Ver en Isysocial"}</a>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">
                Este email fue enviado por ${companyName} a través de Isysocial.
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
    const emailEnabled = await getConfig(db, "notification_email_enabled", true);
    if (!emailEnabled) return false;

    const apiKey = await getConfig(db, "resend_api_key", "");
    if (!apiKey) {
      // Fallback to env var
      const envKey = process.env.RESEND_API_KEY;
      if (!envKey) return false;
    }

    const fromAddress = await getConfig(
      db,
      "email_from_address",
      "noreply@isysocial.com"
    );
    const fromName = await getConfig(db, "email_from_name", "Isysocial");
    const companyName = await getConfig(db, "company_name", "Isysocial");

    const html = buildEmailHtml({ title, body, companyName, actionUrl, actionLabel });

    const { Resend } = await import("resend");
    const resend = new Resend(
      (await getConfig(db, "resend_api_key", "")) || process.env.RESEND_API_KEY
    );

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
