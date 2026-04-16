import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAgencyId,
  adminOrPermissionProcedure,
} from "../trpc";
import {
  createIdeaSchema,
  updateIdeaSchema,
  addIdeaLinkSchema,
} from "@isysocial/shared";
import type { Role } from "@isysocial/shared";
import { getSignedUrl } from "../lib/supabase-storage";

// ─── Helper: replace fileUrl with a signed URL for each media item ───────────
async function enrichMediaWithSignedUrls<
  T extends { fileUrl?: string | null; storagePath?: string | null },
>(mediaItems: T[]): Promise<T[]> {
  return Promise.all(
    mediaItems.map(async (item) => {
      if (item.storagePath) {
        try {
          const signedUrl = await getSignedUrl(item.storagePath, 3600);
          return { ...item, fileUrl: signedUrl };
        } catch {
          return item; // keep original on failure
        }
      }
      return item;
    })
  );
}

export const ideasRouter = router({
  // ─── Create Idea (Agency) ───────────────────────────────────────────────
  create: adminOrPermissionProcedure("MANAGE_IDEAS")
    .input(createIdeaSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client belongs to agency if specified
      if (input.clientId) {
        const client = await ctx.db.clientProfile.findFirst({
          where: { id: input.clientId, agencyId, isActive: true },
        });
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
        }
      }

      // Derive networks array from input (prefer networks array, fallback to single network)
      const networks = input.networks?.length
        ? input.networks
        : input.network
          ? [input.network]
          : [];

      const idea = await ctx.db.idea.create({
        data: {
          agencyId,
          clientId: input.clientId || null,
          createdById: ctx.session.user.id,
          isClientIdea: false,
          title: input.title,
          description: input.description || null,
          copyIdeas: input.copyIdeas || null,
          network: networks[0] || null,
          networks,
          postType: input.postType || null,
          tentativeDate: input.tentativeDate || null,
          status: "BACKLOG",
        },
      });

      return idea;
    }),

  // ─── Create Idea (Client) ──────────────────────────────────────────────
  createClientIdea: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Título requerido"),
        description: z.string().optional(),
        copyIdeas: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (user.role !== "CLIENTE" || !user.clientProfileId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo los clientes pueden crear ideas de cliente" });
      }

      const agencyId = getAgencyId(ctx);

      const idea = await ctx.db.idea.create({
        data: {
          agencyId,
          clientId: user.clientProfileId,
          createdById: user.id,
          isClientIdea: true,
          title: input.title,
          description: input.description || null,
          copyIdeas: input.copyIdeas || null,
          status: "BACKLOG",
        },
      });

      return idea;
    }),

  // ─── Get Single Idea ──────────────────────────────────────────────────────
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const idea = await ctx.db.idea.findFirst({
        where: { id: input.id, agencyId },
        include: {
          client: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          createdBy: { select: { id: true, name: true, role: true } },
          media: { orderBy: { sortOrder: "asc" } },
          links: { orderBy: { createdAt: "desc" } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, avatarUrl: true, role: true } },
            },
          },
        },
      });

      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea no encontrada" });
      }

      // Client can only see ideas assigned to them
      if (user.role === "CLIENTE" && user.clientProfileId) {
        if (idea.clientId && idea.clientId !== user.clientProfileId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta idea" });
        }
      }

      // Enrich media with signed URLs
      const enrichedMedia = await enrichMediaWithSignedUrls(idea.media);

      return { ...idea, media: enrichedMedia };
    }),

  // ─── List Ideas ───────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        status: z.enum(["BACKLOG", "IN_PROGRESS", "READY", "CONVERTED", "DISCARDED"]).optional(),
        network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]).optional(),
        search: z.string().optional(),
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;
      const skip = (input.page - 1) * input.limit;

      const where: any = { agencyId };

      // Client can only see their own ideas
      if (user.role === "CLIENTE" && user.clientProfileId) {
        where.clientId = user.clientProfileId;
      }

      // Editor: only assigned clients (unless MANAGE_ALL_CLIENTS)
      if (user.role === "EDITOR") {
        const perms = (user.permissions ?? []) as string[];
        if (!perms.includes("MANAGE_ALL_CLIENTS")) {
          const assignments = await ctx.db.editorClientAssignment.findMany({
            where: { editor: { userId: user.id } },
            select: { clientId: true },
          });
          const clientIds = assignments.map((a) => a.clientId);
          // Strict: editor only sees their assigned clients + ideas without client
          // If no assignments → only sees ideas with clientId: null
          where.OR = [
            { clientId: { in: clientIds } },
            { clientId: null }, // Ideas without client are always visible
          ];
        }
      }

      // Filters — apply clientId only if it doesn't violate role-based restrictions
      if (input.clientId) {
        if (user.role === "CLIENTE") {
          // CLIENTE is already locked to their own clientProfileId — ignore input
        } else if (user.role === "EDITOR" && where.OR) {
          // Editor has an OR clause (assigned clients + null) — wrap with AND to combine
          const existingOr = where.OR;
          delete where.OR;
          where.AND = [
            { OR: existingOr },
            { clientId: input.clientId },
          ];
        } else {
          // ADMIN or EDITOR with MANAGE_ALL_CLIENTS — apply freely
          where.clientId = input.clientId;
        }
      }
      if (input.status) where.status = input.status;
      if (input.network) {
        where.OR = [
          ...(where.OR || []),
          { network: input.network },
          { networks: { has: input.network } },
        ];
      }

      if (input.month && input.year) {
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 1);
        where.AND = [
          ...(where.AND || []),
          { createdAt: { gte: startDate, lt: endDate } },
        ];
      }

      if (input.search) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
              { copyIdeas: { contains: input.search, mode: "insensitive" } },
            ],
          },
        ];
      }

      const [ideas, total] = await Promise.all([
        ctx.db.idea.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: [{ updatedAt: "desc" }],
          include: {
            client: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
            },
            createdBy: { select: { id: true, name: true, role: true } },
            media: { take: 1, orderBy: { sortOrder: "asc" } },
            _count: { select: { comments: true, links: true, media: true } },
          },
        }),
        ctx.db.idea.count({ where }),
      ]);

      // Enrich thumbnail media with signed URLs
      const enrichedIdeas = await Promise.all(
        ideas.map(async (idea) => ({
          ...idea,
          media: await enrichMediaWithSignedUrls(idea.media),
        }))
      );

      return {
        ideas: enrichedIdeas,
        total,
        pages: Math.ceil(total / input.limit),
        page: input.page,
      };
    }),

  // ─── Update Idea ──────────────────────────────────────────────────────────
  update: protectedProcedure
    .input(updateIdeaSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const idea = await ctx.db.idea.findFirst({
        where: { id: input.id, agencyId },
      });
      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea no encontrada" });
      }

      // Clients can only edit their own client ideas
      if (user.role === "CLIENTE") {
        if (!idea.isClientIdea || idea.createdById !== user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo puedes editar tus propias ideas" });
        }
      }

      // Don't allow editing converted/discarded ideas
      if (["CONVERTED", "DISCARDED"].includes(idea.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se puede editar una idea convertida o descartada.",
        });
      }

      const data: any = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.copyIdeas !== undefined) data.copyIdeas = input.copyIdeas;
      if (input.network !== undefined) data.network = input.network;
      if (input.networks !== undefined) {
        data.networks = input.networks;
        // Keep legacy network field in sync (first network)
        data.network = input.networks[0] || null;
      }
      if (input.postType !== undefined) data.postType = input.postType;
      if (input.tentativeDate !== undefined) data.tentativeDate = input.tentativeDate;
      if (input.status !== undefined) data.status = input.status;

      return ctx.db.idea.update({
        where: { id: input.id },
        data,
      });
    }),

  // ─── Update Status (for kanban drag) ──────────────────────────────────────
  updateStatus: adminOrPermissionProcedure("MANAGE_IDEAS")
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["BACKLOG", "IN_PROGRESS", "READY", "CONVERTED", "DISCARDED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const idea = await ctx.db.idea.findFirst({
        where: { id: input.id, agencyId },
      });
      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea no encontrada" });
      }

      return ctx.db.idea.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // ─── Add Comment ──────────────────────────────────────────────────────────
  addComment: protectedProcedure
    .input(
      z.object({
        ideaId: z.string(),
        content: z.string().min(1, "El comentario no puede estar vacío"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const idea = await ctx.db.idea.findFirst({
        where: { id: input.ideaId, agencyId },
        include: {
          client: { include: { user: { select: { id: true } } } },
        },
      });
      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea no encontrada" });
      }

      const comment = await ctx.db.ideaComment.create({
        data: {
          ideaId: input.ideaId,
          authorId: user.id,
          content: input.content,
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
      });

      // Notify relevant users
      const notifyUserIds = new Set<string>();

      // If agency member comments → notify client if assigned
      if (user.role !== "CLIENTE" && idea.client?.user?.id) {
        notifyUserIds.add(idea.client.user.id);
      }

      // Don't notify the author
      notifyUserIds.delete(user.id);

      if (notifyUserIds.size > 0) {
        await ctx.db.notification.createMany({
          data: Array.from(notifyUserIds).map((userId) => ({
            userId,
            type: "NEW_IDEA_COMMENT" as const,
            title: "Nuevo comentario en idea",
            body: `${user.name} comentó en la idea "${idea.title}"`,
            relatedId: idea.id,
            relatedType: "idea",
          })),
        });
      }

      return comment;
    }),

  // ─── Add Link (with OG scraping) ─────────────────────────────────────────
  addLink: adminOrPermissionProcedure("MANAGE_IDEAS")
    .input(addIdeaLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const idea = await ctx.db.idea.findFirst({
        where: { id: input.ideaId, agencyId },
      });
      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea no encontrada" });
      }

      // Fetch OG metadata
      let ogTitle: string | null = null;
      let ogDescription: string | null = null;
      let ogImage: string | null = null;

      try {
        const { fetchOGData } = await import("../lib/og-preview");
        const og = await fetchOGData(input.url);
        ogTitle = og.title;
        ogDescription = og.description;
        ogImage = og.image;
      } catch {
        // OG fetch is non-critical
      }

      const link = await ctx.db.ideaLink.create({
        data: {
          ideaId: input.ideaId,
          url: input.url,
          ogTitle,
          ogDescription,
          ogImage,
        },
      });

      return link;
    }),

  // ─── Remove Link ──────────────────────────────────────────────────────────
  removeLink: adminOrPermissionProcedure("MANAGE_IDEAS")
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.ideaLink.delete({ where: { id: input.linkId } });
      return { success: true };
    }),

  // ─── Add Media (also available to clients for their own ideas) ──────────
  addMedia: protectedProcedure
    .input(
      z.object({
        ideaId: z.string(),
        files: z.array(
          z.object({
            fileName: z.string(),
            fileUrl: z.string(),
            storagePath: z.string(),
            mimeType: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const idea = await ctx.db.idea.findFirst({
        where: { id: input.ideaId, agencyId },
        include: { _count: { select: { media: true } } },
      });
      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea no encontrada" });
      }

      // Clients can only add media to their own ideas
      if (user.role === "CLIENTE") {
        if (idea.clientId !== user.clientProfileId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes agregar imágenes a esta idea" });
        }
      }

      const startOrder = idea._count.media;

      const media = await ctx.db.$transaction(
        input.files.map((file, i) =>
          ctx.db.ideaMedia.create({
            data: {
              ideaId: input.ideaId,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              storagePath: file.storagePath,
              mimeType: file.mimeType,
              sortOrder: startOrder + i,
            },
          })
        )
      );

      return media;
    }),

  // ─── Remove Media ─────────────────────────────────────────────────────────
  removeMedia: protectedProcedure
    .input(z.object({ mediaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const media = await ctx.db.ideaMedia.findUnique({
        where: { id: input.mediaId },
        include: { idea: { select: { clientId: true, createdById: true, isClientIdea: true } } },
      });
      if (!media) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Media no encontrada" });
      }

      // Clients can only remove media from their own client ideas
      if (user.role === "CLIENTE") {
        if (!media.idea.isClientIdea || media.idea.createdById !== user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminar esta imagen" });
        }
      }

      await ctx.db.ideaMedia.delete({ where: { id: input.mediaId } });

      // Also try to delete from storage
      try {
        const { deleteFile } = await import("../lib/supabase-storage");
        await deleteFile(media.storagePath);
      } catch {
        // Non-critical
      }

      return { success: true };
    }),

  // ─── Convert Idea to Post ─────────────────────────────────────────────────
  convertToPost: adminOrPermissionProcedure("CREATE_POSTS")
    .input(
      z.object({
        id: z.string(),
        clientId: z.string().optional(), // Can override/set client for unassigned ideas
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const idea = await ctx.db.idea.findFirst({
        where: { id: input.id, agencyId },
        include: {
          media: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea no encontrada" });
      }

      if (idea.status === "CONVERTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta idea ya fue convertida a post.",
        });
      }

      const clientId = input.clientId || idea.clientId;
      if (!clientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Se necesita un cliente para crear un post. Asigna un cliente a la idea.",
        });
      }

      // Determine networks: prefer new array, fallback to single field
      const ideaNetworks = (idea as any).networks?.length
        ? (idea as any).networks as string[]
        : idea.network
          ? [idea.network]
          : [];

      if (ideaNetworks.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La idea necesita al menos una red social definida antes de convertir a post.",
        });
      }

      if (!idea.postType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La idea necesita un tipo de post definido antes de convertir.",
        });
      }

      const primaryNetwork = ideaNetworks[0]!;
      const mirrorNetworks = ideaNetworks.slice(1);

      // Create post from idea in a transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Create primary post
        const mirrorGroupId = mirrorNetworks.length > 0 ? `idea-${idea.id}` : undefined;

        const post = await tx.post.create({
          data: {
            agencyId,
            clientId,
            editorId: user.id,
            title: idea.title,
            copy: idea.copyIdeas || null,
            network: primaryNetwork as any,
            postType: idea.postType!,
            scheduledAt: idea.tentativeDate,
            status: "DRAFT",
            ...(mirrorGroupId && { mirrorGroupId }),
          },
        });

        // Copy media from idea to post
        if (idea.media.length > 0) {
          await tx.postMedia.createMany({
            data: idea.media.map((m, i) => ({
              postId: post.id,
              fileName: m.fileName,
              fileUrl: m.fileUrl,
              storagePath: m.storagePath,
              mimeType: m.mimeType,
              fileSize: 0,
              sortOrder: i,
            })),
          });
        }

        // Create mirror posts for additional networks
        for (const net of mirrorNetworks) {
          const mirrorPost = await tx.post.create({
            data: {
              agencyId,
              clientId,
              editorId: user.id,
              title: idea.title,
              copy: idea.copyIdeas || null,
              network: net as any,
              postType: idea.postType!,
              scheduledAt: idea.tentativeDate,
              status: "DRAFT",
              mirrorGroupId: mirrorGroupId!,
            },
          });

          // Copy media to mirror post too
          if (idea.media.length > 0) {
            await tx.postMedia.createMany({
              data: idea.media.map((m, i) => ({
                postId: mirrorPost.id,
                fileName: m.fileName,
                fileUrl: m.fileUrl,
                storagePath: m.storagePath,
                mimeType: m.mimeType,
                fileSize: 0,
                sortOrder: i,
              })),
            });
          }

          await tx.postStatusLog.create({
            data: {
              postId: mirrorPost.id,
              toStatus: "DRAFT",
              changedById: user.id,
              note: `Espejo desde idea: "${idea.title}" (${primaryNetwork} → ${net})`,
            },
          });
        }

        // Log status creation for primary post
        await tx.postStatusLog.create({
          data: {
            postId: post.id,
            toStatus: "DRAFT",
            changedById: user.id,
            note: `Creado desde idea: "${idea.title}"${mirrorNetworks.length > 0 ? ` (+${mirrorNetworks.length} espejo${mirrorNetworks.length > 1 ? "s" : ""})` : ""}`,
          },
        });

        // Mark idea as converted
        await tx.idea.update({
          where: { id: idea.id },
          data: {
            status: "CONVERTED",
            convertedPostId: post.id,
          },
        });

        // Notify about conversion
        if (idea.clientId) {
          const client = await tx.clientProfile.findUnique({
            where: { id: idea.clientId },
            include: { user: { select: { id: true } } },
          });
          if (client) {
            await tx.notification.create({
              data: {
                userId: client.user.id,
                type: "IDEA_CONVERTED_TO_POST",
                title: "Idea convertida a post",
                body: `La idea "${idea.title}" fue convertida a publicación${mirrorNetworks.length > 0 ? ` en ${ideaNetworks.length} redes sociales` : ""}.`,
                relatedId: post.id,
                relatedType: "post",
              },
            });
          }
        }

        return post;
      });

      return result;
    }),

  // ─── Delete Idea ──────────────────────────────────────────────────────────
  delete: adminOrPermissionProcedure("MANAGE_IDEAS")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const idea = await ctx.db.idea.findFirst({
        where: { id: input.id, agencyId },
        include: { media: true },
      });
      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea no encontrada" });
      }

      // Delete media from storage
      try {
        const { deleteFile } = await import("../lib/supabase-storage");
        for (const m of idea.media) {
          await deleteFile(m.storagePath);
        }
      } catch {
        // Non-critical
      }

      await ctx.db.idea.delete({ where: { id: input.id } });

      return { success: true };
    }),

  // ─── Get Clients for Select (Ideas) ───────────────────────────────────────
  getClientsForSelect: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    const user = ctx.session.user;

    let where: any = { agencyId, isActive: true };

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
      select: { id: true, companyName: true },
    });

    return clients;
  }),
});
