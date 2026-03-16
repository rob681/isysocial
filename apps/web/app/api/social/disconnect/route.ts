// ─── Disconnect Social Network ────────────────────────────────────────────────
// POST /api/social/disconnect
// Body: { clientId: string, network: string }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isysocial/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(userRole ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { clientId?: string; network?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { clientId, network } = body;
  if (!clientId || !network) {
    return NextResponse.json({ error: "clientId y network son requeridos" }, { status: 400 });
  }

  // Verify client belongs to the admin's agency
  const agencyId = (session.user as any).agencyId as string | undefined;
  if (agencyId) {
    const client = await db.clientProfile.findFirst({
      where: { id: clientId, agencyId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
  }

  // Clear OAuth tokens but keep the record
  const updated = await db.clientSocialNetwork.updateMany({
    where: { clientId, network: network as any },
    data: {
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      accountId: null,
      pageId: null,
      accountName: null,
      profilePic: null,
      isActive: false,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Red social no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
