import { z } from "zod";
import { router, superAdminProcedure } from "../trpc";

export const platformRouter = router({
  /**
   * Platform overview — global stats for SuperAdmin dashboard
   */
  overview: superAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalAgencies,
      activeAgencies,
      totalUsers,
      totalPosts,
      publishedThisMonth,
      recentAgencies,
    ] = await Promise.all([
      ctx.db.agency.count(),
      ctx.db.agency.count({ where: { isActive: true } }),
      ctx.db.user.count(),
      ctx.db.post.count(),
      ctx.db.post.count({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: startOfMonth },
        },
      }),
      ctx.db.agency.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          slug: true,
          planTier: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              posts: true,
            },
          },
        },
      }),
    ]);

    return {
      totalAgencies,
      activeAgencies,
      totalUsers,
      totalPosts,
      publishedThisMonth,
      recentAgencies,
    };
  }),

  /**
   * Paginated list of all agencies with counts
   */
  listAgencies: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(50).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, perPage, search } = input;
      const skip = (page - 1) * perPage;

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [agencies, total] = await Promise.all([
        ctx.db.agency.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: perPage,
          select: {
            id: true,
            name: true,
            slug: true,
            planTier: true,
            isActive: true,
            createdAt: true,
            logoUrl: true,
            _count: {
              select: {
                users: true,
                posts: true,
                clients: true,
                socialAccounts: true,
              },
            },
          },
        }),
        ctx.db.agency.count({ where }),
      ]);

      return {
        agencies,
        total,
        totalPages: Math.ceil(total / perPage),
        page,
      };
    }),

  /**
   * Single agency detail with users, posts stats, social accounts
   */
  agencyDetail: superAdminProcedure
    .input(z.object({ agencyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agency = await ctx.db.agency.findUnique({
        where: { id: input.agencyId },
        include: {
          _count: {
            select: {
              users: true,
              posts: true,
              clients: true,
              ideas: true,
              socialAccounts: true,
            },
          },
        },
      });

      if (!agency) {
        throw new Error("Agencia no encontrada");
      }

      const [users, postsByStatus, socialAccounts] = await Promise.all([
        ctx.db.user.findMany({
          where: { agencyId: input.agencyId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.post.groupBy({
          by: ["status"],
          where: { agencyId: input.agencyId },
          _count: { id: true },
        }),
        ctx.db.agencySocialAccount.findMany({
          where: { agencyId: input.agencyId },
          select: {
            id: true,
            network: true,
            accountName: true,
            isActive: true,
            connectedAt: true,
          },
        }),
      ]);

      return {
        agency,
        users,
        postsByStatus: postsByStatus.map((r) => ({
          status: r.status,
          count: r._count.id,
        })),
        socialAccounts,
      };
    }),

  /**
   * Global platform config (email, WhatsApp)
   */
  getGlobalConfig: superAdminProcedure.query(async ({ ctx }) => {
    const keys = [
      "resend_api_key",
      "email_from_address",
      "email_from_name",
      "notification_email_enabled",
      "whatsapp_token",
      "whatsapp_phone_number_id",
      "whatsapp_notifications_enabled",
    ];
    const records = await ctx.db.systemConfig.findMany({
      where: { key: { in: keys } },
    });
    const map = new Map(records.map((r: any) => [r.key, r.value]));
    return {
      resendApiKey: (map.get("resend_api_key") as string) ?? "",
      emailFromAddress: (map.get("email_from_address") as string) ?? "noreply@isysocial.com",
      emailFromName: (map.get("email_from_name") as string) ?? "Isysocial",
      notificationEmailEnabled: (map.get("notification_email_enabled") as boolean) ?? true,
      whatsappToken: (map.get("whatsapp_token") as string) ?? "",
      whatsappPhoneNumberId: (map.get("whatsapp_phone_number_id") as string) ?? "",
      whatsappNotificationsEnabled: (map.get("whatsapp_notifications_enabled") as boolean) ?? false,
    };
  }),

  updateGlobalConfig: superAdminProcedure
    .input(
      z.object({
        resendApiKey: z.string().optional(),
        emailFromAddress: z.string().email().optional(),
        emailFromName: z.string().min(1).max(60).optional(),
        notificationEmailEnabled: z.boolean().optional(),
        whatsappToken: z.string().optional(),
        whatsappPhoneNumberId: z.string().optional(),
        whatsappNotificationsEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: { key: string; value: any }[] = [];
      if (input.resendApiKey !== undefined && input.resendApiKey !== "")
        updates.push({ key: "resend_api_key", value: input.resendApiKey });
      if (input.emailFromAddress !== undefined)
        updates.push({ key: "email_from_address", value: input.emailFromAddress });
      if (input.emailFromName !== undefined)
        updates.push({ key: "email_from_name", value: input.emailFromName });
      if (input.notificationEmailEnabled !== undefined)
        updates.push({ key: "notification_email_enabled", value: input.notificationEmailEnabled });
      if (input.whatsappToken !== undefined && input.whatsappToken !== "")
        updates.push({ key: "whatsapp_token", value: input.whatsappToken });
      if (input.whatsappPhoneNumberId !== undefined && input.whatsappPhoneNumberId !== "")
        updates.push({ key: "whatsapp_phone_number_id", value: input.whatsappPhoneNumberId });
      if (input.whatsappNotificationsEnabled !== undefined)
        updates.push({ key: "whatsapp_notifications_enabled", value: input.whatsappNotificationsEnabled });

      await Promise.all(
        updates.map(({ key, value }) =>
          ctx.db.systemConfig.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        )
      );
      return { success: true };
    }),

  testEmail: superAdminProcedure
    .input(z.object({ toEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { sendEmailNotification } = await import("../lib/email");
      const sent = await sendEmailNotification({
        db: ctx.db,
        to: input.toEmail,
        subject: "✉️ Prueba de email — Isysocial Platform",
        title: "Email de prueba (SuperAdmin)",
        body: `¡Funciona! Este es un email de prueba enviado desde la configuración global de Isysocial.`,
        actionUrl: process.env.NEXTAUTH_URL || "https://www.isysocial.com",
        actionLabel: "Ir a Isysocial",
      });
      if (!sent) {
        throw new Error("No se pudo enviar. Verifica el API Key de Resend.");
      }
      return { success: true };
    }),

  /**
   * List all SuperAdmin staff users
   */
  listStaff: superAdminProcedure.query(async ({ ctx }) => {
    const staff = await ctx.db.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return staff;
  }),
});
