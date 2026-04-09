// ─── Server-Sent Events: Real-time event stream ───────────────────────────────
// Clients connect here and receive events whenever something changes in their agency.
// The server polls iso_realtime_events every 3 seconds for new rows.
// Clients use the events to invalidate tRPC query caches (not raw data).

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isysocial/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = session.user as any;
  const agencyId: string | undefined = user.agencyId;

  if (!agencyId) {
    return new Response("No agency", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      // Track the latest event we've seen (by createdAt timestamp)
      let lastSeenAt = new Date();

      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send an initial "connected" heartbeat
      send(JSON.stringify({ type: "CONNECTED", agencyId }));

      // Poll every 3 seconds for new events
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const events = await (db as any).realtimeEvent.findMany({
            where: {
              agencyId,
              createdAt: { gt: lastSeenAt },
            },
            orderBy: { createdAt: "asc" },
            take: 50, // safety cap
          });

          if (events.length > 0) {
            // Update cursor
            lastSeenAt = events[events.length - 1].createdAt;

            // Deduplicate: if multiple events of same type+postId, send once
            const seen = new Set<string>();
            for (const ev of events) {
              const key = `${ev.type}:${ev.postId ?? ""}:${ev.clientId ?? ""}`;
              if (seen.has(key)) continue;
              seen.add(key);

              send(
                JSON.stringify({
                  type: ev.type,
                  postId: ev.postId ?? undefined,
                  clientId: ev.clientId ?? undefined,
                  payload: ev.payload ?? undefined,
                })
              );
            }
          }
        } catch {
          // DB error — keep connection open, just skip this tick
        }
      }, 3000);

      // Heartbeat every 25s to keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
        }
      }, 25000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
