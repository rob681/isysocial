// ─── Firebase Client SDK Initialization ─────────────────────────────────────
// Used for FCM (Firebase Cloud Messaging) push notification registration.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;

  if (!app && getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else if (!app) {
    app = getApps()[0];
  }
  return app;
}

export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  if (!messaging) {
    try {
      messaging = getMessaging(firebaseApp);
    } catch (err) {
      console.warn("[Firebase] Could not initialize messaging:", err);
      return null;
    }
  }
  return messaging;
}

/**
 * Request notification permission and get FCM token.
 * Returns the token string or null if permission denied / unavailable.
 */
export async function requestFCMToken(): Promise<string | null> {
  try {
    const msg = getFirebaseMessaging();
    if (!msg) return null;

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Notification permission denied");
      return null;
    }

    // Register the service worker and pass config
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    // Send config to service worker
    if (registration.active) {
      registration.active.postMessage({
        type: "FIREBASE_CONFIG",
        config: firebaseConfig,
      });
    }

    // Wait for SW to be ready
    await navigator.serviceWorker.ready;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("[FCM] No VAPID key configured");
      return null;
    }

    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (err) {
    console.error("[FCM] Error getting token:", err);
    return null;
  }
}

/**
 * Listen for foreground messages (when app tab is active).
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const msg = getFirebaseMessaging();
  if (!msg) return null;

  const unsubscribe = onMessage(msg, callback);
  return unsubscribe;
}
