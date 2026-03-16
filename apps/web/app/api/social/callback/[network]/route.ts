// ─── OAuth Callback ───────────────────────────────────────────────────────────
// Handles the OAuth callback from social networks.
// Exchanges code for token, fetches profile info, stores in DB.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@isysocial/db";

type NetworkKey = "facebook" | "instagram" | "linkedin" | "x" | "tiktok";

const REDIRECT_BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// ── Token Exchange Config ─────────────────────────────────────────────────────
interface TokenConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
}

function getTokenConfig(network: NetworkKey): TokenConfig {
  switch (network) {
    case "facebook":
    case "instagram":
      return {
        tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
        clientId: process.env.META_APP_ID ?? "",
        clientSecret: process.env.META_APP_SECRET ?? "",
      };
    case "linkedin":
      return {
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
      };
    case "x":
      return {
        tokenUrl: "https://api.twitter.com/2/oauth2/token",
        clientId: process.env.X_CLIENT_ID ?? "",
        clientSecret: process.env.X_CLIENT_SECRET ?? "",
      };
    case "tiktok":
      return {
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
        clientId: process.env.TIKTOK_CLIENT_KEY ?? "",
        clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
      };
  }
}

// ── Map network string to SocialNetwork enum ──────────────────────────────────
const networkEnumMap: Record<NetworkKey, string> = {
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
  linkedin: "LINKEDIN",
  x: "X",
  tiktok: "TIKTOK",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { network: string } }
) {
  const networkKey = params.network.toLowerCase() as NetworkKey;
  const redirectUri = `${REDIRECT_BASE}/api/social/callback/${networkKey}`;

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  // Handle user denial
  if (errorParam) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/clientes?error=oauth_denied`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/clientes?error=missing_params`);
  }

  // Decode state
  let statePayload: { clientId: string; userId: string; network: string; ts: number };
  try {
    statePayload = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/clientes?error=invalid_state`);
  }

  const { clientId } = statePayload;
  const networkEnum = networkEnumMap[networkKey];

  if (!networkEnum) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/clientes?error=unsupported_network`);
  }

  const tokenConfig = getTokenConfig(networkKey);

  try {
    // ── Step 1: Exchange code for access token ────────────────────────────────
    let accessToken = "";
    let refreshToken: string | undefined;
    let tokenExpiresAt: Date | undefined;

    if (networkKey === "x") {
      // X uses Basic Auth
      const credentials = Buffer.from(
        `${tokenConfig.clientId}:${tokenConfig.clientSecret}`
      ).toString("base64");

      const tokenRes = await fetch(tokenConfig.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: "challenge",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description ?? "Error obteniendo token de X");
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      if (tokenData.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      }
    } else if (networkKey === "tiktok") {
      const tokenRes = await fetch(tokenConfig.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: tokenConfig.clientId,
          client_secret: tokenConfig.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error?.code !== "ok") {
        throw new Error(tokenData.error?.message ?? "Error obteniendo token de TikTok");
      }
      accessToken = tokenData.data.access_token;
      refreshToken = tokenData.data.refresh_token;
      if (tokenData.data.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenData.data.expires_in * 1000);
      }
    } else if (networkKey === "linkedin") {
      // LinkedIn uses POST with form body
      const tokenRes = await fetch(tokenConfig.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: tokenConfig.clientId,
          client_secret: tokenConfig.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error ?? tokenData.message ?? "Error obteniendo token de LinkedIn");
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      if (tokenData.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      }
    } else {
      // Facebook / Instagram — Graph API accepts GET with query params
      const queryParams = new URLSearchParams({
        client_id: tokenConfig.clientId,
        client_secret: tokenConfig.clientSecret,
        code,
        redirect_uri: redirectUri,
      });
      const tokenRes = await fetch(`${tokenConfig.tokenUrl}?${queryParams}`);
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error?.message ?? "Error obteniendo token de Meta");
      }
      accessToken = tokenData.access_token;
      if (tokenData.expires_in) {
        tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      }
    }

    // ── Step 2: Fetch profile info ────────────────────────────────────────────
    let accountId = "";
    let accountName = "";
    let profilePic: string | undefined;
    let pageId: string | undefined;
    let pageAccessToken: string | undefined;

    if (networkKey === "facebook") {
      // Get user's Pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`
      );
      const pagesData = await pagesRes.json();
      const page = pagesData.data?.[0];

      if (page) {
        pageId = page.id;
        accountId = page.id;
        accountName = page.name;
        pageAccessToken = page.access_token; // Use page token for publishing
      } else {
        // Fallback to user info
        const meRes = await fetch(
          `https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${accessToken}`
        );
        const meData = await meRes.json();
        accountId = meData.id;
        accountName = meData.name;
        profilePic = meData.picture?.data?.url;
      }
    } else if (networkKey === "instagram") {
      // Get Facebook Pages first, then linked IG accounts
      const pagesRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`
      );
      const pagesData = await pagesRes.json();

      for (const page of pagesData.data ?? []) {
        const igRes = await fetch(
          `https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
          const igId = igData.instagram_business_account.id;
          pageId = page.id;
          pageAccessToken = page.access_token;

          // Fetch IG profile
          const profileRes = await fetch(
            `https://graph.facebook.com/v20.0/${igId}?fields=name,username,profile_picture_url&access_token=${page.access_token}`
          );
          const profileData = await profileRes.json();

          accountId = igId;
          accountName = profileData.username
            ? `@${profileData.username}`
            : profileData.name ?? igId;
          profilePic = profileData.profile_picture_url;
          break;
        }
      }

      if (!accountId) {
        throw new Error(
          "No se encontró una cuenta de Instagram Business vinculada a tu página de Facebook."
        );
      }
    } else if (networkKey === "linkedin") {
      const meRes = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      accountId = `urn:li:person:${meData.id}`;
      accountName = [meData.localizedFirstName, meData.localizedLastName]
        .filter(Boolean)
        .join(" ");

      // Profile picture (best-effort)
      try {
        const picRes = await fetch(
          "https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~:playableStreams))",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const picData = await picRes.json();
        const elements =
          picData?.profilePicture?.["displayImage~"]?.elements;
        if (elements?.length) {
          profilePic =
            elements[elements.length - 1]?.identifiers?.[0]?.identifier;
        }
      } catch {
        // ignore
      }
    } else if (networkKey === "x") {
      const meRes = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meData = await meRes.json();
      accountId = meData.data?.id ?? "";
      accountName = meData.data?.username ? `@${meData.data.username}` : accountId;
      profilePic = meData.data?.profile_image_url;
    } else if (networkKey === "tiktok") {
      const meRes = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const meData = await meRes.json();
      accountId = meData.data?.user?.open_id ?? "";
      accountName = meData.data?.user?.display_name ?? accountId;
      profilePic = meData.data?.user?.avatar_url;
    }

    // ── Step 3: Upsert ClientSocialNetwork ────────────────────────────────────
    const pageIdForNetwork = pageId || networkEnum; // Use network as fallback
    await db.clientSocialNetwork.upsert({
      where: {
        clientId_network_pageId: {
          clientId,
          network: networkEnum as any,
          pageId: pageIdForNetwork,
        },
      },
      update: {
        accessToken: pageAccessToken ?? accessToken,
        refreshToken: refreshToken ?? null,
        tokenExpiresAt: tokenExpiresAt ?? null,
        accountId,
        pageId: pageIdForNetwork,
        accountName,
        profilePic: profilePic ?? null,
        isActive: true,
        assignedAt: new Date(),
        tokenScope: null,
      },
      create: {
        clientId,
        network: networkEnum as any,
        pageId: pageIdForNetwork,
        accessToken: pageAccessToken ?? accessToken,
        refreshToken: refreshToken ?? null,
        tokenExpiresAt: tokenExpiresAt ?? null,
        accountId,
        accountName,
        profilePic: profilePic ?? null,
        isActive: true,
      },
    });

    // ── Redirect back to client page ──────────────────────────────────────────
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/clientes/${clientId}?tab=redes&connected=${networkKey}`
    );
  } catch (err: any) {
    const msg = encodeURIComponent(err?.message ?? "Error desconocido");
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/clientes/${clientId}?tab=redes&error=${msg}`
    );
  }
}
