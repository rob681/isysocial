// ─── Finalize Page Selection ──────────────────────────────────────────────────
// After the user picks a page from the selection UI, this saves it to the DB.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";

const networkEnumMap: Record<string, string> = {
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pageId, token } = body;

  if (!token) {
    return NextResponse.json(
      { error: "No hay datos de OAuth pendientes. El enlace puede haber expirado." },
      { status: 404 }
    );
  }

  if (!pageId) {
    return NextResponse.json({ error: "pageId es requerido." }, { status: 400 });
  }

  // Read from DB
  const record = await db.systemConfig.findUnique({
    where: { key: `pending_oauth_${token}` },
  });

  if (!record) {
    return NextResponse.json(
      { error: "No hay datos de OAuth pendientes. El enlace puede haber expirado." },
      { status: 404 }
    );
  }

  let oauthData: any;
  try {
    oauthData = JSON.parse(record.value as string);
  } catch {
    return NextResponse.json({ error: "Datos de OAuth inválidos." }, { status: 500 });
  }

  // Check expiration
  if (oauthData.expiresAt && Date.now() > oauthData.expiresAt) {
    await db.systemConfig.delete({ where: { key: `pending_oauth_${token}` } }).catch(() => {});
    return NextResponse.json({ error: "Los datos de OAuth han expirado." }, { status: 410 });
  }

  const { clientId, network, pages } = oauthData;
  const networkEnum = networkEnumMap[network];

  if (!networkEnum) {
    return NextResponse.json({ error: "Red no soportada." }, { status: 400 });
  }

  // Find the selected page
  const selectedPage = (pages as any[]).find((p) => p.id === pageId);
  if (!selectedPage) {
    return NextResponse.json({ error: "Página no encontrada en la sesión OAuth." }, { status: 400 });
  }

  try {
    let accountId = "";
    let accountName = "";
    let profilePic: string | null = null;
    let finalPageAccessToken = selectedPage.accessToken;

    if (network === "facebook") {
      accountId = selectedPage.id;
      accountName = selectedPage.name;
      profilePic = selectedPage.picture ?? null;
    } else if (network === "instagram") {
      accountId = selectedPage.igId;
      accountName = selectedPage.igUsername?.startsWith("@")
        ? selectedPage.igUsername
        : `@${selectedPage.igUsername}`;
      profilePic = selectedPage.igProfilePic ?? null;
    }

    const pageIdForNetwork = selectedPage.id;

    await db.clientSocialNetwork.upsert({
      where: {
        clientId_network_pageId: {
          clientId,
          network: networkEnum as any,
          pageId: pageIdForNetwork,
        },
      },
      update: {
        accessToken: finalPageAccessToken,
        refreshToken: null,
        tokenExpiresAt: null,
        accountId,
        pageId: pageIdForNetwork,
        accountName,
        profilePic,
        isActive: true,
        assignedAt: new Date(),
        tokenScope: null,
      },
      create: {
        clientId,
        network: networkEnum as any,
        pageId: pageIdForNetwork,
        accessToken: finalPageAccessToken,
        refreshToken: null,
        tokenExpiresAt: null,
        accountId,
        accountName,
        profilePic,
        isActive: true,
      },
    });

    // Update client logo if not already set
    if (profilePic) {
      await db.clientProfile.updateMany({
        where: {
          id: clientId,
          OR: [{ logoUrl: null }, { logoUrl: "" }],
        },
        data: { logoUrl: profilePic },
      });
    }

    // Clean up the pending data
    await db.systemConfig.delete({ where: { key: `pending_oauth_${token}` } }).catch(() => {});

    return NextResponse.json({ success: true, clientId, network });
  } catch (err: any) {
    console.error("[finalize-selection] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Error al guardar la conexión." },
      { status: 500 }
    );
  }
}
