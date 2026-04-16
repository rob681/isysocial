// ─── Extract pending Meta accounts from database ──────────────────────────────
// This route handler reads the pending Meta accounts stored in SystemConfig
// by the OAuth callback, so the frontend selector page can display them.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isysocial/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = (session.user as any).agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: "No agency found" }, { status: 400 });
    }

    const pendingKey = `meta_pending_${agencyId}`;

    const record = await db.systemConfig.findUnique({
      where: { key: pendingKey },
    });

    if (!record) {
      return NextResponse.json(
        { error: "No pending Meta accounts found" },
        { status: 404 }
      );
    }

    const data = record.value as any;

    // Check if expired (15 minutes)
    if (Date.now() - data.timestamp > 15 * 60 * 1000) {
      // Clean up expired record
      await db.systemConfig.delete({ where: { key: pendingKey } }).catch(() => {});
      return NextResponse.json(
        { error: "Pending accounts expired" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[Meta Pending Accounts Error]", err);
    return NextResponse.json(
      { error: "Failed to read pending accounts" },
      { status: 400 }
    );
  }
}
