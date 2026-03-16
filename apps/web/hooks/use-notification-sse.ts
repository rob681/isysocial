"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";

/**
 * Connects to the SSE endpoint for real-time notification updates.
 * Falls back to polling every 15s if SSE is unavailable.
 */
export function useNotificationSSE() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    let closed = false;

    // Try SSE first
    try {
      const es = new EventSource("/api/notifications/sse");
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (closed) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "unread_count") {
            // Update the cached unread count without a network request
            utils.notifications.getUnreadCount.setData(undefined, { count: data.count });
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        // SSE failed — fall back to polling
        es.close();
        eventSourceRef.current = null;
        if (!closed) {
          startPolling();
        }
      };
    } catch {
      // EventSource not supported — fall back to polling
      startPolling();
    }

    function startPolling() {
      if (fallbackRef.current || closed) return;
      fallbackRef.current = setInterval(() => {
        if (!closed) {
          utils.notifications.getUnreadCount.invalidate();
        }
      }, 15_000);
    }

    return () => {
      closed = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current);
        fallbackRef.current = null;
      }
    };
  }, [session?.user, utils]);
}
