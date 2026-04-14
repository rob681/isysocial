/**
 * DB-backed Rate Limiter (Isysocial)
 *
 * Replaces in-memory Maps that reset on server restart.
 * Uses the RateLimitRecord table for persistence across instances.
 *
 * Usage:
 *   const allowed = await checkRateLimit(db, "reset:user@email.com", 3, 15 * 60 * 1000);
 *   if (!allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", ... });
 */

import type { PrismaClient } from "@isysocial/db";
import { randomUUID } from "crypto";

export async function checkRateLimit(
  db: PrismaClient,
  key: string,
  maxCount: number,
  windowMs: number
): Promise<boolean> {
  const now = new Date();

  const existing = await db.rateLimitRecord.findUnique({ where: { key } });

  if (!existing || existing.expiresAt < now) {
    await db.rateLimitRecord.upsert({
      where: { key },
      create: {
        id: randomUUID(),
        key,
        count: 1,
        expiresAt: new Date(Date.now() + windowMs),
      },
      update: {
        count: 1,
        expiresAt: new Date(Date.now() + windowMs),
      },
    });
    return true;
  }

  if (existing.count >= maxCount) {
    return false;
  }

  await db.rateLimitRecord.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return true;
}

export async function cleanupExpiredRateLimits(db: PrismaClient): Promise<void> {
  await db.rateLimitRecord
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});
}
