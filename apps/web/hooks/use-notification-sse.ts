"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";

/**
 * Polls for new notifications every 30 seconds.
 * The topbar already polls every 15s so this is just for global refresh.
 * In Phase 2 this can be upgraded to SSE.
 */
export function useNotificationSSE() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Poll every 30 seconds
    intervalRef.current = setInterval(() => {
      utils.notifications.getUnreadCount.invalidate();
    }, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.user, utils]);
}
