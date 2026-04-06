/**
 * Isytask → Isysocial Webhook Receiver
 *
 * Receives cross-app events from Isytask and queues them for processing.
 * Events are written to shared.cross_app_events for reliable delivery.
 *
 * Event types handled:
 *   TASK_IN_REVISION    → Update linked post status
 *   TASK_FINALIZADA     → Mark linked post as approved/ready
 *   TASK_CANCELADA      → Cancel linked post
 *   TASK_CREATED_WITH_POST → Create draft post from task
 */

import { NextResponse } from "next/server";
import { db } from "@isysocial/db";
import { queueEvent, getOrganizationByAgencyId } from "@isysocial/api";

const CROSS_APP_SECRET = process.env.CROSS_APP_SECRET;

export async function POST(req: Request) {
  // Verify authentication
  const secret = req.headers.get("x-cross-app-secret") || req.headers.get("X-Cross-App-Secret");

  if (!CROSS_APP_SECRET || secret !== CROSS_APP_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: {
    eventType: string;
    agencyId?: string;
    agencyName?: string;
    payload: Record<string, any>;
    timestamp?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { eventType, agencyId, agencyName, payload } = body;

  if (!eventType) {
    return NextResponse.json(
      { error: "Missing eventType" },
      { status: 400 }
    );
  }

  try {
    // Resolve organization (try by agencyId first, then by name match)
    let org = agencyId
      ? await getOrganizationByAgencyId(db, "ISYTASK", agencyId)
      : null;

    if (!org && agencyName) {
      // Fallback: try to find org by name match via Isysocial agency
      const isoAgency = await db.agency.findFirst({
        where: { name: { equals: agencyName, mode: "insensitive" } },
        select: { id: true },
      });
      if (isoAgency) {
        org = await getOrganizationByAgencyId(db, "ISYSOCIAL", isoAgency.id);
      }
    }

    if (!org) {
      console.warn(`[Webhook:Isytask] No organization found for agency ${agencyId || agencyName}`);
      // Accept the webhook but log it — don't fail
      return NextResponse.json(
        { received: true, warning: "Organization not found, event skipped" },
        { status: 202 }
      );
    }

    // Queue event in shared.cross_app_events for reliable processing
    const event = await queueEvent(db, {
      organizationId: org.id,
      sourceApp: "ISYTASK",
      targetApp: "ISYSOCIAL",
      eventType,
      payload: {
        ...payload,
        _sourceAgencyId: agencyId,
        _receivedAt: new Date().toISOString(),
      },
    });

    // Also process immediately for low latency (fire and forget)
    processEventImmediately(event.id).catch((err) =>
      console.error(`[Webhook:Isytask] Immediate processing failed for ${event.id}:`, err)
    );

    return NextResponse.json(
      { received: true, eventId: event.id },
      { status: 202 }
    );
  } catch (error) {
    console.error("[Webhook:Isytask] Error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * GET for health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "isytask",
    product: "ISYSOCIAL",
  });
}

/**
 * Process a cross-app event immediately (best-effort).
 * If this fails, the cron job will pick it up via retry.
 */
async function processEventImmediately(eventId: string) {
  const rows = await db.$queryRawUnsafe<any[]>(
    `SELECT * FROM shared.cross_app_events WHERE id = $1`,
    eventId
  );
  const event = rows[0];
  if (!event) return;

  const { event_type, payload } = event;

  try {
    switch (event_type) {
      case "TASK_IN_REVISION":
        await handleTaskInRevision(payload);
        break;
      case "TASK_FINALIZADA":
        await handleTaskFinalized(payload);
        break;
      case "TASK_CANCELADA":
        await handleTaskCanceled(payload);
        break;
      case "TASK_CREATED_WITH_POST":
        await handleTaskCreatedWithPost(payload);
        break;
      default:
        console.log(`[Webhook:Isytask] Unknown event type: ${event_type}`);
    }

    // Mark as done
    await db.$queryRawUnsafe(
      `UPDATE shared.cross_app_events SET status = 'DONE', processed_at = now() WHERE id = $1`,
      eventId
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await db.$queryRawUnsafe(
      `UPDATE shared.cross_app_events
       SET status = 'FAILED', error_message = $2, retry_count = retry_count + 1,
           next_retry_at = now() + interval '2 minutes'
       WHERE id = $1`,
      eventId,
      msg
    );
    throw error;
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

async function handleTaskInRevision(payload: any) {
  const { postId } = payload;
  if (!postId) return;

  // Move post back to IN_REVIEW if it was in CLIENT_CHANGES
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (post && post.status === "CLIENT_CHANGES") {
    await db.post.update({
      where: { id: postId },
      data: { status: "IN_REVIEW" },
    });

    await db.postStatusLog.create({
      data: {
        postId,
        fromStatus: "CLIENT_CHANGES",
        toStatus: "IN_REVIEW",
        changedById: "system",
        note: "[Isytask] Tarea movida a revisión",
      },
    });
  }
}

async function handleTaskFinalized(payload: any) {
  const { postId } = payload;
  if (!postId) return;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (post && !["PUBLISHED", "CANCELLED"].includes(post.status)) {
    await db.post.update({
      where: { id: postId },
      data: { status: "APPROVED" },
    });

    await db.postStatusLog.create({
      data: {
        postId,
        fromStatus: post.status,
        toStatus: "APPROVED",
        changedById: "system",
        note: "[Isytask] Tarea finalizada — post aprobado automáticamente",
      },
    });
  }
}

async function handleTaskCanceled(payload: any) {
  const { postId } = payload;
  if (!postId) return;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true },
  });

  if (post && !["PUBLISHED", "CANCELLED"].includes(post.status)) {
    await db.post.update({
      where: { id: postId },
      data: { status: "CANCELLED" },
    });

    await db.postStatusLog.create({
      data: {
        postId,
        fromStatus: post.status,
        toStatus: "CANCELLED",
        changedById: "system",
        note: "[Isytask] Tarea cancelada — post cancelado automáticamente",
      },
    });
  }
}

async function handleTaskCreatedWithPost(payload: any) {
  const { clientId, taskTitle, taskDescription } = payload;
  if (!clientId) return;

  // Find Isysocial client by matching email or name
  // For now, log the event. Full implementation would create a draft post.
  console.log(
    `[Webhook:Isytask] Task created with post request for client ${clientId}:`,
    taskTitle
  );
}
