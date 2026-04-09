"use client";

import { useRealtimeEvents } from "@/hooks/use-realtime-events";

/**
 * Mounts the real-time SSE connection for the dashboard.
 * Renders nothing — just activates the hook globally.
 */
export function RealtimeListener() {
  useRealtimeEvents();
  return null;
}
