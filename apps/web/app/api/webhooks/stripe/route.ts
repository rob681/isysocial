/**
 * Stripe Webhook Handler — Isysocial
 *
 * Processes Stripe billing events and updates shared.subscriptions.
 * Each product has its own webhook endpoint; both write to the shared schema.
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@isysocial/db";
import {
  upsertSubscription,
  getOrganizationByAgencyId,
  getOrCreateOrganization,
  type SharedProduct as Product,
  type SharedPlanTier as PlanTier,
  type SharedSubscriptionStatus as SubscriptionStatus,
} from "@isysocial/api";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { organizationId, agencyId, product, planTier } = session.metadata ?? {};

  if (!product || !planTier) {
    console.error("[Stripe Webhook] Missing metadata in checkout session:", session.id);
    return;
  }

  // Resolve organization ID
  let orgId = organizationId;
  if (!orgId && agencyId) {
    const org = await getOrCreateOrganization(
      db,
      product as Product,
      agencyId,
      "Agency"
    );
    orgId = org.id;
  }

  if (!orgId) {
    console.error("[Stripe Webhook] Cannot resolve organization for session:", session.id);
    return;
  }

  const stripeSubscriptionId = session.subscription as string;

  await upsertSubscription(db, {
    organizationId: orgId,
    product: product as Product,
    planTier: planTier as PlanTier,
    status: "active",
    stripeSubscriptionId,
    currentPeriodStart: new Date(),
  });

  console.log(
    `[Stripe Webhook] Subscription created: ${product} ${planTier} for org ${orgId}`
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { organizationId, agencyId, product, planTier } = subscription.metadata ?? {};

  if (!product) {
    console.warn("[Stripe Webhook] Subscription updated without product metadata:", subscription.id);
    return;
  }

  let orgId: string | undefined = organizationId;
  if (!orgId && agencyId) {
    const org = await getOrganizationByAgencyId(db, product as Product, agencyId);
    orgId = org?.id;
  }
  if (!orgId) return;

  const statusMap: Record<string, SubscriptionStatus> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    trialing: "trial",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    paused: "canceled",
  };

  const mappedStatus = statusMap[subscription.status] || "active";

  // Stripe SDK v20: period dates on subscription items
  const firstItem = subscription.items?.data?.[0];
  const periodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000)
    : new Date();
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : undefined;

  await upsertSubscription(db, {
    organizationId: orgId,
    product: product as Product,
    planTier: (planTier as PlanTier) || "basic",
    status: mappedStatus,
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : null,
  });

  console.log(`[Stripe Webhook] Subscription updated: ${subscription.id} → ${mappedStatus}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { organizationId, agencyId, product } = subscription.metadata ?? {};

  if (!product) return;

  let orgId: string | undefined = organizationId;
  if (!orgId && agencyId) {
    const org = await getOrganizationByAgencyId(db, product as Product, agencyId);
    orgId = org?.id;
  }
  if (!orgId) return;

  await upsertSubscription(db, {
    organizationId: orgId,
    product: product as Product,
    planTier: "basic",
    status: "canceled",
    canceledAt: new Date(),
  });

  console.log(`[Stripe Webhook] Subscription canceled: ${product} for org ${orgId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subDetails = invoice.parent?.subscription_details;
  const subscriptionId =
    typeof subDetails?.subscription === "string"
      ? subDetails.subscription
      : subDetails?.subscription?.id;

  if (!subscriptionId) return;

  // Find subscription by Stripe ID and update status
  await db.$queryRawUnsafe(
    `UPDATE shared.subscriptions SET status = 'past_due', updated_at = now()
     WHERE stripe_subscription_id = $1`,
    subscriptionId
  );

  console.log(`[Stripe Webhook] Payment failed for subscription: ${subscriptionId}`);
}
