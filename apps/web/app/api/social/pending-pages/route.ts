// ─── Pending Pages API ────────────────────────────────────────────────────────
// Returns the list of pending OAuth pages stored in the cookie (without tokens).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("pending_oauth_data")?.value;

  if (!raw) {
    return NextResponse.json(
      { error: "No hay datos de OAuth pendientes. El enlace puede haber expirado." },
      { status: 404 }
    );
  }

  try {
    const data = JSON.parse(raw);
    // Return pages without the accessToken for security
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
