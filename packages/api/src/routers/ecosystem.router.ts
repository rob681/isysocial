/**
 * Ecosystem Router — Isysocial
 *
 * Provides multi-product awareness: subscription status,
 * cross-product discount eligibility, and product navigation.
 */

import { z } from "zod";
import { router, protectedProcedure, getAgencyId } from "../trpc";
import {
  getOrCreateOrganization,
  getOrganizationSubscriptions,
  hasActiveSubscription,
  hasBothProducts,
  type Product,
} from "../lib/shared-db";

const THIS_PRODUCT: Product = "ISYSOCIAL";

export const ecosystemRouter = router({
  /**
   * Get all subscriptions for the current agency's organization.
   */
  getAgencySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    const agency = await ctx.db.agency.findUniqueOrThrow({
      where: { id: agencyId },
      select: { name: true },
    });

    const org = await getOrCreateOrganization(ctx.db, THIS_PRODUCT, agencyId, agency.name);
    const subs = await getOrganizationSubscriptions(ctx.db, org.id);

    return subs.map((s) => ({
      product: s.product,
      planTier: s.plan_tier,
      status: s.status,
      currentPeriodEnd: s.current_period_end,
    }));
  }),

  /**
   * Validate if agency has access to a specific product.
   */
  validateProductAccess: protectedProcedure
    .input(z.object({ product: z.enum(["ISYTASK", "ISYSOCIAL"]) }))
    .query(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      const agency = await ctx.db.agency.findUniqueOrThrow({
        where: { id: agencyId },
        select: { name: true },
      });

      const org = await getOrCreateOrganization(ctx.db, THIS_PRODUCT, agencyId, agency.name);
      const hasAccess = await hasActiveSubscription(ctx.db, org.id, input.product as Product);

      return { hasAccess };
    }),

  /**
   * Get available products for navigation (product switcher).
   */
  getProductSelector: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    const agency = await ctx.db.agency.findUniqueOrThrow({
      where: { id: agencyId },
      select: { name: true },
    });

    const org = await getOrCreateOrganization(ctx.db, THIS_PRODUCT, agencyId, agency.name);
    const subs = await getOrganizationSubscriptions(ctx.db, org.id);
    const activeSubs = subs.filter((s) => ["active", "trial"].includes(s.status));

    const products = [
      {
        key: "ISYSOCIAL",
        name: "Isysocial",
        description: "Gestión de redes sociales",
        icon: "Share2",
        isCurrent: true,
        planTier: activeSubs.find((s) => s.product === "ISYSOCIAL")?.plan_tier ?? null,
        url: null, // Current app
      },
      {
        key: "ISYTASK",
        name: "Isytask",
        description: "Gestión de tareas",
        icon: "CheckSquare",
        isCurrent: false,
        planTier: activeSubs.find((s) => s.product === "ISYTASK")?.plan_tier ?? null,
        url: process.env.ISYTASK_APP_URL || "https://isytask-web.vercel.app",
      },
    ];

    return {
      organizationId: org.id,
      products,
      activeProducts: activeSubs.map((s) => s.product),
    };
  }),

  /**
   * Get cross-product discount info.
   */
  getCrossProductDiscount: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    const agency = await ctx.db.agency.findUniqueOrThrow({
      where: { id: agencyId },
      select: { name: true },
    });

    const org = await getOrCreateOrganization(ctx.db, THIS_PRODUCT, agencyId, agency.name);
    const both = await hasBothProducts(ctx.db, org.id);

    return {
      hasDiscount: both,
      discountPercent: both ? 10 : 0,
    };
  }),
});
