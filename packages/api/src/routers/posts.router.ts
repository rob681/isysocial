import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAgencyId,
  adminOrPermissionProcedure,
} from "../trpc";
import {
  createPostSchema,
  updatePostContentSchema,
  updatePostStatusSchema,
  addPostCommentSchema,
} from "@isysocial/shared";
import { canTransition } from "@isysocial/shared";
import type { Role, PostStatus } from "@isysocial/shared";
import { sendEmailNotification } from "../lib/email";

export const postsRouter = router({
  // ─── Create Post ─────────────────────────────────────────────────────────
  create: adminOrPermissionProcedure("CREATE_POSTS")
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client belongs to agency
      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId, isActive: true },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      const post = await ctx.db.post.create({
        data: {
          agencyId,
          clientId: input.clientId,
          editorId: ctx.session.user.id,
          network: input.network,
          postType: input.postType,
          title: input.title,
          copy: input.copy,
          hashtags: input.hashtags,
          scheduledAt: input.scheduledAt,
          revisionsLimit: input.revisionsLimit,
          referenceLink: input.referenceLink || null,
          categoryId: input.categoryId || null,
          status: "DRAFT",
        },
      });

      // Log status creation
      await ctx.db.postStatusLog.create({
        data: {
          postId: post.id,
          toStatus: "DRAFT",
          changedById: ctx.session.user.id,
          note: "Post creado",
        },
      });

      return post;
    }),

  // ─── Get Single Post ─────────────────────────────────────────────────────
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const agencyId = getAgencyId(ctx);

      const post = await ctx.db.post.findFirst({
        where: { id: input.id, agencyId },
        include: {
          client: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              socialNetworks: { where: { isActive: true } },
            },
          },
          category: true,
          media: { orderBy: { sortOrder: "asc" } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, avatarUrl: true, role: true } },
            },
          },
          statusLogs: {
            orderBy: { changedAt: "desc" },
            include: {
              changedBy: { select: { id: true, name: true, role: true } },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Publicación no encontrada" });
      }

      // Clients can only see non-internal comments
      if (user.role === "CLIENTE") {
        post.comments = post.comments.filter((c) => !c.isInternal);
      }

      return post;
    }),

  // ─── List Posts ──────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]).optional(),
        status: z.union([
          z.enum([
            "DRAFT", "IN_REVIEW", "CLIENT_CHANGES", "APPROVED",
            "SCHEDULED", "PUBLISHED", "PAUSED", "CANCELLED",
          ]),
          z.array(z.enum([
            "DRAFT", "IN_REVIEW", "CLIENT_CHANGES", "APPROVED",
            "SCHEDULED", "PUBLISHED", "PAUSED", "CANCELLED",
          ])),
        ]).optional(),
        categoryId: z.string().optional(),
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;
      const skip = (input.page - 1) * input.limit;

      // Build where clause
      const where: any = { agencyId };

      // Client can only see their own posts
      if (user.role === "CLIENTE" && user.clientProfileId) {
        where.clientId = user.clientProfileId;
      }

      // Editor: only assigned clients (unless MANAGE_ALL_CLIENTS permission)
      if (user.role === "EDITOR") {
        const perms = (user.permissions ?? []) as string[];
        if (!perms.includes("MANAGE_ALL_CLIENTS")) {
          const assignments = await ctx.db.editorClientAssignment.findMany({
            where: { editor: { userId: user.id } },
            select: { clientId: true },
          });
          where.clientId = { in: assignments.map((a) => a.clientId) };
        }
      }

      // Filters
      if (input.clientId) where.clientId = input.clientId;
      if (input.network) where.network = input.network;
      if (input.status) {
        where.status = Array.isArray(input.status) ? { in: input.status } : input.status;
      }
      if (input.categoryId) where.categoryId = input.categoryId;

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { copy: { contains: input.search, mode: "insensitive" } },
        ];
      }

      // Month filter
      if (input.month && input.year) {
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);
        where.OR = [
          { scheduledAt: { gte: startDate, lte: endDate } },
          ...(where.OR || []),
        ];
      }

      const [posts, total] = await Promise.all([
        ctx.db.post.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
          include: {
            client: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
            category: true,
            media: { take: 1, orderBy: { sortOrder: "asc" } },
            _count: { select: { comments: true } },
          },
        }),
        ctx.db.post.count({ where }),
      ]);

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
        page: input.page,
      };
    }),

  // ─── Update Content ──────────────────────────────────────────────────────
  updateContent: adminOrPermissionProcedure("EDIT_POSTS")
    .input(updatePostContentSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const post = await ctx.db.post.findFirst({
        where: { id: input.id, agencyId },
      });
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Publicación no encontrada" });
      }

      // Only allow edits on DRAFT and CLIENT_CHANGES
      if (!["DRAFT", "CLIENT_CHANGES"].includes(post.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo puedes editar publicaciones en borrador o con cambios solicitados.",
        });
      }

      // Save a revision snapshot of the CURRENT content before updating
      const hasContentChanges =
        (input.title !== undefined && input.title !== post.title) ||
        (input.copy !== undefined && input.copy !== post.copy) ||
        (input.hashtags !== undefined && input.hashtags !== post.hashtags);

      if (hasContentChanges) {
        // Get current version number
        const lastRevision = await ctx.db.postRevision.findFirst({
          where: { postId: post.id },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        const nextVersion = (lastRevision?.version ?? 0) + 1;

        await ctx.db.postRevision.create({
          data: {
            postId: post.id,
            version: nextVersion,
            title: post.title,
            copy: post.copy,
            hashtags: post.hashtags,
            changedById: ctx.session.user.id,
          },
        });
      }

      return ctx.db.post.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.copy !== undefined && { copy: input.copy }),
          ...(input.hashtags !== undefined && { hashtags: input.hashtags }),
          ...(input.referenceLink !== undefined && {
            referenceLink: input.referenceLink || null,
          }),
          ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId || null }),
        },
      });
    }),

  // ─── Update Status ───────────────────────────────────────────────────────
  updateStatus: protectedProcedure
    .input(updatePostStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const post = await ctx.db.post.findFirst({
        where: { id: input.id, agencyId },
        include: {
          client: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Publicación no encontrada" });
      }

      const fromStatus = post.status as PostStatus;
      const toStatus = input.toStatus as PostStatus;

      // Validate transition
      if (!canTransition(fromStatus, toStatus, user.role as Role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `No puedes cambiar de "${fromStatus}" a "${toStatus}" con tu rol.`,
        });
      }

      // Handle revision limit
      if (fromStatus === "IN_REVIEW" && toStatus === "CLIENT_CHANGES") {
        if (post.revisionsUsed >= post.revisionsLimit) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Se alcanzó el límite de ${post.revisionsLimit} revisiones.`,
          });
        }
      }

      const updateData: any = { status: toStatus };

      // Increment revisions counter on CLIENT_CHANGES
      if (toStatus === "CLIENT_CHANGES") {
        updateData.revisionsUsed = { increment: 1 };
      }

      // Set publishedAt
      if (toStatus === "PUBLISHED") {
        updateData.publishedAt = new Date();
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        const updatedPost = await tx.post.update({
          where: { id: input.id },
          data: updateData,
        });

        // Log status change
        await tx.postStatusLog.create({
          data: {
            postId: post.id,
            fromStatus: fromStatus,
            toStatus: toStatus,
            changedById: user.id,
            note: input.note,
          },
        });

        // Create notifications based on transition
        const notifications: {
          userId: string;
          type: "POST_SUBMITTED_FOR_REVIEW" | "POST_APPROVED" | "POST_CHANGES_REQUESTED" | "POST_REVISION_LIMIT_REACHED" | "NEW_POST_COMMENT" | "NEW_IDEA_COMMENT" | "POST_SCHEDULED" | "IDEA_CONVERTED_TO_POST";
          title: string;
          body: string;
        }[] = [];

        if (toStatus === "IN_REVIEW") {
          // Notify client that content is ready for review
          notifications.push({
            userId: post.client.user.id,
            type: "POST_SUBMITTED_FOR_REVIEW",
            title: "Contenido listo para revisar",
            body: `"${post.title || "Sin título"}" está listo para tu revisión.`,
          });
        }

        if (toStatus === "APPROVED") {
          // Notify editor/admin that content was approved
          if (post.editorId) {
            notifications.push({
              userId: post.editorId,
              type: "POST_APPROVED",
              title: "¡Contenido aprobado!",
              body: `"${post.title || "Sin título"}" fue aprobado por ${post.client.user.name}.`,
            });
          }
        }

        if (toStatus === "CLIENT_CHANGES") {
          // Notify editor that changes were requested
          if (post.editorId) {
            notifications.push({
              userId: post.editorId,
              type: "POST_CHANGES_REQUESTED",
              title: "Se solicitaron cambios",
              body: `${post.client.user.name} solicitó cambios en "${post.title || "Sin título"}". Revisión ${updatedPost.revisionsUsed}/${post.revisionsLimit}.`,
            });
          }

          // Check revision limit
          if (updatedPost.revisionsUsed >= post.revisionsLimit) {
            if (post.editorId) {
              notifications.push({
                userId: post.editorId,
                type: "POST_REVISION_LIMIT_REACHED",
                title: "Límite de revisiones alcanzado",
                body: `"${post.title || "Sin título"}" alcanzó el límite de ${post.revisionsLimit} revisiones.`,
              });
            }
          }
        }

        if (notifications.length > 0) {
          await tx.notification.createMany({
            data: notifications.map((n) => ({
              ...n,
              relatedId: post.id,
              relatedType: "post",
            })),
          });
        }

        return updatedPost;
      });

      // ── Email notifications (fire-and-forget, never block) ──────────────
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
      const postTitle = post.title || "Sin título";

      if (toStatus === "IN_REVIEW") {
        // Notify client: content is ready for review
        const clientEmail = post.client.user.email;
        if (clientEmail) {
          sendEmailNotification({
            db: ctx.db,
            to: clientEmail,
            subject: `Contenido listo para revisar: "${postTitle}"`,
            title: "Tienes contenido esperando tu revisión",
            body: `El post <strong>"${postTitle}"</strong> está listo para que lo revises y apruebes.<br><br>Ingresa a tu portal para verlo y dejar tus comentarios.`,
            actionUrl: `${baseUrl}/cliente/posts/${post.id}`,
            actionLabel: "Revisar contenido",
          }).catch(() => {});
        }
      }

      if (toStatus === "APPROVED" && post.editorId) {
        // Notify editor/creator: post was approved
        const editor = await ctx.db.user.findUnique({
          where: { id: post.editorId },
          select: { email: true, name: true },
        });
        if (editor?.email) {
          sendEmailNotification({
            db: ctx.db,
            to: editor.email,
            subject: `¡Tu post fue aprobado! "${postTitle}"`,
            title: "¡Contenido aprobado!",
            body: `${post.client.user.name} aprobó el post <strong>"${postTitle}"</strong>. ¡Excelente trabajo!`,
            actionUrl: `${baseUrl}/editor/posts/${post.id}`,
            actionLabel: "Ver post",
          }).catch(() => {});
        }
      }

      if (toStatus === "CLIENT_CHANGES" && post.editorId) {
        // Notify editor: client requested changes
        const editor = await ctx.db.user.findUnique({
          where: { id: post.editorId },
          select: { email: true, name: true },
        });
        if (editor?.email) {
          const noteText = input.note ? `<br><br><em>Nota: "${input.note}"</em>` : "";
          sendEmailNotification({
            db: ctx.db,
            to: editor.email,
            subject: `Se solicitaron cambios en "${postTitle}"`,
            title: "Tu cliente solicita cambios",
            body: `${post.client.user.name} solicitó cambios en <strong>"${postTitle}"</strong>.${noteText}`,
            actionUrl: `${baseUrl}/editor/posts/${post.id}`,
            actionLabel: "Ver cambios solicitados",
          }).catch(() => {});
        }
      }

      return updated;
    }),

  // ─── Add Comment ─────────────────────────────────────────────────────────
  addComment: protectedProcedure
    .input(addPostCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const post = await ctx.db.post.findFirst({
        where: { id: input.postId, agencyId },
        include: {
          client: { include: { user: { select: { id: true, email: true, name: true } } } },
        },
      });
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Publicación no encontrada" });
      }

      // Clients can't make internal comments
      const isInternal = user.role === "CLIENTE" ? false : input.isInternal;

      const comment = await ctx.db.postComment.create({
        data: {
          postId: input.postId,
          authorId: user.id,
          content: input.content,
          isInternal,
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      });

      // Notify relevant users about new comment
      const notifyUserIds = new Set<string>();

      // If agency member comments → notify client (unless internal)
      if (!isInternal && user.role !== "CLIENTE") {
        notifyUserIds.add(post.client.user.id);
      }

      // If client comments → notify editor
      if (user.role === "CLIENTE" && post.editorId) {
        notifyUserIds.add(post.editorId);
      }

      // Don't notify the author
      notifyUserIds.delete(user.id);

      if (notifyUserIds.size > 0) {
        await ctx.db.notification.createMany({
          data: Array.from(notifyUserIds).map((userId) => ({
            userId,
            type: "NEW_POST_COMMENT" as const,
            title: "Nuevo comentario",
            body: `${user.name} comentó en "${post.title || "Sin título"}"`,
            relatedId: post.id,
            relatedType: "post",
          })),
        });
      }

      // ── Email notifications for comments (fire-and-forget) ──────────────
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
      const postTitle = post.title || "Sin título";
      const commentPreview = input.content.slice(0, 150);

      if (!isInternal && user.role !== "CLIENTE") {
        // Agency member commented → email client
        const clientEmail = post.client.user.email;
        if (clientEmail && clientEmail !== user.email) {
          sendEmailNotification({
            db: ctx.db,
            to: clientEmail,
            subject: `Nuevo comentario en "${postTitle}"`,
            title: "Tienes un nuevo comentario",
            body: `<strong>${user.name}</strong> comentó en <strong>"${postTitle}"</strong>:<br><br><em>"${commentPreview}"</em>`,
            actionUrl: `${baseUrl}/cliente/posts/${post.id}`,
            actionLabel: "Ver comentario",
          }).catch(() => {});
        }
      }

      if (user.role === "CLIENTE" && post.editorId) {
        // Client commented → email editor
        const editor = await ctx.db.user.findUnique({
          where: { id: post.editorId },
          select: { email: true },
        });
        if (editor?.email && editor.email !== user.email) {
          sendEmailNotification({
            db: ctx.db,
            to: editor.email,
            subject: `${post.client.user.name} comentó en "${postTitle}"`,
            title: "Tu cliente dejó un comentario",
            body: `<strong>${post.client.user.name}</strong> comentó en <strong>"${postTitle}"</strong>:<br><br><em>"${commentPreview}"</em>`,
            actionUrl: `${baseUrl}/editor/posts/${post.id}`,
            actionLabel: "Ver comentario",
          }).catch(() => {});
        }
      }

      return comment;
    }),

  // ─── Resolve Comment ─────────────────────────────────────────────────────
  resolveComment: adminOrPermissionProcedure("EDIT_POSTS")
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.postComment.update({
        where: { id: input.commentId },
        data: { isResolved: true },
      });
    }),

  // ─── Delete Comment ──────────────────────────────────────────────────────
  deleteComment: adminOrPermissionProcedure("EDIT_POSTS")
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.postComment.delete({ where: { id: input.commentId } });
      return { success: true };
    }),

  // ─── Upload Media ────────────────────────────────────────────────────────
  addMedia: adminOrPermissionProcedure("CREATE_POSTS")
    .input(
      z.object({
        postId: z.string(),
        files: z.array(
          z.object({
            fileName: z.string(),
            fileUrl: z.string(),
            storagePath: z.string(),
            mimeType: z.string(),
            fileSize: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const post = await ctx.db.post.findFirst({
        where: { id: input.postId, agencyId },
        include: { _count: { select: { media: true } } },
      });
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Publicación no encontrada" });
      }

      const startOrder = post._count.media;

      const media = await ctx.db.$transaction(
        input.files.map((file, i) =>
          ctx.db.postMedia.create({
            data: {
              postId: input.postId,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              storagePath: file.storagePath,
              mimeType: file.mimeType,
              fileSize: file.fileSize,
              sortOrder: startOrder + i,
            },
          })
        )
      );

      return media;
    }),

  // ─── Delete Media ────────────────────────────────────────────────────────
  deleteMedia: adminOrPermissionProcedure("EDIT_POSTS")
    .input(z.object({ mediaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.postMedia.findUnique({
        where: { id: input.mediaId },
      });
      if (!media) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Media no encontrada" });
      }

      await ctx.db.postMedia.delete({ where: { id: input.mediaId } });

      // Also try to delete from storage
      try {
        const { deleteFile } = await import("../lib/supabase-storage");
        await deleteFile(media.storagePath);
      } catch {
        // Non-critical
      }

      return { success: true };
    }),

  // ─── Reorder Media ───────────────────────────────────────────────────────
  reorderMedia: adminOrPermissionProcedure("EDIT_POSTS")
    .input(
      z.object({
        postId: z.string(),
        orderedIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.db.postMedia.update({
            where: { id },
            data: { sortOrder: index },
          })
        )
      );
      return { success: true };
    }),

  // ─── Delete Post ─────────────────────────────────────────────────────────
  delete: adminOrPermissionProcedure("DELETE_POSTS")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const post = await ctx.db.post.findFirst({
        where: { id: input.id, agencyId },
        include: { media: true },
      });
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Publicación no encontrada" });
      }

      // Delete media from storage
      try {
        const { deleteFile } = await import("../lib/supabase-storage");
        for (const m of post.media) {
          await deleteFile(m.storagePath);
        }
      } catch {
        // Non-critical
      }

      await ctx.db.post.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // ─── Archive (published & cancelled) ─────────────────────────────────────
  archive: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]).optional(),
        categoryId: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(), // ISO date string
        dateTo: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;
      const skip = (input.page - 1) * input.limit;

      const where: any = {
        agencyId,
        status: { in: ["PUBLISHED", "CANCELLED"] },
      };

      // Client only sees own posts
      if (user.role === "CLIENTE" && user.clientProfileId) {
        where.clientId = user.clientProfileId;
      }

      // Editor: only assigned clients
      if (user.role === "EDITOR") {
        const perms = (user.permissions ?? []) as string[];
        if (!perms.includes("MANAGE_ALL_CLIENTS")) {
          const assignments = await ctx.db.editorClientAssignment.findMany({
            where: { editor: { userId: user.id } },
            select: { clientId: true },
          });
          where.clientId = { in: assignments.map((a) => a.clientId) };
        }
      }

      if (input.clientId) where.clientId = input.clientId;
      if (input.network) where.network = input.network;
      if (input.categoryId) where.categoryId = input.categoryId;

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { copy: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input.dateFrom || input.dateTo) {
        where.publishedAt = {};
        if (input.dateFrom) where.publishedAt.gte = new Date(input.dateFrom);
        if (input.dateTo) where.publishedAt.lte = new Date(input.dateTo + "T23:59:59.999Z");
      }

      const [posts, total] = await Promise.all([
        ctx.db.post.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          include: {
            client: {
              include: { user: { select: { name: true, avatarUrl: true } } },
            },
            category: true,
            media: { take: 1, orderBy: { sortOrder: "asc" } },
            _count: { select: { comments: true } },
          },
        }),
        ctx.db.post.count({ where }),
      ]);

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
        page: input.page,
      };
    }),

  // ─── Get Clients for Post Creation ───────────────────────────────────────
  getClientsForSelect: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    const user = ctx.session.user;

    let where: any = { agencyId, isActive: true };

    // Editor sees only assigned clients
    if (user.role === "EDITOR") {
      const perms = (user.permissions ?? []) as string[];
      if (!perms.includes("MANAGE_ALL_CLIENTS")) {
        const assignments = await ctx.db.editorClientAssignment.findMany({
          where: { editor: { userId: user.id } },
          select: { clientId: true },
        });
        where.id = { in: assignments.map((a) => a.clientId) };
      }
    }

    const clients = await ctx.db.clientProfile.findMany({
      where,
      orderBy: { companyName: "asc" },
      include: {
        user: { select: { name: true } },
        socialNetworks: { where: { isActive: true }, select: { network: true } },
      },
    });

    return clients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactName: c.user.name,
      networks: c.socialNetworks.map((sn) => sn.network),
    }));
  }),

  // ─── Mirror Posts ─────────────────────────────────────────────────────────
  createMirror: adminOrPermissionProcedure("CREATE_POSTS")
    .input(
      z.object({
        sourcePostId: z.string(),
        networks: z.array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"])),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const source = await ctx.db.post.findFirst({
        where: { id: input.sourcePostId, agencyId },
      });
      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post fuente no encontrado" });
      }

      // Generate a mirror group ID if the source doesn't have one
      const mirrorGroupId = source.mirrorGroupId || source.id;

      // Update the source post if it doesn't have a mirrorGroupId yet
      if (!source.mirrorGroupId) {
        await ctx.db.post.update({
          where: { id: source.id },
          data: { mirrorGroupId },
        });
      }

      // Create mirror posts for each network (skip if source network is in the list)
      const newPosts = [];
      for (const network of input.networks) {
        if (network === source.network) continue; // Don't mirror to same network

        // Check if mirror already exists for this network
        const existing = await ctx.db.post.findFirst({
          where: { mirrorGroupId, network },
        });
        if (existing) continue;

        const post = await ctx.db.post.create({
          data: {
            agencyId,
            clientId: source.clientId,
            editorId: ctx.session.user.id,
            network,
            postType: source.postType,
            title: source.title,
            copy: source.copy,
            hashtags: source.hashtags,
            scheduledAt: source.scheduledAt,
            revisionsLimit: source.revisionsLimit,
            referenceLink: source.referenceLink,
            categoryId: source.categoryId,
            mirrorGroupId,
            status: "DRAFT",
          },
        });

        await ctx.db.postStatusLog.create({
          data: {
            postId: post.id,
            toStatus: "DRAFT",
            changedById: ctx.session.user.id,
            note: `Mirror de ${source.network}`,
          },
        });

        newPosts.push(post);
      }

      return { mirrorGroupId, created: newPosts.length };
    }),

  getMirrorGroup: protectedProcedure
    .input(z.object({ mirrorGroupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      return ctx.db.post.findMany({
        where: { mirrorGroupId: input.mirrorGroupId, agencyId },
        orderBy: { createdAt: "asc" },
        include: {
          media: { take: 1, orderBy: { sortOrder: "asc" } },
          category: true,
        },
      });
    }),

  syncMirrorCopy: adminOrPermissionProcedure("EDIT_POSTS")
    .input(
      z.object({
        sourcePostId: z.string(),
        mirrorGroupId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const source = await ctx.db.post.findFirst({
        where: { id: input.sourcePostId, agencyId },
      });
      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post fuente no encontrado" });
      }

      // Update all siblings with the source's copy/hashtags
      const result = await ctx.db.post.updateMany({
        where: {
          mirrorGroupId: input.mirrorGroupId,
          agencyId,
          id: { not: source.id },
          status: { in: ["DRAFT", "CLIENT_CHANGES"] }, // Only sync editable posts
        },
        data: {
          copy: source.copy,
          hashtags: source.hashtags,
          title: source.title,
        },
      });

      return { synced: result.count };
    }),

  // ─── Bulk Actions ──────────────────────────────────────────────────────────

  bulkUpdateStatus: adminOrPermissionProcedure("EDIT_POSTS")
    .input(
      z.object({
        postIds: z.array(z.string()).min(1).max(50),
        status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const posts = await ctx.db.post.findMany({
        where: { id: { in: input.postIds }, agencyId },
        select: { id: true, status: true },
      });

      if (posts.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontraron posts" });
      }

      const result = await ctx.db.post.updateMany({
        where: { id: { in: posts.map((p) => p.id) } },
        data: {
          status: input.status,
          ...(input.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
        },
      });

      // Log status changes
      for (const post of posts) {
        await ctx.db.postStatusLog.create({
          data: {
            postId: post.id,
            fromStatus: post.status,
            toStatus: input.status,
            changedById: ctx.session.user.id,
            note: "Cambio masivo de estado",
          },
        });
      }

      return { updated: result.count };
    }),

  bulkDelete: adminOrPermissionProcedure("DELETE_POSTS")
    .input(z.object({ postIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const posts = await ctx.db.post.findMany({
        where: { id: { in: input.postIds }, agencyId },
        select: { id: true },
      });

      if (posts.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontraron posts" });
      }

      await ctx.db.post.deleteMany({
        where: { id: { in: posts.map((p) => p.id) } },
      });

      return { deleted: posts.length };
    }),

  bulkAssignCategory: adminOrPermissionProcedure("EDIT_POSTS")
    .input(
      z.object({
        postIds: z.array(z.string()).min(1).max(50),
        categoryId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const result = await ctx.db.post.updateMany({
        where: { id: { in: input.postIds }, agencyId },
        data: { categoryId: input.categoryId },
      });

      return { updated: result.count };
    }),

  // ─── Approval Queue (Admin) ────────────────────────────────────────────
  getApprovalQueue: adminOrPermissionProcedure("EDIT_POSTS")
    .input(
      z.object({
        clientId: z.string().optional(),
        network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]).optional(),
        sortBy: z.enum(["oldest", "newest", "client"]).default("oldest"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const skip = (input.page - 1) * input.limit;

      const where: any = {
        agencyId,
        status: "IN_REVIEW",
      };

      if (input.clientId) where.clientId = input.clientId;
      if (input.network) where.network = input.network;

      const orderBy: any =
        input.sortBy === "newest" ? { updatedAt: "desc" }
        : input.sortBy === "client" ? [{ client: { companyName: "asc" } }, { updatedAt: "asc" }]
        : { updatedAt: "asc" }; // oldest first (default)

      const [posts, total] = await Promise.all([
        ctx.db.post.findMany({
          where,
          skip,
          take: input.limit,
          orderBy,
          include: {
            client: {
              select: { id: true, companyName: true, logoUrl: true },
            },
            media: { take: 1, orderBy: { sortOrder: "asc" } },
            _count: { select: { comments: true } },
            statusLogs: {
              where: { toStatus: "IN_REVIEW" },
              orderBy: { changedAt: "desc" },
              take: 1,
              select: { changedAt: true, changedBy: { select: { name: true } } },
            },
          },
        }),
        ctx.db.post.count({ where }),
      ]);

      return { posts, total, pages: Math.ceil(total / input.limit), page: input.page };
    }),

  // ─── Editor Dashboard Data ─────────────────────────────────────────────
  getEditorDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    const user = ctx.session.user;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get editor's assigned clients
    const perms = (user.permissions ?? []) as string[];
    const manageAll = perms.includes("MANAGE_ALL_CLIENTS");

    let clientFilter: any = {};
    if (!manageAll && user.role === "EDITOR") {
      const assignments = await ctx.db.editorClientAssignment.findMany({
        where: { editor: { userId: user.id } },
        select: { clientId: true },
      });
      clientFilter = { clientId: { in: assignments.map((a) => a.clientId) } };
    }

    const baseWhere = { agencyId, ...clientFilter };

    const [
      totalPosts,
      draftCount,
      inReviewCount,
      changesCount,
      approvedCount,
      // Posts by client
      postsByClient,
      // Upcoming deadlines (scheduled soon but not yet approved)
      upcomingDeadlines,
      // Recently approved (positive feedback)
      recentlyApproved,
      // Posts needing attention
      postsNeedingAttention,
    ] = await Promise.all([
      ctx.db.post.count({ where: baseWhere }),
      ctx.db.post.count({ where: { ...baseWhere, status: "DRAFT" } }),
      ctx.db.post.count({ where: { ...baseWhere, status: "IN_REVIEW" } }),
      ctx.db.post.count({ where: { ...baseWhere, status: "CLIENT_CHANGES" } }),
      ctx.db.post.count({ where: { ...baseWhere, status: { in: ["APPROVED", "SCHEDULED", "PUBLISHED"] } } }),
      // Posts grouped by client
      ctx.db.post.groupBy({
        by: ["clientId"],
        where: { ...baseWhere, status: { notIn: ["CANCELLED"] } },
        _count: { id: true },
      }),
      // Scheduled posts not yet approved (deadline risk)
      ctx.db.post.findMany({
        where: {
          ...baseWhere,
          scheduledAt: { gte: now, lte: sevenDaysFromNow },
          status: { in: ["DRAFT", "IN_REVIEW", "CLIENT_CHANGES"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: {
          client: { select: { companyName: true } },
          media: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      }),
      // Recently approved posts (last 5)
      ctx.db.post.findMany({
        where: { ...baseWhere, status: { in: ["APPROVED", "SCHEDULED"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          client: { select: { companyName: true } },
          media: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      }),
      // CLIENT_CHANGES posts (need editor attention)
      ctx.db.post.findMany({
        where: { ...baseWhere, status: "CLIENT_CHANGES" },
        orderBy: { updatedAt: "asc" },
        take: 5,
        include: {
          client: { select: { companyName: true } },
          media: { take: 1, orderBy: { sortOrder: "asc" } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    // Get client names for the breakdown
    const clientIds = postsByClient.map((p) => p.clientId);
    const clients = clientIds.length > 0
      ? await ctx.db.clientProfile.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, companyName: true, logoUrl: true },
        })
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const workloadByClient = postsByClient
      .map((p) => ({
        clientId: p.clientId,
        name: clientMap.get(p.clientId)?.companyName ?? "Sin nombre",
        logoUrl: clientMap.get(p.clientId)?.logoUrl ?? null,
        count: p._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      stats: { totalPosts, draftCount, inReviewCount, changesCount, approvedCount },
      workloadByClient,
      upcomingDeadlines,
      recentlyApproved,
      postsNeedingAttention,
    };
  }),

  // ─── Get Revisions for a Post ──────────────────────────────────────────
  getRevisions: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify post belongs to this agency
      const post = await ctx.db.post.findFirst({
        where: { id: input.postId, agencyId },
        select: { id: true },
      });
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Publicación no encontrada" });
      }

      return ctx.db.postRevision.findMany({
        where: { postId: input.postId },
        orderBy: { version: "desc" },
        include: {
          changedBy: { select: { name: true, avatarUrl: true } },
        },
      });
    }),
});
