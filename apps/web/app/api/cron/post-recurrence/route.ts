// ─── Cron: Generate Recurring Posts ──────────────────────────────────────────
// Vercel Cron Job — runs daily at 7:00 AM UTC (set in vercel.json)
// Finds PostRecurrenceInstance rows with status=PENDING and scheduledFor <= now
// Clones the template post and creates a new SCHEDULED post for each one

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";
import type { PostMedia } from "@isysocial/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // Fetch PENDING instances that are due (with 5-min lookahead)
    const windowEnd = new Date(now.getTime() + 5 * 60 * 1000);

    const pending = await db.postRecurrenceInstance.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: windowEnd },
        recurrence: { isActive: true },
      },
      include: {
        recurrence: {
          include: {
            post: {
              include: {
                media: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
      },
      take: 50,
      orderBy: { scheduledFor: "asc" },
    });

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const instance of pending) {
      const templatePost = instance.recurrence.post;

      try {
        // Clone the template post with new scheduledAt
        const newPost = await db.post.create({
          data: {
            agencyId: templatePost.agencyId,
            clientId: templatePost.clientId,
            editorId: templatePost.editorId,
            network: templatePost.network,
            postType: templatePost.postType,
            title: templatePost.title,
            copy: templatePost.copy,
            hashtags: templatePost.hashtags,
            purpose: templatePost.purpose,
            categoryId: templatePost.categoryId,
            revisionsLimit: templatePost.revisionsLimit,
            referenceLink: templatePost.referenceLink,
            storyData: templatePost.storyData as any,
            scheduledAt: instance.scheduledFor,
            status: "SCHEDULED",
            sourceRecurrenceId: instance.recurrenceId,
          },
        });

        // Copy media references (reuse same file URLs)
        if (templatePost.media.length > 0) {
          await db.postMedia.createMany({
            data: templatePost.media.map((m: PostMedia) => ({
              postId: newPost.id,
              fileName: m.fileName,
              fileUrl: m.fileUrl,
              storagePath: m.storagePath,
              mimeType: m.mimeType,
              fileSize: m.fileSize,
              sortOrder: m.sortOrder,
              thumbnailUrl: m.thumbnailUrl,
              duration: m.duration,
            })),
          });
        }

        // Log status
        await db.postStatusLog.create({
          data: {
            postId: newPost.id,
            toStatus: "SCHEDULED",
            changedById: templatePost.editorId ?? templatePost.agencyId,
            note: `Generado por recurrencia ${instance.recurrence.recurrenceType}`,
          },
        });

        // Mark instance CREATED
        await db.postRecurrenceInstance.update({
          where: { id: instance.id },
          data: { generatedPostId: newPost.id, status: "CREATED" },
        });

        // Update recurrence counter and generate next lookahead instance
        await db.postRecurrence.update({
          where: { id: instance.recurrenceId },
          data: {
            occurrencesGenerated: { increment: 1 },
            lastGeneratedAt: now,
          },
        });

        await generateNextInstance(instance.recurrenceId, instance.scheduledFor);

        created++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[post-recurrence] Failed instance ${instance.id}:`, msg);
        errors.push(`${instance.id}: ${msg}`);

        await db.postRecurrenceInstance.update({
          where: { id: instance.id },
          data: { status: "FAILED", errorMessage: msg },
        });

        failed++;
      }
    }

    console.log(`[post-recurrence] Done: ${created} created, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: pending.length,
      created,
      failed,
      ...(errors.length > 0 && { errors }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[post-recurrence] Cron error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Generate next lookahead instance ────────────────────────────────────────

async function generateNextInstance(recurrenceId: string, lastScheduledFor: Date) {
  const recurrence = await db.postRecurrence.findUnique({
    where: { id: recurrenceId },
  });

  if (!recurrence || !recurrence.isActive) return;

  // Check max occurrences
  if (
    recurrence.maxOccurrences !== null &&
    recurrence.occurrencesGenerated + 1 >= recurrence.maxOccurrences
  ) {
    await db.postRecurrence.update({
      where: { id: recurrenceId },
      data: { isActive: false },
    });
    return;
  }

  const [hh, mm] = recurrence.timeOfDay.split(":").map(Number);
  let nextDate: Date | null = null;
  const cursor = new Date(lastScheduledFor);

  if (recurrence.recurrenceType === "DAILY") {
    nextDate = new Date(cursor);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(hh!, mm!, 0, 0);

  } else if (recurrence.recurrenceType === "WEEKLY") {
    const activeDays =
      recurrence.daysOfWeek.length > 0
        ? recurrence.daysOfWeek
        : [recurrence.startsAt.getDay()];

    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(cursor);
      candidate.setDate(candidate.getDate() + i);
      candidate.setHours(hh!, mm!, 0, 0);
      if (activeDays.includes(candidate.getDay())) {
        nextDate = candidate;
        break;
      }
    }

  } else if (recurrence.recurrenceType === "MONTHLY") {
    nextDate = new Date(cursor);
    nextDate.setMonth(nextDate.getMonth() + 1);
    nextDate.setHours(hh!, mm!, 0, 0);
  }

  if (!nextDate) return;

  // Don't schedule past the end date
  if (recurrence.endsAt && nextDate > recurrence.endsAt) {
    await db.postRecurrence.update({
      where: { id: recurrenceId },
      data: { isActive: false },
    });
    return;
  }

  await db.postRecurrenceInstance.create({
    data: {
      recurrenceId,
      scheduledFor: nextDate,
      status: "PENDING",
    },
  });
}
