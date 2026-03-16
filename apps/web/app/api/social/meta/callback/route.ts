// ─── Agency-level Meta OAuth Callback ────────────────────────────────────────
// Handles the OAuth callback from Meta. Exchanges code for token,
// fetches all Facebook Pages + linked Instagram Business accounts,
// and stores them as AgencySocialAccount records.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";

const REDIRECT_BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
const META_GRAPH_VERSION = "v21.0";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  // ── Handle user denial ──────────────────────────────────────────────────────
  if (errorParam) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/configuracion?social=error&message=${encodeURIComponent("Permiso denegado por el usuario")}`
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/configuracion?social=error&message=${encodeURIComponent("Parámetros faltantes")}`
    );
  }

  // ── Decode & validate state ─────────────────────────────────────────────────
  let statePayload: { agencyId: string; userId: string; timestamp: number };
  try {
    statePayload = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/configuracion?social=error&message=${encodeURIComponent("Estado inválido")}`
    );
  }

  const { agencyId } = statePayload;
  if (!agencyId) {
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/configuracion?social=error&message=${encodeURIComponent("Agencia no encontrada en estado")}`
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || REDIRECT_BASE}/api/social/meta/callback`;
  const META_APP_ID = process.env.META_APP_ID ?? "";
  const META_APP_SECRET = process.env.META_APP_SECRET ?? "";

  try {
    console.log("[Meta OAuth] Starting callback. agencyId:", agencyId);
    console.log("[Meta OAuth] redirectUri:", redirectUri);

    // ── Step 1: Exchange code for short-lived access token ──────────────────
    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${tokenParams}`
    );
    const tokenData = await tokenRes.json();

    console.log("[Meta OAuth] Token exchange status:", tokenRes.status);
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Meta OAuth] Token exchange failed:", JSON.stringify(tokenData));
      throw new Error(tokenData.error?.message ?? "Error obteniendo token de Meta");
    }

    const shortLivedToken: string = tokenData.access_token;

    // ── Step 2: Exchange for long-lived token (60 days) ─────────────────────
    const llParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: shortLivedToken,
    });

    const llRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${llParams}`
    );
    const llData = await llRes.json();

    console.log("[Meta OAuth] Long-lived token status:", llRes.status);
    if (!llRes.ok || !llData.access_token) {
      console.error("[Meta OAuth] Long-lived token failed:", JSON.stringify(llData));
      throw new Error(llData.error?.message ?? "Error obteniendo token de larga duración");
    }

    const longLivedUserToken: string = llData.access_token;
    const userTokenExpiresAt = llData.expires_in
      ? new Date(Date.now() + llData.expires_in * 1000)
      : null;

    // ── Step 3: Fetch user's Facebook Pages ─────────────────────────────────
    const pagesRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/me/accounts?fields=id,name,access_token,picture{url}&limit=100&access_token=${longLivedUserToken}`
    );
    const pagesData = await pagesRes.json();

    console.log("[Meta OAuth] Pages fetch status:", pagesRes.status);
    if (!pagesRes.ok) {
      console.error("[Meta OAuth] Pages fetch failed:", JSON.stringify(pagesData));
      throw new Error(pagesData.error?.message ?? "Error obteniendo páginas de Facebook");
    }

    const pages = pagesData.data ?? [];
    console.log("[Meta OAuth] Found pages:", pages.length);
    if (pages.length === 0) {
      throw new Error(
        "No se encontraron páginas de Facebook. Asegúrate de que tu cuenta administra al menos una página."
      );
    }

    // ── Step 4: Fetch Instagram details for each page (WITHOUT storing yet) ────
    const accountsWithDetails = [];

    for (const page of pages) {
      const pageId: string = page.id;
      const pageName: string = page.name;
      const pageAccessToken: string = page.access_token;
      const pageProfilePic: string | undefined = page.picture?.data?.url;

      const facebookAccount = {
        id: pageId,
        name: pageName,
        network: "FACEBOOK" as const,
        accessToken: pageAccessToken,
        profilePic: pageProfilePic ?? null,
        tokenExpiresAt: userTokenExpiresAt?.toISOString() ?? null,
      };

      accountsWithDetails.push(facebookAccount);

      // ── Check for linked Instagram Business Account ──────────────────────
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
        );
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          const igAccountId: string = igData.instagram_business_account.id;

          // Fetch IG profile details
          const igProfileRes = await fetch(
            `https://graph.facebook.com/${META_GRAPH_VERSION}/${igAccountId}?fields=name,username,profile_picture_url&access_token=${pageAccessToken}`
          );
          const igProfile = await igProfileRes.json();

          const igName = igProfile.username
            ? `@${igProfile.username}`
            : igProfile.name ?? igAccountId;
          const igProfilePic: string | undefined = igProfile.profile_picture_url;

          const instagramAccount = {
            id: igAccountId,
            name: igName,
            network: "INSTAGRAM" as const,
            accessToken: pageAccessToken, // IG API uses the page token
            profilePic: igProfilePic ?? null,
            tokenExpiresAt: userTokenExpiresAt?.toISOString() ?? null,
            linkedPageId: pageId, // Track which FB page this IG is linked to
          };

          accountsWithDetails.push(instagramAccount);
          console.log(`[Meta OAuth] Found linked IG: ${igName} for page ${pageName}`);
        }
      } catch (err) {
        // If IG fetch fails for one page, continue with others
        console.warn(`[Meta OAuth] Could not fetch IG for page ${pageId}:`, err);
      }
    }

    // ── Step 5: Store accounts & tokens in cookie (15 min expires) ──────────
    // Serialize as JSON and store in secure HTTP-only cookie
    const cookieValue = Buffer.from(
      JSON.stringify({
        agencyId,
        accounts: accountsWithDetails,
        timestamp: Date.now(),
      })
    ).toString("base64url");

    const response = NextResponse.redirect(
      `${REDIRECT_BASE}/admin/configuracion/conectar-meta`
    );

    // Set secure HTTP-only cookie that expires in 15 minutes
    response.cookies.set("meta_pending_accounts", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    console.log(
      `[Meta OAuth] Success! Found ${accountsWithDetails.length} accounts. Redirecting to selector.`
    );

    return response;
  } catch (err: any) {
    console.error("[Meta OAuth Callback Error]", err);
    const msg = encodeURIComponent(err?.message ?? "Error desconocido");
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/configuracion?social=error&message=${msg}`
    );
  }
}
