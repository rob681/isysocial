// ─── Firebase Cloud Messaging (Server-Side) ─────────────────────────────────
// Uses firebase-admin to send push notifications to registered devices.

import type { PrismaClient } from "@isysocial/db";

let adminApp: any = null;

async function getFirebaseAdmin() {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    const admin = await import("firebase-admin");

    if (admin.apps.length === 0) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      adminApp = admin.apps[0];
    }
    return adminApp;
  } catch (err) {
    console.error("[FCM] Failed to initialize firebase-admin:", err);
    return null;
  }
}

interface SendPushParams {
  db: PrismaClient;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send push notification to a user via FCM.
 * Fire-and-forget — errors are logged but don't throw.
 */
export async function sendPushNotification({
  db,
  userId,
  title,
  body,
  data = {},
}: SendPushParams): Promise<void> {
  try {
    const app = await getFirebaseAdmin();
    if (!app) return;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true },
    });

    if (!user || user.fcmTokens.length === 0) return;

    const admin = await import("firebase-admin");
    const messaging = admin.messaging();

    // Send to all registered tokens
    const message = {
      notification: { title, body },
      data,
      tokens: user.fcmTokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (resp.error) {
          const code = resp.error.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(user.fcmTokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        // Remove invalid tokens from user
        const validTokens = user.fcmTokens.filter((t) => !invalidTokens.includes(t));
        await db.user.update({
          where: { id: userId },
          data: { fcmTokens: validTokens },
        });
        console.log(`[FCM] Removed ${invalidTokens.length} invalid token(s) for user ${userId}`);
      }
    }
  } catch (err) {
    console.error("[FCM] Error sending push:", err);
  }
}

/**
 * Send push notification to multiple users.
 */
export async function sendPushToUsers({
  db,
  userIds,
  title,
  body,
  data = {},
}: {
  db: PrismaClient;
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) => sendPushNotification({ db, userId, title, body, data }))
  );
}
