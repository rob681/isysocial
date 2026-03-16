// ─── Server-Sent Events endpoint for real-time notification updates ──────────
// Clients connect and receive a "ping" with the unread count every few seconds.
// This replaces the polling approach for active tabs.

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

  const userId = (session.user as any).id as string;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send initial count
      try {
        const count = await db.notification.count({
          where: { userId, isRead: false },
        });
        send(JSON.stringify({ type: "unread_count", count }));
      } catch {
        // ignore
      }

      // Poll the database every 5 seconds and send updates
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const count = await db.notification.count({
            where: { userId, isRead: false },
          });
          send(JSON.stringify({ type: "unread_count", count }));
        } catch {
          // Connection likely closed
          closed = true;
          clearInterval(interval);
        }
      }, 5000);

      // Clean up when the client disconnects
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
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
