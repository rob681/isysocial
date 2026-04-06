import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAgencyId,
  adminOrPermissionProcedure,
} from "../trpc";
// Simple ID generator instead of uuid

export const storiesRouter = router({
  // ─── Create Story Batch ──────────────────────────────────────────────────────
  createBatch: adminOrPermissionProcedure("CREATE_POSTS")
    .input(z.object({
      clientId: z.string(),
      network: z.enum(["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN"]),
      count: z.number().int().min(2).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client exists
      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId, isActive: true },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      // Verify client has pages for network
      const clientNetwork = await ctx.db.clientSocialNetwork.findFirst({
        where: {
          clientId: input.clientId,
          network: input.network,
          isActive: true,
        },
      });
      if (!clientNetwork) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `El cliente no tiene páginas asignadas para ${input.network}`,
        });
      }

      // Create batch ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      // Create N draft stories with same batchId
      const posts = await ctx.db.$transaction(
        Array.from({ length: input.count }, (_, index) =>
          ctx.db.post.create({
            data: {
              agencyId,
              clientId: input.clientId,
              editorId: ctx.session.user.id,
              network: input.network,
              postType: "STORY",
              title: `Story ${index + 1}`,
              copy: "",
              status: "DRAFT",
              storyBatchId: batchId,
              storySequence: index,
            },
          })
        )
      );

      // Create status logs
      await ctx.db.$transaction(
        posts.map((post) =>
          ctx.db.postStatusLog.create({
            data: {
              postId: post.id,
              toStatus: "DRAFT",
              changedById: ctx.session.user.id,
              note: `Story creada como parte de batería`,
            },
          })
        )
      );

      return { batchId, posts };
    }),

  // ─── Get Story Batch ─────────────────────────────────────────────────────────
  getBatch: protectedProcedure
    .input(z.object({ batchId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const posts = await ctx.db.post.findMany({
        where: {
          storyBatchId: input.batchId,
          agencyId,
        },
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          client: {
            select: { id: true, companyName: true, brandKit: true },
          },
          category: true,
        },
        orderBy: { storySequence: "asc" },
      });

      if (posts.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch no encontrado" });
      }

      return posts;
    }),

  // ─── Reorder Batch Stories ───────────────────────────────────────────────────
  reorderBatch: adminOrPermissionProcedure("EDIT_POSTS")
    .input(z.object({
      batchId: z.string(),
      orderedIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify batch exists and belongs to agency
      const existingPosts = await ctx.db.post.findMany({
        where: {
          storyBatchId: input.batchId,
          agencyId,
        },
      });

      if (existingPosts.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch no encontrado" });
      }

      // Update storySequence for each story
      await ctx.db.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.db.post.update({
            where: { id },
            data: { storySequence: index },
          })
        )
      );

      return { success: true };
    }),

  // ─── Publish Story Batch ─────────────────────────────────────────────────────
  publishBatch: adminOrPermissionProcedure("PUBLISH_POSTS")
    .input(z.object({
      batchId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Get all stories in batch
      const stories = await ctx.db.post.findMany({
        where: {
          storyBatchId: input.batchId,
          agencyId,
        },
        orderBy: { storySequence: "asc" },
      });

      if (stories.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch no encontrado" });
      }

      // Change all to IN_REVIEW or PUBLISHED depending on permission
      const newStatus = "IN_REVIEW";

      const updated = await ctx.db.$transaction(
        stories.map((story) =>
          ctx.db.post.update({
            where: { id: story.id },
            data: { status: newStatus },
          })
        )
      );

      // Create status logs
      await ctx.db.$transaction(
        updated.map((story) =>
          ctx.db.postStatusLog.create({
            data: {
              postId: story.id,
              toStatus: newStatus,
              changedById: ctx.session.user.id,
              note: `Batería enviada para aprobación`,
            },
          })
        )
      );

      return { success: true, updated };
    }),

  // ─── Update Batch Story Status ───────────────────────────────────────────────
  updateBatchStatus: adminOrPermissionProcedure("EDIT_POSTS")
    .input(z.object({
      batchId: z.string(),
      newStatus: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "REJECTED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Get all stories in batch
      const stories = await ctx.db.post.findMany({
        where: {
          storyBatchId: input.batchId,
          agencyId,
        },
      });

      if (stories.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch no encontrado" });
      }

      // Update all stories
      const updated = await ctx.db.$transaction(
        stories.map((story) =>
          ctx.db.post.update({
            where: { id: story.id },
            data: { status: input.newStatus as any },
          })
        )
      );

      // Create status logs
      await ctx.db.$transaction(
        updated.map((story) =>
          ctx.db.postStatusLog.create({
            data: {
              postId: story.id,
              toStatus: input.newStatus as any,
              changedById: ctx.session.user.id,
              note: `Estado actualizado en batería`,
            },
          })
        )
      );

      return { success: true, updated };
    }),
});
