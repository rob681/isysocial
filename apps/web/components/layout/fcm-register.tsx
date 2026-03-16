"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { requestFCMToken, onForegroundMessage } from "@/lib/firebase";

/**
 * Registers the FCM token on mount and listens for foreground messages.
 * Renders nothing — just runs as a side-effect component.
 */
export function FCMRegister() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const registeredRef = useRef(false);

  const registerToken = trpc.notifications.registerFCMToken.useMutation();

  useEffect(() => {
    if (!session?.user || registeredRef.current) return;

    // Only attempt FCM registration if Firebase env vars are configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;

    const register = async () => {
      try {
        const token = await requestFCMToken();
        if (token) {
          registerToken.mutate({ token });
          registeredRef.current = true;
        }
      } catch (err) {
        console.warn("[FCM Register] Could not register:", err);
      }
    };

    // Delay slightly to not block initial render
    const timer = setTimeout(register, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  // Listen for foreground messages → refresh notification count
  useEffect(() => {
    if (!session?.user) return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;

    const unsubscribe = onForegroundMessage((payload) => {
      // Invalidate the unread count so the bell updates
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.list.invalidate();

      // Show a browser notification if the page is visible but not focused
      if (document.visibilityState === "visible" && payload.notification) {
        // The topbar will auto-refresh, no native notification needed
        // when the user is actively looking at the app
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [session?.user, utils]);

  return null;
}
