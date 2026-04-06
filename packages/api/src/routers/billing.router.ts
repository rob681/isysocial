/**
 * Billing Router — Isysocial
 *
 * Handles Stripe checkout, customer portal, and subscription queries.
 * Uses shared.subscriptions + shared.organizations for cross-product awareness.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, protectedProcedure, getAgencyId } from "../trpc";
import { getStripe, STRIPE_PRICES, CROSS_PRODUCT_DISCOUNT } from "../lib/stripe";
import {
  getOrCreateOrganization,
  getOrganizationSubscriptions,
  hasBothProducts,
  type Product,
} from "../lib/shared-db";

const THIS_PRODUCT: Product = "ISYSOCIAL";

export const billingRouter = router({
  /**
   * Create a Stripe Checkout Session for Isysocial subscription.
   */
  createCheckoutSession: adminProcedure
    .input(
      z.object({
        planTier: z.enum(["basic", "pro", "enterprise"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const agencyId = getAgencyId(ctx);

      // Get agency info
      const agency = await ctx.db.agency.findUniqueOrThrow({
        where: { id: agencyId },
        select: { id: true, name: true },
      });

      // Get or create shared Organization
      const admin = await ctx.db.user.findFirst({
        where: { agencyId, role: "ADMIN" },
        select: { email: true },
      });

      const org = await getOrCreateOrganization(
        ctx.db,
        THIS_PRODUCT,
        agencyId,
        agency.name,
        { contactEmail: admin?.email ?? undefined }
      );

      // Get or create Stripe customer
      let stripeCustomerId = org.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: admin?.email ?? undefined,
          name: agency.name,
          metadata: { organizationId: org.id, agencyId },
        });
        stripeCustomerId = customer.id;

        // Update shared organization with Stripe customer
        await ctx.db.$queryRawUnsafe(
          `UPDATE shared.organizations SET stripe_customer_id = $1 WHERE id = $2`,
          stripeCustomerId,
          org.id
        );
      }

      // Check if already subscribed to this product
      const existingSubs = await getOrganizationSubscriptions(ctx.db, org.id);
      const currentSub = existingSubs.find((s) => s.product === THIS_PRODUCT);

      if (currentSub && ["active", "trial"].includes(currentSub.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ya tienes una suscripción activa de Isysocial. Usa el portal para cambiar de plan.",
        });
      }

      // Get price ID
      const priceId = STRIPE_PRICES.ISYSOCIAL?.[input.planTier];
      if (!priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Precio no configurado para Isysocial ${input.planTier}. Contacta soporte.`,
        });
      }

      // Check for cross-product discount
      const otherProductSubs = existingSubs.filter(
        (s) => s.product !== THIS_PRODUCT && ["active", "trial"].includes(s.status)
      );

      const discounts: { coupon?: string }[] = [];
      if (otherProductSubs.length > 0 && CROSS_PRODUCT_DISCOUNT > 0) {
        const couponId = `cross_product_${CROSS_PRODUCT_DISCOUNT}pct`;
        try {
          await stripe.coupons.retrieve(couponId);
        } catch {
          await stripe.coupons.create({
            id: couponId,
            percent_off: CROSS_PRODUCT_DISCOUNT,
            duration: "forever",
            name: `Descuento multi-producto (${CROSS_PRODUCT_DISCOUNT}%)`,
          });
        }
        discounts.push({ coupon: couponId });
      }

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        discounts: discounts.length > 0 ? discounts : undefined,
        success_url: `${baseUrl}/admin/billing?success=true`,
        cancel_url: `${baseUrl}/admin/billing?canceled=true`,
        subscription_data: {
          metadata: {
            organizationId: org.id,
            agencyId,
            product: THIS_PRODUCT,
            planTier: input.planTier,
          },
        },
        metadata: {
          organizationId: org.id,
          agencyId,
          product: THIS_PRODUCT,
          planTier: input.planTier,
        },
      });

      return { url: session.url };
    }),

  /**
   * Create Stripe Customer Portal session.
   */
  createPortalSession: adminProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe();
    const agencyId = getAgencyId(ctx);

    const org = await getOrCreateOrganization(ctx.db, THIS_PRODUCT, agencyId, "");

    if (!org.stripe_customer_id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No tienes una cuenta de facturación configurada.",
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${baseUrl}/admin/billing`,
    });

    return { url: session.url };
  }),

  /**
   * Get billing overview for current agency.
   */
  getBillingOverview: adminProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    const org = await getOrCreateOrganization(ctx.db, THIS_PRODUCT, agencyId, "");
    const subscriptions = await getOrganizationSubscriptions(ctx.db, org.id);
    const bothProducts = await hasBothProducts(ctx.db, org.id);

    return {
      organizationId: org.id,
      hasStripeCustomer: !!org.stripe_customer_id,
      hasCrossProductDiscount: bothProducts,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        product: s.product,
        planTier: s.plan_tier,
        status: s.status,
        currentPeriodStart: s.current_period_start,
        currentPeriodEnd: s.current_period_end,
        trialEndsAt: s.trial_ends_at,
        canceledAt: s.canceled_at,
        stripeSubscriptionId: s.stripe_subscription_id,
      })),
    };
  }),

  /**
   * Get available Isysocial plans and pricing.
   */
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);

    const org = await getOrCreateOrganization(ctx.db, THIS_PRODUCT, agencyId, "");
    const subs = await getOrganizationSubscriptions(ctx.db, org.id);
    const activeSubs = subs.filter((s) => ["active", "trial"].includes(s.status));
    const hasOtherProduct = activeSubs.some((s) => s.product !== THIS_PRODUCT);

    return {
      currentSubscriptions: activeSubs.map((s) => ({
        product: s.product,
        planTier: s.plan_tier,
      })),
      hasMultipleProducts: activeSubs.length > 1,
      crossProductDiscount: CROSS_PRODUCT_DISCOUNT,
      showDiscountBanner: hasOtherProduct && !activeSubs.some((s) => s.product === THIS_PRODUCT),
      plans: [
        {
          tier: "basic",
          name: "Starter",
          price: 29,
          annualPrice: 278,
          annualSavings: 60,
          description: "Para freelancers y agencias pequeñas",
          features: [
            "Hasta 3 editores",
            "Hasta 10 clientes",
            "Publicación en 3 redes sociales",
            "Calendario de contenido",
            "Aprobación de clientes",
            "Soporte por email",
          ],
          limits: {
            editors: 3,
            clients: 10,
            networks: 3,
            aiCredits: 100,
          },
        },
        {
          tier: "pro",
          name: "Profesional",
          price: 79,
          annualPrice: 758,
          annualSavings: 190,
          description: "Para agencias en crecimiento",
          popular: true,
          features: [
            "Hasta 10 editores",
            "Clientes ilimitados",
            "Publicación en 5 redes sociales",
            "Isystory Studio",
            "IA para copy y hashtags",
            "Reportes y analytics",
            "Brand Kit para clientes",
            "Soporte por email + chat",
          ],
          limits: {
            editors: 10,
            clients: -1,
            networks: 5,
            aiCredits: 1000,
          },
        },
        {
          tier: "enterprise",
          name: "Enterprise",
          price: 199,
          annualPrice: 1910,
          annualSavings: 478,
          description: "Para grandes agencias y multi-cuenta",
          features: [
            "Editores ilimitados",
            "Clientes ilimitados",
            "Todas las redes sociales",
            "Isystory Studio avanzado",
            "IA ilimitada",
            "Analytics avanzados & BI",
            "SSO / SAML",
            "Soporte prioritario 24/7",
            "API completo + webhooks",
            "Custom branding",
            "Account manager dedicado",
          ],
          limits: {
            editors: -1,
            clients: -1,
            networks: -1,
            aiCredits: -1,
          },
        },
      ],
    };
  }),
});
