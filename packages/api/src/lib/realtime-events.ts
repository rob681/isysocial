// ─── Real-time Event Broadcast Utility ────────────────────────────────────────
// After mutations, call broadcastEvent() to insert a row into iso_realtime_events.
// The SSE endpoint polls this table and pushes events to connected clients.
// Clients then invalidate the relevant tRPC queries.

import type { PrismaClient } from "@isysocial/db";

export type RealtimeEventType =
  | "POST_CREATED"
  | "POST_UPDATED"
  | "POST_STATUS_CHANGED"
  | "COMMENT_ADDED"
  | "POST_PUBLISHED"
  | "CALENDAR_UPDATED"
  | "IDEA_UPDATED";

interface BroadcastOptions {
  agencyId: string;
  type: RealtimeEventType;
  postId?: string;
  clientId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Fire-and-forget event broadcast. Does NOT throw — failures are silent
 * so they never block the main mutation response.
 */
export async function broadcastEvent(
  db: PrismaClient,
  opts: BroadcastOptions
): Promise<void> {
  try {
    await (db as any).realtimeEvent.create({
      data: {
        agencyId: opts.agencyId,
        type: opts.type,
        postId: opts.postId ?? null,
        clientId: opts.clientId ?? null,
        payload: opts.payload ?? null,
      },
    });
  } catch {
    // Silent — real-time is best-effort, never blocks main flow
  }
}

/**
 * Clean up events older than 10 minutes.
 * Call from cron jobs to keep the table lean.
 */
export async function cleanOldEvents(db: PrismaClient): Promise<void> {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await (db as any).realtimeEvent.deleteMany({
      where: { createdAt: { lt: tenMinutesAgo } },
    });
  } catch {
    // Silent
  }
}
