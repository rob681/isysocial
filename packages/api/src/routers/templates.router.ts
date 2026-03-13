import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, adminOrPermissionProcedure, getAgencyId } from "../trpc";

export const templatesRouter = router({
  /**
   * List templates for the agency
   */
  list: adminOrPermissionProcedure("CREATE_POSTS")
    .input(
      z.object({
        network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]).optional(),
        postType: z.enum(["IMAGE", "CAROUSEL", "STORY", "REEL", "VIDEO", "TEXT"]).optional(),
        search: z.string().optional(),
      }).default({})
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const where: any = { agencyId, isActive: true };
      if (input.network) where.network = input.network;
      if (input.postType) where.postType = input.postType;
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return ctx.db.postTemplate.findMany({
        where,
        orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
        include: {
          media: { orderBy: { sortOrder: "asc" }, take: 1 },
          category: { select: { id: true, name: true, color: true } },
        },
      });
    }),

  /**
   * Get single template with full details
   */
  get: adminOrPermissionProcedure("CREATE_POSTS")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const template = await ctx.db.postTemplate.findFirst({
        where: { id: input.id, agencyId },
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          category: { select: { id: true, name: true, color: true } },
        },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }

      return template;
    }),

  /**
   * Create a new template
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido").max(100),
        description: z.string().max(500).optional(),
        copyTemplate: z.string().max(5000).optional(),
        hashtags: z.string().max(1000).optional(),
        network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]).optional(),
        postType: z.enum(["IMAGE", "CAROUSEL", "STORY", "REEL", "VIDEO", "TEXT"]).optional(),
        categoryId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      return ctx.db.postTemplate.create({
        data: {
          agencyId,
          name: input.name,
          description: input.description,
          copyTemplate: input.copyTemplate,
          hashtags: input.hashtags,
          network: input.network ?? undefined,
          postType: input.postType ?? undefined,
          categoryId: input.categoryId ?? undefined,
        },
      });
    }),

  /**
   * Update a template
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        copyTemplate: z.string().max(5000).optional().nullable(),
        hashtags: z.string().max(1000).optional().nullable(),
        network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]).optional().nullable(),
        postType: z.enum(["IMAGE", "CAROUSEL", "STORY", "REEL", "VIDEO", "TEXT"]).optional().nullable(),
        categoryId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const { id, ...data } = input;

      const existing = await ctx.db.postTemplate.findFirst({
        where: { id, agencyId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }

      return ctx.db.postTemplate.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete (soft) a template
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const existing = await ctx.db.postTemplate.findFirst({
        where: { id: input.id, agencyId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }

      await ctx.db.postTemplate.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  /**
   * Add media to template
   */
  addMedia: adminProcedure
    .input(
      z.object({
        templateId: z.string(),
        fileName: z.string(),
        fileUrl: z.string().url(),
        storagePath: z.string(),
        mimeType: z.string(),
        fileSize: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const template = await ctx.db.postTemplate.findFirst({
        where: { id: input.templateId, agencyId },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }

      const maxOrder = await ctx.db.templateMedia.findFirst({
        where: { templateId: input.templateId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      return ctx.db.templateMedia.create({
        data: {
          templateId: input.templateId,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
        },
      });
    }),

  /**
   * Remove media from template
   */
  removeMedia: adminProcedure
    .input(z.object({ mediaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const media = await ctx.db.templateMedia.findFirst({
        where: { id: input.mediaId },
        include: { template: { select: { agencyId: true } } },
      });

      if (!media || media.template.agencyId !== agencyId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Media no encontrado" });
      }

      await ctx.db.templateMedia.delete({ where: { id: input.mediaId } });
      return { success: true };
    }),

  /**
   * Use a template to create a post — increments usageCount and returns template data
   */
  use: adminOrPermissionProcedure("CREATE_POSTS")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const template = await ctx.db.postTemplate.findFirst({
        where: { id: input.id, agencyId, isActive: true },
        include: { media: { orderBy: { sortOrder: "asc" } } },
      });

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }

      // Increment usage count
      await ctx.db.postTemplate.update({
        where: { id: input.id },
        data: { usageCount: { increment: 1 } },
      });

      return template;
    }),
});
