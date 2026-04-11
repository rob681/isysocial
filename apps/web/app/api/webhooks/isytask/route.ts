/**
 * Isytask → Isysocial Webhook Receiver
 *
 * Receives cross-app events from Isytask and queues them for processing.
 * Events are written to shared.cross_app_events for reliable delivery.
 *
 * Event types handled:
 *   TASK_IN_REVISION       → Update linked post status to IN_REVIEW
 *   TASK_FINALIZADA        → Auto-publish or schedule linked post
 *   TASK_CANCELADA         → Cancel linked post
 *   TASK_CREATED_WITH_POST → Create draft post from task
 */

import { NextResponse } from "next/server";
import { db } from "@isysocial/db";
import { queueEvent, getOrganizationByAgencyId, publishToNetwork } from "@isysocial/api";

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

/** GET for health check */
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

/**
 * TASK_FINALIZADA → auto-publish or schedule the linked Isysocial post.
 *
 * Logic:
 *  1. Load post with network credentials (client or agency OAuth account)
 *  2. If post has scheduledAt in the future → move to SCHEDULED (cron publishes it)
 *  3. If no scheduledAt or in the past + credentials available → publish now
 *  4. If no credentials → mark APPROVED + log (admin publishes manually)
 */
async function handleTaskFinalized(payload: any) {
  const { postId } = payload;
  if (!postId) return;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      agencyId: true,
      clientId: true,
      network: true,
      postType: true,
      copy: true,
      hashtags: true,
      scheduledAt: true,
      client: {
        select: {
          socialNetworks: {
            where: { isActive: true, accessToken: { not: null } },
            select: {
              id: true,
              network: true,
              accessToken: true,
              accountId: true,
              pageId: true,
            },
          },
        },
      },
    },
  });

  if (!post || ["PUBLISHED", "CANCELLED"].includes(post.status)) return;

  // Find media for the post
  const media = await db.postMedia.findMany({
    where: { postId: post.id },
    orderBy: { sortOrder: "asc" },
    select: { fileUrl: true },
  });

  // Find OAuth account: client's first, fall back to agency's
  const clientAccount = post.client?.socialNetworks?.find(
    (sn: any) => sn.network === post.network && sn.accessToken
  );

  const agencyAccount = !clientAccount
    ? await db.agencySocialAccount.findFirst({
        where: {
          agencyId: post.agencyId,
          network: post.network,
          isActive: true,
          accessToken: { not: "" },
        },
        select: { id: true, network: true, accessToken: true, accountId: true, pageId: true },
      })
    : null;

  const account = clientAccount ?? agencyAccount;

  const now = new Date();
  const hasSchedule = post.scheduledAt && post.scheduledAt > now;

  // ── Case 1: Future scheduledAt → move to SCHEDULED ───────────────────────
  if (hasSchedule) {
    await db.post.update({
      where: { id: post.id },
      data: { status: "SCHEDULED" },
    });

    await db.postStatusLog.create({
      data: {
        postId: post.id,
        fromStatus: post.status,
        toStatus: "SCHEDULED",
        changedById: "system",
        note: `[Isytask] Tarea finalizada — publicación programada para ${post.scheduledAt!.toISOString()}`,
      },
    });

    console.log(`[TASK_FINALIZADA] Post ${post.id} scheduled for ${post.scheduledAt}`);
    return;
  }

  // ── Case 2: No schedule + credentials → publish now ───────────────────────
  if (account?.accessToken) {
    // Find agency admin user for log attribution
    const agencyAdmin = await db.user.findFirst({
      where: { agencyId: post.agencyId, role: "ADMIN" },
      select: { id: true },
    });

    const log = await db.postPublishLog.create({
      data: {
        postId: post.id,
        ...(clientAccount
          ? { networkId: clientAccount.id }
          : { agencyAccountId: agencyAccount!.id }),
        network: post.network,
        status: "PENDING",
        requestedById: agencyAdmin?.id ?? "system",
      },
    });

    try {
      const result = await publishToNetwork({
        network: post.network,
        copy: post.copy ?? "",
        hashtags: post.hashtags ?? "",
        mediaUrls: media.map((m: any) => m.fileUrl),
        postType: post.postType,
        accountId: account.accountId ?? "",
        accessToken: account.accessToken!,
        pageId: account.pageId ?? undefined,
      });

      await db.postPublishLog.update({
        where: { id: log.id },
        data: {
          status: result.success ? "SUCCESS" : "FAILED",
          platformPostId: result.platformPostId ?? null,
          platformUrl: result.platformUrl ?? null,
          errorMessage: result.error ?? null,
          publishedAt: result.success ? now : null,
        },
      });

      if (result.success) {
        await db.post.update({
          where: { id: post.id },
          data: { status: "PUBLISHED", publishedAt: now },
        });

        await db.postStatusLog.create({
          data: {
            postId: post.id,
            fromStatus: post.status,
            toStatus: "PUBLISHED",
            changedById: "system",
            note: "[Isytask] Tarea finalizada — publicado automáticamente",
          },
        });

        console.log(`[TASK_FINALIZADA] Post ${post.id} published successfully`);
      } else {
        // Publish failed → fall through to APPROVED so admin can retry manually
        await db.post.update({
          where: { id: post.id },
          data: { status: "APPROVED" },
        });

        await db.postStatusLog.create({
          data: {
            postId: post.id,
            fromStatus: post.status,
            toStatus: "APPROVED",
            changedById: "system",
            note: `[Isytask] Tarea finalizada — publicación automática falló: ${result.error ?? "error desconocido"}`,
          },
        });

        console.error(`[TASK_FINALIZADA] Auto-publish failed for post ${post.id}:`, result.error);
      }
    } catch (err) {
      console.error(`[TASK_FINALIZADA] Exception publishing post ${post.id}:`, err);

      await db.postPublishLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });

      // Fall back to APPROVED
      await db.post.update({
        where: { id: post.id },
        data: { status: "APPROVED" },
      });

      await db.postStatusLog.create({
        data: {
          postId: post.id,
          fromStatus: post.status,
          toStatus: "APPROVED",
          changedById: "system",
          note: "[Isytask] Tarea finalizada — error al publicar automáticamente, requiere publicación manual",
        },
      });
    }
    return;
  }

  // ── Case 3: No credentials → approve for manual publish ───────────────────
  await db.post.update({
    where: { id: post.id },
    data: { status: "APPROVED" },
  });

  await db.postStatusLog.create({
    data: {
      postId: post.id,
      fromStatus: post.status,
      toStatus: "APPROVED",
      changedById: "system",
      note: "[Isytask] Tarea finalizada — sin credenciales de red social, requiere publicación manual",
    },
  });

  console.log(`[TASK_FINALIZADA] Post ${post.id} approved (no credentials for auto-publish)`);
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

  console.log(
    `[Webhook:Isytask] Task created with post request for client ${clientId}:`,
    taskTitle
  );
}
