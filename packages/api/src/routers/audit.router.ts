import { z } from "zod";
import { router, adminProcedure, getAgencyId } from "../trpc";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityType = "status_change" | "comment" | "publish" | "notification";

interface ActivityEntry {
  id: string;
  type: ActivityType;
  description: string;
  userName: string | null;
  userEmail: string | null;
  postTitle: string | null;
  postId: string | null;
  meta: Record<string, string | null>;
  createdAt: Date;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const auditRouter = router({
  list: adminProcedure
    .input(
      z.object({
        type: z
          .enum(["all", "status_change", "comment", "publish", "notification"])
          .default("all"),
        range: z.enum(["7d", "30d", "90d"]).default("30d"),
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { type, range, cursor, limit } = input;

      const now = new Date();
      const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
      const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const entries: ActivityEntry[] = [];

      // ── Status changes ────────────────────────────────────────────────
      if (type === "all" || type === "status_change") {
        const logs = await ctx.db.postStatusLog.findMany({
          where: {
            post: { agencyId },
            changedAt: { gte: since },
          },
          include: {
            changedBy: { select: { name: true, email: true } },
            post: { select: { id: true, title: true } },
          },
          orderBy: { changedAt: "desc" },
          take: 200,
        });

        for (const log of logs) {
          const from = log.fromStatus ?? "—";
          const to = log.toStatus;
          entries.push({
            id: `status-${log.id}`,
            type: "status_change",
            description: `Cambió estado de "${from}" a "${to}"`,
            userName: log.changedBy.name,
            userEmail: log.changedBy.email,
            postTitle: log.post.title,
            postId: log.post.id,
            meta: { fromStatus: log.fromStatus ?? null, toStatus: log.toStatus, note: log.note ?? null },
            createdAt: log.changedAt,
          });
        }
      }

      // ── Comments ──────────────────────────────────────────────────────
      if (type === "all" || type === "comment") {
        const comments = await ctx.db.postComment.findMany({
          where: {
            post: { agencyId },
            createdAt: { gte: since },
          },
          include: {
            author: { select: { name: true, email: true } },
            post: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

        for (const c of comments) {
          entries.push({
            id: `comment-${c.id}`,
            type: "comment",
            description: c.isInternal
              ? "Comentario interno"
              : "Nuevo comentario",
            userName: c.author.name,
            userEmail: c.author.email,
            postTitle: c.post.title,
            postId: c.post.id,
            meta: {
              preview: c.content.length > 80 ? c.content.slice(0, 80) + "…" : c.content,
              isInternal: c.isInternal ? "true" : "false",
            },
            createdAt: c.createdAt,
          });
        }
      }

      // ── Publish attempts ──────────────────────────────────────────────
      if (type === "all" || type === "publish") {
        const publishes = await ctx.db.postPublishLog.findMany({
          where: {
            post: { agencyId },
            attemptedAt: { gte: since },
          },
          include: {
            requestedBy: { select: { name: true, email: true } },
            post: { select: { id: true, title: true } },
          },
          orderBy: { attemptedAt: "desc" },
          take: 200,
        });

        for (const p of publishes) {
          const statusLabel =
            p.status === "SUCCESS"
              ? "exitosa"
              : p.status === "FAILED"
                ? "fallida"
                : "pendiente";
          entries.push({
            id: `publish-${p.id}`,
            type: "publish",
            description: `Publicación ${statusLabel} en ${p.network}`,
            userName: p.requestedBy.name,
            userEmail: p.requestedBy.email,
            postTitle: p.post.title,
            postId: p.post.id,
            meta: {
              network: p.network,
              status: p.status,
              error: p.errorMessage ?? null,
              platformUrl: p.platformUrl ?? null,
            },
            createdAt: p.attemptedAt,
          });
        }
      }

      // ── Notifications ─────────────────────────────────────────────────
      if (type === "all" || type === "notification") {
        const notifications = await ctx.db.notification.findMany({
          where: {
            user: { agencyId },
            createdAt: { gte: since },
          },
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

        for (const n of notifications) {
          entries.push({
            id: `notif-${n.id}`,
            type: "notification",
            description: n.title,
            userName: n.user.name,
            userEmail: n.user.email,
            postTitle: null,
            postId: n.relatedId ?? null,
            meta: { body: n.body, notificationType: n.type },
            createdAt: n.createdAt,
          });
        }
      }

      // ── Sort & paginate ───────────────────────────────────────────────
      entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      let startIndex = 0;
      if (cursor) {
        const idx = entries.findIndex((e) => e.id === cursor);
        if (idx !== -1) startIndex = idx + 1;
      }

      const page = entries.slice(startIndex, startIndex + limit + 1);
      const hasMore = page.length > limit;
      const items = hasMore ? page.slice(0, limit) : page;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return {
        items,
        nextCursor,
        totalInRange: entries.length,
      };
    }),
});
