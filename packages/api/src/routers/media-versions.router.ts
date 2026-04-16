import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, getAgencyId } from "../trpc";

const MAX_VERSIONS = 10; // Keep up to 10 versions; V1 (original) is always preserved

export const mediaVersionsRouter = router({
  // ─── Get all versions for a media item ──────────────────────────────────────
  getVersions: protectedProcedure
    .input(z.object({ mediaId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.postMediaVersion.findMany({
        where: { mediaId: input.mediaId },
        orderBy: { versionNumber: "asc" },
        include: {
          changedBy: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
          relatedComment: {
            select: { id: true, content: true, createdAt: true },
          },
        },
      });
    }),

  // ─── Get versions for all media in a post ───────────────────────────────────
  getPostVersions: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
        include: {
          media: {
            where: { mimeType: { startsWith: "image/" } },
            orderBy: { sortOrder: "asc" },
            include: {
              versions: {
                orderBy: { versionNumber: "asc" },
                include: {
                  changedBy: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                      role: true,
                    },
                  },
                  relatedComment: {
                    select: { id: true, content: true, createdAt: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Publicación no encontrada",
        });
      }

      // Only return media that has versions
      return post.media.filter((m) => m.versions.length > 0);
    }),

  // ─── Create a new version ───────────────────────────────────────────────────
  createVersion: protectedProcedure
    .input(
      z.object({
        mediaId: z.string(),
        fileUrl: z.string().url(),
        storagePath: z.string(),
        mimeType: z.string(),
        fileSize: z.number().int().positive(),
        changeNotes: z.string().min(1, "Describe los cambios realizados"),
        relatedCommentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user.id;
      const userRole = ctx.session!.user.role;

      // Only ADMIN, EDITOR, or SUPER_ADMIN can create versions
      if (!["ADMIN", "EDITOR", "SUPER_ADMIN"].includes(userRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores y editores pueden crear versiones",
        });
      }

      // Verify media exists and belongs to user's agency
      const media = await ctx.db.postMedia.findUnique({
        where: { id: input.mediaId },
        include: { post: true },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media no encontrada",
        });
      }

      // Verify only image media types
      if (!media.mimeType.startsWith("image/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El historial de versiones solo está disponible para imágenes",
        });
      }

      // Agency check for non-super-admins
      if (userRole !== "SUPER_ADMIN") {
        const agencyId = getAgencyId(ctx);
        if (media.post.agencyId !== agencyId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes acceso a esta publicación",
          });
        }
      }

      // Get existing versions count
      const existingVersions = await ctx.db.postMediaVersion.findMany({
        where: { mediaId: input.mediaId },
        orderBy: { versionNumber: "asc" },
      });

      let nextVersionNumber: number;

      if (existingVersions.length === 0) {
        // First version: save current image as v1, then create new as v2
        await ctx.db.postMediaVersion.create({
          data: {
            mediaId: input.mediaId,
            versionNumber: 1,
            fileUrl: media.fileUrl,
            storagePath: media.storagePath,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
            changedById: userId,
            changeNotes: "Imagen original",
          },
        });
        nextVersionNumber = 2;
      } else {
        nextVersionNumber = existingVersions.length + 1;
      }

      // If we're at the limit, delete the second-oldest version (NEVER V1 — the original)
      if (nextVersionNumber > MAX_VERSIONS) {
        // existingVersions is sorted ASC: [V1_original, V2, V3, ...]
        // Always preserve V1 (index 0). Delete V2 (index 1) if possible, else V1.
        const deleteIndex = existingVersions.length >= 2 ? 1 : 0;
        const toDelete = existingVersions[deleteIndex];
        if (toDelete) {
          await ctx.db.postMediaVersion.delete({
            where: { id: toDelete.id },
          });

          // Renumber remaining versions keeping V1 at position 1
          const remaining = [
            ...existingVersions.slice(0, deleteIndex),
            ...existingVersions.slice(deleteIndex + 1),
          ];
          for (let i = 0; i < remaining.length; i++) {
            await ctx.db.postMediaVersion.update({
              where: { id: remaining[i].id },
              data: { versionNumber: i + 1 },
            });
          }
          nextVersionNumber = remaining.length + 1;
        }
      }

      // Create the new version
      const newVersion = await ctx.db.postMediaVersion.create({
        data: {
          mediaId: input.mediaId,
          versionNumber: nextVersionNumber,
          fileUrl: input.fileUrl,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          changedById: userId,
          changeNotes: input.changeNotes,
          relatedCommentId: input.relatedCommentId,
        },
        include: {
          changedBy: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
          relatedComment: {
            select: { id: true, content: true, createdAt: true },
          },
        },
      });

      // Update the main PostMedia with the new file
      await ctx.db.postMedia.update({
        where: { id: input.mediaId },
        data: {
          fileUrl: input.fileUrl,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
        },
      });

      return newVersion;
    }),

  // ─── Get version count for a media item ─────────────────────────────────────
  getVersionCount: protectedProcedure
    .input(z.object({ mediaId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.postMediaVersion.count({
        where: { mediaId: input.mediaId },
      });
    }),
});
