import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, getAgencyId } from "../trpc";
import { createClientSchema, updateClientSchema, updateBrandKitSchema } from "@isysocial/shared";
import { createToken } from "../lib/tokens";
import { sendEmailNotification } from "../lib/email";

export const clientsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const skip = (input.page - 1) * input.limit;

      const where = {
        agencyId,
        isActive: true,
        ...(input.search
          ? {
              OR: [
                { companyName: { contains: input.search, mode: "insensitive" as const } },
                { user: { name: { contains: input.search, mode: "insensitive" as const } } },
                { user: { email: { contains: input.search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      };

      const [clients, total] = await Promise.all([
        ctx.db.clientProfile.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } },
            socialNetworks: { where: { isActive: true }, orderBy: { network: "asc" } },
            group: { select: { id: true, name: true } },
            _count: { select: { posts: true, ideas: true } },
          },
        }),
        ctx.db.clientProfile.count({ where }),
      ]);

      return {
        clients,
        total,
        pages: Math.ceil(total / input.limit),
        page: input.page,
      };
    }),

  // Lightweight query for sidebar client list (respects editor permissions)
  getForSidebar: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    const user = ctx.session.user;

    // Clients don't see this list (they have their own nav)
    if (user.role === "CLIENTE") return [];

    let where: any = { agencyId, isActive: true };

    // Editor sees only assigned clients (unless MANAGE_ALL_CLIENTS)
    if (user.role === "EDITOR") {
      const perms = (user.permissions ?? []) as string[];
      if (!perms.includes("MANAGE_ALL_CLIENTS")) {
        const assignments = await ctx.db.editorClientAssignment.findMany({
          where: { editor: { userId: user.id } },
          select: { clientId: true },
        });
        where.id = { in: assignments.map((a: any) => a.clientId) };
      }
    }

    const clients = await ctx.db.clientProfile.findMany({
      where,
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        companyName: true,
        logoUrl: true,
        groupId: true,
        user: { select: { name: true, avatarUrl: true } },
        socialNetworks: { where: { isActive: true }, select: { network: true } },
      },
    });

    return clients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      logoUrl: c.logoUrl,
      avatarUrl: c.user.avatarUrl,
      contactName: c.user.name,
      groupId: c.groupId,
      networks: c.socialNetworks.map((n) => n.network),
    }));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.id, agencyId },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true, isActive: true } },
          socialNetworks: {
            orderBy: { network: "asc" },
            select: {
              id: true,
              network: true,
              accountName: true,
              profilePic: true,
              isActive: true,
              assignedAt: true,
              tokenExpiresAt: true,
            },
          },
          editorAssignments: {
            include: {
              editor: {
                include: {
                  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                },
              },
            },
          },
          _count: { select: { posts: true, ideas: true } },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      return client;
    }),

  create: protectedProcedure
    .input(createClientSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Check email not already taken
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email ya está registrado.",
        });
      }

      // Create user + client profile in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            name: input.name,
            phone: input.phone,
            role: "CLIENTE",
            agencyId,
            isActive: true,
            // No password — they'll set it via invitation link
            clientProfile: {
              create: {
                agencyId,
                companyName: input.companyName,
                isActive: true,
              },
            },
          },
          include: { clientProfile: true },
        });

        // Add social networks
        if (input.networks.length > 0 && user.clientProfile) {
          await tx.clientSocialNetwork.createMany({
            data: input.networks.map((network) => ({
              clientId: user.clientProfile!.id,
              network,
              isActive: true,
            })),
          });
        }

        return user;
      });

      return {
        success: true,
        clientId: result.clientProfile?.id,
        userId: result.id,
      };
    }),

  update: protectedProcedure
    .input(updateClientSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.id, agencyId },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      const { id, companyName, logoUrl, brandColors, name, phone } = input;

      await ctx.db.$transaction(async (tx) => {
        await tx.clientProfile.update({
          where: { id },
          data: {
            ...(companyName && { companyName }),
            ...(logoUrl !== undefined && { logoUrl }),
            ...(brandColors && { brandColors }),
          },
        });

        if (name || phone !== undefined) {
          await tx.user.update({
            where: { id: client.userId },
            data: {
              ...(name && { name }),
              ...(phone !== undefined && { phone }),
            },
          });
        }
      });

      return { success: true };
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.id, agencyId },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      await ctx.db.$transaction([
        ctx.db.clientProfile.update({
          where: { id: input.id },
          data: { isActive: false },
        }),
        ctx.db.user.update({
          where: { id: client.userId },
          data: { isActive: false },
        }),
      ]);

      return { success: true };
    }),

  updateNetworks: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        networks: z.array(
          z.object({
            network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]),
            accountName: z.string().optional(),
            profilePic: z.string().optional(),
            isActive: z.boolean().default(true),
            pageId: z.string().optional(), // Allow pageId for new schema
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      // Upsert each network
      for (const net of input.networks) {
        // Use pageId if available, otherwise use network as fallback for backward compatibility
        const pageId = net.pageId || net.network;

        await ctx.db.clientSocialNetwork.upsert({
          where: {
            clientId_network_pageId: {
              clientId: input.clientId,
              network: net.network,
              pageId: pageId,
            },
          },
          create: {
            clientId: input.clientId,
            network: net.network,
            pageId: pageId,
            accountName: net.accountName,
            profilePic: net.profilePic,
            isActive: net.isActive,
          },
          update: {
            accountName: net.accountName,
            profilePic: net.profilePic,
            isActive: net.isActive,
          },
        });
      }

      return { success: true };
    }),

  assignEditors: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        editorIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      // Get editor profiles for the provided user IDs (scoped to same agency)
      const editors = await ctx.db.editorProfile.findMany({
        where: {
          user: { id: { in: input.editorIds }, agencyId, isActive: true },
        },
        select: { id: true },
      });

      const editorProfileIds = editors.map((e) => e.id);

      // Replace all assignments
      await ctx.db.$transaction(async (tx) => {
        await tx.editorClientAssignment.deleteMany({
          where: { clientId: input.clientId },
        });
        if (editorProfileIds.length > 0) {
          await tx.editorClientAssignment.createMany({
            data: editorProfileIds.map((editorId) => ({
              editorId,
              clientId: input.clientId,
            })),
          });
        }
      });

      return { success: true };
    }),

  invite: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        include: {
          user: { select: { id: true, email: true, name: true, passwordHash: true } },
        },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      const tokenString = await createToken(ctx.db, client.user.id, "INVITATION");
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/setup-password?token=${tokenString}`;

      await sendEmailNotification({
        db: ctx.db,
        to: client.user.email,
        subject: "Invitación a Isysocial — Revisa y aprueba tu contenido",
        title: `Bienvenido, ${client.user.name}`,
        body: `Has sido invitado a revisar y aprobar el contenido de redes sociales de <strong>${client.companyName}</strong>.<br><br>Haz clic en el botón de abajo para crear tu contraseña y acceder a tu portal.`,
        actionUrl: inviteUrl,
        actionLabel: "Crear contraseña y acceder",
      });

      return { success: true };
    }),

  // ─── Brand Kit ────────────────────────────────────────────────────────────
  getBrandKit: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          brandKit: true,
          brandAssets: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      // Clients can only see their own brand kit
      if (user.role === "CLIENTE" && user.clientProfileId !== input.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este cliente" });
      }

      return client;
    }),

  updateBrandKit: protectedProcedure
    .input(updateBrandKitSchema)
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      // Clients can only update their own brand kit
      if (user.role === "CLIENTE") {
        if (!user.clientProfileId || user.clientProfileId !== input.clientId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este cliente" });
        }
      }

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      const currentBrandKit = (client.brandKit as Record<string, any>) || {};

      const updatedBrandKit = {
        ...currentBrandKit,
        ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
        ...(input.secondaryColor !== undefined && { secondaryColor: input.secondaryColor }),
        ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
        ...(input.typography !== undefined && { typography: input.typography }),
        ...(input.toneOfVoice !== undefined && { toneOfVoice: input.toneOfVoice }),
        ...(input.styleNotes !== undefined && { styleNotes: input.styleNotes }),
        ...(input.targetAudience !== undefined && { targetAudience: input.targetAudience }),
        ...(input.brandValues !== undefined && { brandValues: input.brandValues }),
        ...(input.missionStatement !== undefined && { missionStatement: input.missionStatement }),
        ...(input.doAndDonts !== undefined && { doAndDonts: input.doAndDonts }),
      };

      await ctx.db.clientProfile.update({
        where: { id: input.clientId },
        data: { brandKit: updatedBrandKit },
      });

      return { success: true };
    }),

  addBrandAsset: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        label: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        storagePath: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const user = ctx.session.user;

      // Clients can only add assets to their own brand kit
      if (user.role === "CLIENTE") {
        if (!user.clientProfileId || user.clientProfileId !== input.clientId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este cliente" });
        }
      }

      const client = await ctx.db.clientProfile.findFirst({
        where: { id: input.clientId, agencyId },
      });
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      }

      const maxSort = await ctx.db.clientBrandAsset.findFirst({
        where: { clientId: input.clientId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      return ctx.db.clientBrandAsset.create({
        data: {
          clientId: input.clientId,
          label: input.label,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          sortOrder: (maxSort?.sortOrder ?? -1) + 1,
        },
      });
    }),

  removeBrandAsset: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.clientBrandAsset.findUnique({
        where: { id: input.assetId },
        include: { client: { select: { agencyId: true, id: true } } },
      });
      if (!asset) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asset no encontrado" });
      }

      const agencyId = getAgencyId(ctx);
      if (asset.client.agencyId !== agencyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso" });
      }

      // Clients can only remove their own assets
      const user = ctx.session.user;
      if (user.role === "CLIENTE") {
        if (!user.clientProfileId || user.clientProfileId !== asset.client.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este asset" });
        }
      }

      await ctx.db.clientBrandAsset.delete({ where: { id: input.assetId } });

      // Try to delete from storage
      try {
        const { deleteFile } = await import("../lib/supabase-storage");
        await deleteFile(asset.storagePath);
      } catch {
        // Non-critical
      }

      return { success: true };
    }),

  // ─── SOCIAL NETWORKS MANAGEMENT ────────────────────────────────────────

  getAvailablePagesToAssign: adminProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client exists and belongs to agency
      const client = await ctx.db.clientProfile.findUnique({
        where: { id: input.clientId },
        select: { agencyId: true, id: true },
      });
      if (!client || client.agencyId !== agencyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso" });
      }

      // Get all agency's connected pages
      const agencyPages = await ctx.db.agencySocialAccount.findMany({
        where: { agencyId, isActive: true },
        orderBy: [{ network: "asc" }, { accountName: "asc" }],
      });

      // Get already assigned pages for this client
      const assignedPages = await ctx.db.clientSocialNetwork.findMany({
        where: { clientId: input.clientId, isActive: true },
        select: { pageId: true, network: true },
      });

      const assignedPageIds = assignedPages.map((p) => p.pageId).filter(Boolean) as string[];

      return {
        availablePages: agencyPages.map((page) => ({
          id: page.id,
          network: page.network,
          pageId: page.pageId,
          accountName: page.accountName,
          profilePic: page.profilePic,
          alreadyAssigned: assignedPageIds.includes(page.pageId || ""),
        })),
        assignedCount: assignedPages.length,
      };
    }),

  assignPagesToClient: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        pageIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client exists and belongs to agency
      const client = await ctx.db.clientProfile.findUnique({
        where: { id: input.clientId },
        select: { agencyId: true, id: true },
      });
      if (!client || client.agencyId !== agencyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso" });
      }

      // Get agency pages to assign
      const agencyPages = await ctx.db.agencySocialAccount.findMany({
        where: { id: { in: input.pageIds }, agencyId },
      });

      if (agencyPages.length !== input.pageIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Una o más páginas no son válidas" });
      }

      // Create client social network entries
      const results = await Promise.all(
        agencyPages.map((page) =>
          ctx.db.clientSocialNetwork.upsert({
            where: {
              clientId_network_pageId: {
                clientId: input.clientId,
                network: page.network,
                pageId: page.pageId || page.accountId,
              },
            },
            update: { isActive: true, assignedAt: new Date() },
            create: {
              clientId: input.clientId,
              network: page.network,
              pageId: page.pageId || page.accountId,
              accountName: page.accountName,
              profilePic: page.profilePic,
              sourceType: "agency",
              agencyAccountId: page.id,
              accessToken: page.accessToken,
              tokenExpiresAt: page.tokenExpiresAt,
              accountId: page.accountId,
              tokenScope: page.tokenScope,
            },
          })
        )
      );

      return {
        success: true,
        assigned: results.length,
        pages: results.map((r) => ({
          id: r.id,
          network: r.network,
          accountName: r.accountName,
        })),
      };
    }),

  removePageFromClient: adminProcedure
    .input(
      z.object({
        clientId: z.string(),
        pageId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify client exists and belongs to agency
      const client = await ctx.db.clientProfile.findUnique({
        where: { id: input.clientId },
        select: { agencyId: true, id: true },
      });
      if (!client || client.agencyId !== agencyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso" });
      }

      // Find and delete
      const clientNetwork = await ctx.db.clientSocialNetwork.findFirst({
        where: { clientId: input.clientId, pageId: input.pageId },
      });

      if (!clientNetwork) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Página no encontrada para este cliente" });
      }

      await ctx.db.clientSocialNetwork.delete({
        where: { id: clientNetwork.id },
      });

      return { success: true, message: "Página desvinculada" };
    }),

  getClientPages: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Verify access
      const client = await ctx.db.clientProfile.findUnique({
        where: { id: input.clientId },
        select: { agencyId: true, id: true },
      });
      if (!client || client.agencyId !== agencyId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso" });
      }

      // Get client's assigned pages grouped by network
      const pages = await ctx.db.clientSocialNetwork.findMany({
        where: { clientId: input.clientId, isActive: true },
        orderBy: [{ network: "asc" }, { accountName: "asc" }],
      });

      // Group by network
      const grouped = pages.reduce(
        (acc, page) => {
          if (!acc[page.network]) {
            acc[page.network] = [];
          }
          acc[page.network].push({
            id: page.id,
            pageId: page.pageId,
            accountName: page.accountName,
            profilePic: page.profilePic,
            isActive: page.isActive,
            assignedAt: page.assignedAt,
          });
          return acc;
        },
        {} as Record<
          string,
          {
            id: string;
            pageId: string | null;
            accountName: string | null;
            profilePic: string | null;
            isActive: boolean;
            assignedAt: Date;
          }[]
        >
      );

      return { pages: grouped, total: pages.length };
    }),
});
