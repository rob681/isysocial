import type { PrismaClient } from "@isysocial/db";
import { sendEmailFireAndForget } from "./email";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Invitation Email ───────────────────────────────────────────────────────

/**
 * Send when a team member or client is invited to join the platform.
 */
export function sendInvitationEmail(
  db: PrismaClient,
  to: string,
  inviterName: string,
  role: string,
  inviteUrl: string
): void {
  const roleName =
    role === "CLIENT"
      ? "cliente"
      : role === "EDITOR"
        ? "editor"
        : "miembro del equipo";

  sendEmailFireAndForget({
    db,
    to,
    subject: `${inviterName} te invitó a Isysocial`,
    title: "Has sido invitado a Isysocial",
    body: `
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.7;">
        <strong>${escapeHtml(inviterName)}</strong> te ha invitado a unirte como <strong>${roleName}</strong> en Isysocial, la plataforma de gestión de redes sociales.
      </p>
      <p style="margin:0;color:#52525b;font-size:15px;line-height:1.7;">
        Haz clic en el botón de abajo para aceptar la invitación y configurar tu cuenta.
      </p>
    `,
    actionUrl: inviteUrl,
    actionLabel: "Aceptar invitación",
  });
}

// ─── Post Approval Request ──────────────────────────────────────────────────

/**
 * Send when a post is moved to review and needs client approval.
 */
export function sendPostApprovalRequest(
  db: PrismaClient,
  to: string,
  clientName: string,
  postTitle: string,
  approvalUrl: string
): void {
  sendEmailFireAndForget({
    db,
    to,
    subject: `Contenido listo para revisar: "${postTitle}"`,
    title: "Tienes contenido esperando tu revisión",
    body: `
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.7;">
        Hola <strong>${escapeHtml(clientName)}</strong>,
      </p>
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.7;">
        El post <strong>"${escapeHtml(postTitle)}"</strong> está listo para que lo revises. Puedes aprobarlo o solicitar cambios directamente desde tu portal.
      </p>
      <p style="margin:0;color:#71717a;font-size:13px;line-height:1.6;">
        Si no necesitas hacer cambios, simplemente apruébalo para que pueda ser programado y publicado.
      </p>
    `,
    actionUrl: approvalUrl,
    actionLabel: "Revisar contenido",
  });
}

// ─── Post Approved Notification ─────────────────────────────────────────────

/**
 * Send to the editor/admin when a client approves a post.
 */
export function sendPostApprovedNotification(
  db: PrismaClient,
  to: string,
  postTitle: string,
  clientName: string
): void {
  sendEmailFireAndForget({
    db,
    to,
    subject: `Contenido aprobado: "${postTitle}"`,
    title: "Contenido aprobado por el cliente",
    body: `
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.7;">
        <strong>${escapeHtml(clientName)}</strong> aprobó el post <strong>"${escapeHtml(postTitle)}"</strong>.
      </p>
      <p style="margin:0;color:#52525b;font-size:15px;line-height:1.7;">
        El contenido está listo para ser programado y publicado. 🎉
      </p>
    `,
    actionUrl: `${getBaseUrl()}/admin/contenido`,
    actionLabel: "Ver contenido",
  });
}

// ─── Post Changes Requested ─────────────────────────────────────────────────

/**
 * Send to the editor/admin when a client requests changes on a post.
 */
export function sendPostChangesRequested(
  db: PrismaClient,
  to: string,
  postTitle: string,
  clientName: string,
  feedback: string
): void {
  const feedbackHtml = feedback
    ? `
      <div style="margin:16px 0;padding:16px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;color:#92400e;font-size:12px;font-weight:600;text-transform:uppercase;">Comentarios del cliente:</p>
        <p style="margin:0;color:#78350f;font-size:14px;line-height:1.6;">${escapeHtml(feedback)}</p>
      </div>`
    : "";

  sendEmailFireAndForget({
    db,
    to,
    subject: `Cambios solicitados: "${postTitle}"`,
    title: "El cliente solicitó cambios",
    body: `
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.7;">
        <strong>${escapeHtml(clientName)}</strong> revisó el post <strong>"${escapeHtml(postTitle)}"</strong> y solicitó modificaciones.
      </p>
      ${feedbackHtml}
      <p style="margin:16px 0 0;color:#52525b;font-size:15px;line-height:1.7;">
        Revisa los comentarios y realiza los ajustes necesarios.
      </p>
    `,
    actionUrl: `${getBaseUrl()}/admin/contenido`,
    actionLabel: "Ver cambios solicitados",
  });
}

// ─── Weekly Summary ─────────────────────────────────────────────────────────

export interface WeeklySummaryStats {
  postsPublished: number;
  postsPending: number;
  postsInReview: number;
  postsScheduled: number;
  totalComments: number;
  clientsActive: number;
}

/**
 * Send a weekly digest with publishing stats.
 */
export function sendWeeklySummary(
  db: PrismaClient,
  to: string,
  agencyName: string,
  stats: WeeklySummaryStats
): void {
  const statRow = (label: string, value: number, color: string) =>
    `<tr>
      <td style="padding:10px 16px;color:#52525b;font-size:14px;border-bottom:1px solid #f3f4f6;">${label}</td>
      <td style="padding:10px 16px;text-align:right;font-weight:700;font-size:16px;color:${color};border-bottom:1px solid #f3f4f6;">${value}</td>
    </tr>`;

  const statsTable = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background-color:#f9fafb;">
        <td style="padding:10px 16px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Métrica</td>
        <td style="padding:10px 16px;text-align:right;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;border-bottom:1px solid #e5e7eb;">Cantidad</td>
      </tr>
      ${statRow("Posts publicados", stats.postsPublished, "#10b981")}
      ${statRow("Posts programados", stats.postsScheduled, "#2563eb")}
      ${statRow("En revisión", stats.postsInReview, "#f59e0b")}
      ${statRow("Pendientes", stats.postsPending, "#6b7280")}
      ${statRow("Comentarios recibidos", stats.totalComments, "#8b5cf6")}
      ${statRow("Clientes activos", stats.clientsActive, "#10b981")}
    </table>
  `;

  sendEmailFireAndForget({
    db,
    to,
    subject: `Resumen semanal — ${agencyName}`,
    title: `Resumen semanal de ${escapeHtml(agencyName)}`,
    body: `
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.7;">
        Aquí tienes un resumen de la actividad de tu agencia en los últimos 7 días:
      </p>
      ${statsTable}
      <p style="margin:16px 0 0;color:#71717a;font-size:13px;line-height:1.6;">
        Accede a tu panel para ver más detalles y gestionar tu contenido.
      </p>
    `,
    actionUrl: `${getBaseUrl()}/admin/dashboard`,
    actionLabel: "Ver dashboard",
  });
}
