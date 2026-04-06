/**
 * Stripe SDK configuration for Isysocial billing.
 *
 * Each product (Isytask / Isysocial) has its own Stripe webhook and checkout,
 * but shares the same Stripe account and customer IDs via shared.organizations.
 */

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn("[Stripe] STRIPE_SECRET_KEY not set — billing features disabled");
}

export function getStripe(): Stripe {
  if (!stripeInstance) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return stripeInstance;
}

/**
 * Stripe price IDs for Isysocial plans.
 * Loaded from environment variables.
 */
export const STRIPE_PRICES: Record<string, Record<string, string | undefined>> = {
  ISYSOCIAL: {
    basic: process.env.STRIPE_PRICE_ISYSOCIAL_BASIC,
    pro: process.env.STRIPE_PRICE_ISYSOCIAL_PRO,
    enterprise: process.env.STRIPE_PRICE_ISYSOCIAL_ENTERPRISE,
  },
};

/**
 * Cross-product discount percentage
 */
export const CROSS_PRODUCT_DISCOUNT = 10;
