/**
 * Cron: Cross-App Event Processor — Isysocial
 *
 * Processes pending events from shared.cross_app_events where target_app = 'ISYSOCIAL'.
 * Handles retries with exponential backoff and dead-letter queue.
 *
 * Schedule: Every 2 minutes (or configure in vercel.json)
 */

import { NextResponse } from "next/server";
import { db } from "@isysocial/db";
import { fetchPendingEvents, markEventDone, markEventFailed } from "@isysocial/api";

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await fetchPendingEvents(db, "ISYSOCIAL", 50);

    if (events.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending events" });
    }

    let succeeded = 0;
    let failed = 0;
    let deadLettered = 0;

    for (const event of events) {
      try {
        await processEvent(event);
        await markEventDone(db, event.id);
        succeeded++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await markEventFailed(db, event.id, msg);

        if (event.retry_count + 1 >= event.max_retries) {
          deadLettered++;
          console.error(
            `[CrossAppCron] Event ${event.id} moved to dead letter after ${event.max_retries} retries: ${msg}`
          );
        } else {
          failed++;
        }
      }
    }

    return NextResponse.json({
      processed: events.length,
      succeeded,
      failed,
      deadLettered,
    });
  } catch (error) {
    console.error("[CrossAppCron] Fatal error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}

async function processEvent(event: any) {
  const { event_type, payload } = event;

  switch (event_type) {
    case "TASK_IN_REVISION": {
      const { postId } = payload;
      if (!postId) return;

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
      break;
    }

    case "TASK_FINALIZADA": {
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
            note: "[Isytask] Tarea finalizada — post aprobado",
          },
        });
      }
      break;
    }

    case "TASK_CANCELADA": {
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
            note: "[Isytask] Tarea cancelada",
          },
        });
      }
      break;
    }

    case "TASK_CREATED_WITH_POST":
      console.log(`[CrossAppCron] Task created with post:`, payload);
      break;

    default:
      console.log(`[CrossAppCron] Unknown event type: ${event_type}`);
  }
}
