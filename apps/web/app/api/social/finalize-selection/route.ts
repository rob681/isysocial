// ─── Finalize Page Selection ──────────────────────────────────────────────────
// After the user picks a page from the selection UI, this saves it to the DB.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";
import { uploadFile } from "@isysocial/api/src/lib/supabase-storage";

async function cacheProfilePic(remoteUrl: string, clientId: string, network: string): Promise<string> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return remoteUrl;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("gif") ? "gif" : "jpg";
    const path = `client-logos/${clientId}/${network}.${ext}`;
    const { url } = await uploadFile("isysocial-media", path, buffer, contentType);
    return url;
  } catch {
    return remoteUrl;
  }
}

const networkEnumMap: Record<string, string> = {
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
  linkedin: "LINKEDIN",
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

  const { clientId, network, pages, userAccessToken, accessToken: rootAccessToken } = oauthData;
  const networkEnum = networkEnumMap[network];

  if (!networkEnum) {
    return NextResponse.json({ error: "Red no soportada." }, { status: 400 });
  }

  // Find the selected page
  const selectedPage = (pages as any[]).find((p) => p.id === pageId);
  if (!selectedPage) {
    return NextResponse.json({ error: "Página no encontrada en la sesión OAuth." }, { status: 400 });
  }

  // For Facebook: always try to get a page access token.
  // Either use the one we already have, or try to fetch/exchange for one.
  const userToken = userAccessToken ?? rootAccessToken;
  let finalAccessToken = selectedPage.accessToken ?? null;

  if (network === "facebook") {
    // Try to get/refresh page access token for business pages
    if (!selectedPage.isPersonalProfile && userToken) {
      try {
        const pageTokenRes = await fetch(
          `https://graph.facebook.com/v20.0/${pageId}?fields=access_token&access_token=${userToken}`
        );
        const pageTokenData = await pageTokenRes.json();
        if (pageTokenData.access_token) {
          finalAccessToken = pageTokenData.access_token;
        }
      } catch {
        // Failed to fetch page token — will use userToken as fallback
      }
    }

    // For personal profile or if no page token available, use user token
    if (selectedPage.isPersonalProfile || !finalAccessToken) {
      finalAccessToken = userToken;
    }
  }

  try {
    let accountId = "";
    let accountName = "";
    let profilePic: string | null = null;
    // For Facebook, use finalAccessToken (resolved above). For other networks, use selectedPage.accessToken.
    let finalPageAccessToken: string | null = network === "facebook" ? finalAccessToken : selectedPage.accessToken;

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
    } else if (network === "linkedin") {
      // selectedPage.accountId = "urn:li:person:xxx" or "urn:li:organization:xxx"
      accountId = selectedPage.accountId ?? (
        selectedPage.type === "org"
          ? `urn:li:organization:${selectedPage.id}`
          : `urn:li:person:${selectedPage.id}`
      );
      accountName = selectedPage.name;
      profilePic = selectedPage.picture ?? null;
    }

    // For LinkedIn personal profile, use "LINKEDIN" as pageId (matches single-account flow)
    const pageIdForNetwork =
      network === "linkedin" && selectedPage.type === "person"
        ? "LINKEDIN"
        : selectedPage.id;

    // Remove any previous direct-OAuth entries for this client+network that don't have an
    // agencyAccountId — they were from a previous selection and should be replaced.
    await db.clientSocialNetwork.deleteMany({
      where: {
        clientId,
        network: networkEnum as any,
        agencyAccountId: null,
        NOT: { pageId: pageIdForNetwork },
      },
    });

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

    // Cache profile pic in Supabase Storage + update client logo
    if (profilePic) {
      const cachedPic = await cacheProfilePic(profilePic, clientId, network);
      // Update the stored profilePic with the permanent Supabase URL
      await db.clientSocialNetwork.updateMany({
        where: { clientId, network: networkEnum as any },
        data: { profilePic: cachedPic },
      });
      await db.clientProfile.updateMany({
        where: { id: clientId },
        data: { logoUrl: cachedPic },
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
