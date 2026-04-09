"use client";

// ─── useRealtimeEvents ────────────────────────────────────────────────────────
// Connects to /api/events/sse and reacts to server-pushed events by
// invalidating the relevant tRPC queries. This gives "real-time" UX:
// when any user changes a post, all connected users see the update within ~3s.

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";

export type RealtimeEventType =
  | "CONNECTED"
  | "POST_CREATED"
  | "POST_UPDATED"
  | "POST_STATUS_CHANGED"
  | "COMMENT_ADDED"
  | "POST_PUBLISHED"
  | "CALENDAR_UPDATED"
  | "IDEA_UPDATED";

interface RealtimeEvent {
  type: RealtimeEventType;
  postId?: string;
  clientId?: string;
  payload?: Record<string, unknown>;
}

export function useRealtimeEvents() {
  const { data: session, status } = useSession();
  const utils = trpc.useUtils();
  const esRef = useRef<EventSource | null>(null);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    function connect() {
      // Clean up existing connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource("/api/events/sse");
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const event: RealtimeEvent = JSON.parse(e.data);
          handleEvent(event);
        } catch {
          // malformed event, ignore
        }
      };

      es.onopen = () => {
        retryCount.current = 0;
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;

        // Exponential backoff: 3s, 6s, 12s, 24s, max 60s
        const delay = Math.min(3000 * Math.pow(2, retryCount.current), 60000);
        retryCount.current += 1;
        retryTimeout.current = setTimeout(connect, delay);
      };
    }

    function handleEvent(event: RealtimeEvent) {
      switch (event.type) {
        case "POST_CREATED":
          // Invalidate post list + calendar (new post appeared)
          utils.posts.list.invalidate();
          utils.calendar.getMonth.invalidate();
          utils.calendar.getWeek.invalidate();
          utils.calendar.getDay.invalidate();
          break;

        case "POST_UPDATED":
          // Targeted: only refetch the specific post detail
          if (event.postId) {
            utils.posts.get.invalidate({ id: event.postId });
          }
          utils.posts.list.invalidate();
          break;

        case "POST_STATUS_CHANGED":
          // Status change affects list views + detail + calendar
          if (event.postId) {
            utils.posts.get.invalidate({ id: event.postId });
          }
          utils.posts.list.invalidate();
          utils.calendar.getMonth.invalidate();
          utils.calendar.getWeek.invalidate();
          utils.calendar.getDay.invalidate();
          break;

        case "COMMENT_ADDED":
          // Only the specific post detail needs refreshing
          if (event.postId) {
            utils.posts.get.invalidate({ id: event.postId });
          }
          break;

        case "POST_PUBLISHED":
          // Published = status changed + calendar updated
          if (event.postId) {
            utils.posts.get.invalidate({ id: event.postId });
          }
          utils.posts.list.invalidate();
          utils.calendar.getMonth.invalidate();
          utils.calendar.getWeek.invalidate();
          utils.calendar.getDay.invalidate();
          break;

        case "CALENDAR_UPDATED":
          utils.calendar.getMonth.invalidate();
          utils.calendar.getWeek.invalidate();
          utils.calendar.getDay.invalidate();
          break;

        case "IDEA_UPDATED":
          // Invalidate ideas list if the procedure exists
          try {
            (utils as any).ideas?.list?.invalidate?.();
          } catch {
            // ideas router may not exist yet
          }
          break;

        case "CONNECTED":
          // Initial connection — do a fresh load of current views
          utils.posts.list.invalidate();
          utils.calendar.getMonth.invalidate();
          break;

        default:
          break;
      }
    }

    connect();

    return () => {
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [status, session]);
}
