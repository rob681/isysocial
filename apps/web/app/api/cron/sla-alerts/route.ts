import { NextResponse } from "next/server";
import { db } from "@isysocial/db";
import { sendEmailNotification } from "@isysocial/api/src/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Posts stuck in IN_REVIEW past 48h deadline
  const overdueReview = await db.post.findMany({
    where: {
      status: "IN_REVIEW",
      reviewDeadline: { lt: now },
    },
    select: { id: true, title: true, clientId: true, agencyId: true },
  });

  // Posts stuck in CLIENT_CHANGES for > 72h
  const stuckChanges = await db.post.findMany({
    where: {
      status: "CLIENT_CHANGES",
      updatedAt: { lt: new Date(now.getTime() - 72 * 60 * 60 * 1000) },
    },
    select: { id: true, title: true, clientId: true, agencyId: true },
  });

  const allOverdue = [...overdueReview, ...stuckChanges];

  let emailsSent = 0;
  let notificationsCreated = 0;

  if (allOverdue.length > 0) {
    // Group posts by agencyId to avoid redundant DB lookups
    const agencyMap = new Map<
      string,
      { post: (typeof allOverdue)[number]; type: "overdue_review" | "stuck_changes" }[]
    >();

    for (const post of overdueReview) {
      const list = agencyMap.get(post.agencyId) ?? [];
      list.push({ post, type: "overdue_review" });
      agencyMap.set(post.agencyId, list);
    }
    for (const post of stuckChanges) {
      const list = agencyMap.get(post.agencyId) ?? [];
      list.push({ post, type: "stuck_changes" });
      agencyMap.set(post.agencyId, list);
    }

    for (const [agencyId, entries] of agencyMap) {
      // Get admin users for this agency
      const adminUsers = await db.user.findMany({
        where: { agencyId, role: "ADMIN", isActive: true },
        select: { id: true, email: true, name: true },
      });

      for (const { post, type } of entries) {
        const postLabel = post.title ?? post.id;
        const subject =
          type === "overdue_review"
            ? `⚠️ Post en revisión sin respuesta — ${postLabel}`
            : `⚠️ Post con cambios pendientes — ${postLabel}`;

        const body =
          type === "overdue_review"
            ? `El post <strong>${postLabel}</strong> lleva más de 48 horas esperando respuesta del cliente en revisión.<br><br>Por favor revisa el estado de la publicación y toma acción.`
            : `El post <strong>${postLabel}</strong> tiene cambios solicitados hace más de 72 horas sin respuesta del editor.<br><br>Por favor revisa el estado de la publicación y toma acción.`;

        const baseUrl = process.env.NEXTAUTH_URL ?? "https://app.isysocial.com";
        const actionUrl = `${baseUrl}/admin/contenido/${post.id}`;

        // Send email to each admin
        for (const admin of adminUsers) {
          const sent = await sendEmailNotification({
            db,
            to: admin.email,
            subject,
            title: "Alerta SLA — Publicación requiere atención",
            body,
            actionUrl,
            actionLabel: "Ver publicación",
          });
          if (sent) emailsSent++;
        }

        // Create in-app notification for each admin
        for (const admin of adminUsers) {
          await db.notification.create({
            data: {
              userId: admin.id,
              type: "POST_SUBMITTED_FOR_REVIEW",
              title: "Alerta SLA",
              body:
                type === "overdue_review"
                  ? `Post "${postLabel}" lleva +48h en revisión sin respuesta del cliente.`
                  : `Post "${postLabel}" tiene cambios pendientes hace +72h.`,
              relatedId: post.id,
              relatedType: "post",
            },
          });
          notificationsCreated++;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    overdueReview: overdueReview.length,
    stuckChanges: stuckChanges.length,
    emailsSent,
    notificationsCreated,
    posts: {
      overdueReview: overdueReview.map((p) => ({ id: p.id, title: p.title })),
      stuckChanges: stuckChanges.map((p) => ({ id: p.id, title: p.title })),
    },
  });
}
