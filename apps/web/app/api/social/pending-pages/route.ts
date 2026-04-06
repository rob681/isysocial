// ─── Pending Pages API ────────────────────────────────────────────────────────
// Returns pending OAuth pages stored in DB (via SystemConfig) without tokens.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "No hay datos de OAuth pendientes. El enlace puede haber expirado." },
      { status: 404 }
    );
  }

  try {
    const record = await db.systemConfig.findUnique({
      where: { key: `pending_oauth_${token}` },
    });

    if (!record) {
      return NextResponse.json(
        { error: "No hay datos de OAuth pendientes. El enlace puede haber expirado." },
        { status: 404 }
      );
    }

    const data = JSON.parse(record.value as string);

    // Check expiration
    if (data.expiresAt && Date.now() > data.expiresAt) {
      await db.systemConfig.delete({ where: { key: `pending_oauth_${token}` } }).catch(() => {});
      return NextResponse.json(
        { error: "Los datos de OAuth han expirado. Intenta conectar de nuevo." },
        { status: 410 }
      );
    }

    // Return pages without accessTokens for security
    const safePages = (data.pages ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      picture: p.picture ?? null,
      igId: p.igId ?? null,
      igUsername: p.igUsername ?? null,
      igProfilePic: p.igProfilePic ?? null,
    }));

    return NextResponse.json({
      clientId: data.clientId,
      network: data.network,
      pages: safePages,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al leer los datos de OAuth." },
      { status: 500 }
    );
  }
}
