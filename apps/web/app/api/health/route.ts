/**
 * Health Check & Integration Status — Isysocial
 *
 * Returns:
 *   - App status
 *   - Database connectivity
 *   - Event bus health metrics
 *   - Stripe configuration status
 *   - Cross-app integration status
 */

import { NextResponse } from "next/server";
import { db } from "@isysocial/db";
import { getEventBusHealth } from "@isysocial/api";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const isAuthed = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // Basic health (always available)
  const health: Record<string, any> = {
    status: "ok",
    product: "ISYSOCIAL",
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
  };

  // Detailed health (only for authenticated requests)
  if (isAuthed) {
    try {
      // Database check
      await db.$queryRaw`SELECT 1`;
      health.database = "connected";
    } catch {
      health.database = "disconnected";
      health.status = "degraded";
    }

    try {
      // Shared schema check
      const result = await db.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as count FROM shared.organizations`
      );
      health.sharedSchema = {
        available: true,
        organizations: Number(result[0]?.count ?? 0),
      };
    } catch {
      health.sharedSchema = { available: false };
    }

    try {
      // Event bus health
      health.eventBus = await getEventBusHealth(db, "ISYSOCIAL");
      if (health.eventBus.deadLetter > 0) {
        health.status = "degraded";
        health.alerts = health.alerts || [];
        health.alerts.push(
          `${health.eventBus.deadLetter} events in dead letter queue`
        );
      }
    } catch {
      health.eventBus = { error: "shared schema not available" };
    }

    // Configuration status
    health.config = {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      crossAppSecret: !!process.env.CROSS_APP_SECRET,
      isytaskWebhookUrl: process.env.ISYTASK_WEBHOOK_URL || "not configured",
      supabase: !!process.env.SUPABASE_URL,
      metaOAuth: !!process.env.META_APP_ID,
    };
  }

  return NextResponse.json(health);
}
