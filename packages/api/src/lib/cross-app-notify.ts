/**
 * Cross-App Notification: Isysocial → Isytask
 *
 * Sends events to Isytask via:
 *   1. shared.cross_app_events (reliable, with retry) — primary
 *   2. HTTP webhook (low-latency, best-effort) — secondary
 *
 * This is the Isysocial side of the integration. The event processing
 * happens in Isytask's cross-app-sync.ts library.
 */

import { queueEvent, getOrganizationByAgencyId } from "./shared-db";

type CrossAppEventType =
  | "POST_REJECTED"
  | "POST_APPROVED"
  | "POST_IN_REVIEW"
  | "POST_PUBLISHED"
  | "POST_CHANGES_REQUESTED"
  | "OAUTH_EXPIRED";

interface NotifyIsytaskParams {
  eventType: CrossAppEventType;
  agencyName: string;
  payload: {
    postId: string;
    postTitle?: string;
    postType?: string;
    network?: string;
    clientEmail?: string;
    editorEmail?: string;
    feedback?: string;
    taskId?: string;   // isytaskTaskId if linked
  };
}

/**
 * Send a cross-app event to Isytask.
 * Uses dual delivery: shared event bus (reliable) + HTTP webhook (low-latency).
 * Silently fails if integration is not configured.
 *
 * @param params - Event parameters
 * @param db - Prisma client (optional, for shared event bus writes)
 */
export async function notifyIsytask(params: NotifyIsytaskParams, db?: any): Promise<void> {
  // 1. Write to shared event bus (reliable delivery with retry)
  if (db) {
    try {
      // We need to find the org — try by agencyName match
      const agency = await db.agency.findFirst({
        where: { name: { equals: params.agencyName, mode: "insensitive" } },
        select: { id: true },
      });

      if (agency) {
        const org = await getOrganizationByAgencyId(db, "ISYSOCIAL", agency.id);
        if (org) {
          await queueEvent(db, {
            organizationId: org.id,
            sourceApp: "ISYSOCIAL",
            targetApp: "ISYTASK",
            eventType: params.eventType,
            payload: params.payload,
          });
        }
      }
    } catch (err) {
      console.warn("[CrossApp] Failed to write to shared event bus:", err);
    }
  }

  // 2. Also send HTTP webhook for low-latency delivery (best-effort)
  const webhookUrl = process.env.ISYTASK_WEBHOOK_URL;
  const secret = process.env.CROSS_APP_SECRET;

  if (!webhookUrl || !secret) {
    return;
  }

  try {
    const response = await fetch(`${webhookUrl}/api/webhooks/isysocial`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cross-app-secret": secret,
      },
      body: JSON.stringify({
        eventType: params.eventType,
        agencyName: params.agencyName,
        payload: params.payload,
      }),
    });

    if (!response.ok) {
      console.warn(
        `[CrossApp] Isytask webhook returned ${response.status}:`,
        await response.text().catch(() => "")
      );
    }
  } catch (error) {
    console.warn("[CrossApp] Failed to notify Isytask:", error);
  }
}

/**
 * Helper: Build event payload from a post object
 */
export function buildPostPayload(post: {
  id: string;
  title?: string | null;
  postType?: string;
  network?: string;
  isytaskTaskId?: string | null;
  client?: { user?: { email?: string } };
}) {
  return {
    postId: post.id,
    postTitle: post.title ?? undefined,
    postType: post.postType,
    network: post.network,
    clientEmail: post.client?.user?.email,
    taskId: post.isytaskTaskId ?? undefined,
  };
}
