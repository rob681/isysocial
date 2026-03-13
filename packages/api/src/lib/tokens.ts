import crypto from "crypto";
import type { PrismaClient } from "@isysocial/db";

const TOKEN_EXPIRY = {
  INVITATION: 48 * 60 * 60 * 1000, // 48 hours
  PASSWORD_RESET: 1 * 60 * 60 * 1000, // 1 hour
} as const;

type TokenType = "INVITATION" | "PASSWORD_RESET";

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createToken(
  db: PrismaClient,
  userId: string,
  type: TokenType
): Promise<string> {
  await db.token.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  const tokenString = generateSecureToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY[type]);

  await db.token.create({
    data: { token: tokenString, type, userId, expiresAt },
  });

  if (Math.random() < 0.1) {
    await db.token
      .deleteMany({
        where: {
          expiresAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      })
      .catch(() => {});
  }

  return tokenString;
}

export async function validateToken(
  db: PrismaClient,
  tokenString: string,
  expectedType: TokenType
) {
  const token = await db.token.findUnique({
    where: { token: tokenString },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!token) return null;
  if (token.type !== expectedType) return null;
  if (token.usedAt !== null) return null;
  if (token.expiresAt < new Date()) return null;

  return token;
}
