// ─── OAuth Initiation ─────────────────────────────────────────────────────────
// Redirects the user to the social network's OAuth authorization page.
// Usage: GET /api/social/connect/{network}?clientId={clientId}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type NetworkKey = "facebook" | "instagram" | "linkedin" | "x" | "tiktok";

const REDIRECT_BASE = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").trim();

// ── OAuth Config per network ──────────────────────────────────────────────────
const oauthConfig: Record<
  NetworkKey,
  { authUrl: string; scopes: string; clientId: string; extras?: Record<string, string> }
> = {
  facebook: {
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    // Using instagram_manage_insights to access Instagram Business
    // Account insights via the Graph API (/{ig-user-id}/insights endpoint).
    scopes:
      "pages_manage_posts,pages_read_engagement,instagram_content_publish,instagram_basic,pages_show_list,pages_manage_metadata,instagram_manage_insights,pages_read_user_content,business_management",
    clientId: (process.env.META_APP_ID ?? "").trim(),
  },
  instagram: {
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    scopes:
      "pages_manage_posts,pages_read_engagement,instagram_content_publish,instagram_basic,pages_show_list,pages_manage_metadata,instagram_manage_insights,pages_read_user_content,business_management",
    clientId: (process.env.META_APP_ID ?? "").trim(),
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    scopes: "openid profile email w_member_social r_organization_social w_organization_social",
    clientId: (process.env.LINKEDIN_CLIENT_ID ?? "").trim(),
  },
  x: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    scopes: "tweet.write tweet.read users.read offline.access",
    clientId: (process.env.X_CLIENT_ID ?? "").trim(),
    extras: { code_challenge: "challenge", code_challenge_method: "plain" },
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    // TikTok v2 OAuth uses COMMA-SEPARATED scopes (per Login Kit docs:
    // "A comma (,) separated string of authorization scope(s)").
    //
    // Scopes approved for our app (Live in production since Apr 17, 2026):
    //   - user.info.basic → read open_id, display_name, avatar_url
    //   - video.publish   → Direct Post (publish directly to user's profile)
    //   - video.upload    → upload as draft for creator to post from the app
    //
    // NOTE: even with video.publish approved, Direct Post is still restricted
    // to SELF_ONLY + private-account-only until we clear the separate
    // "Direct Post audit" from the Developer Portal. See tiktok.ts publisher
    // for the privacy_level logic.
    scopes: "user.info.basic,video.publish,video.upload",
    clientId: (process.env.TIKTOK_CLIENT_KEY ?? "").trim(),
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: { network: string } }
) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(userRole ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const networkKey = params.network.toLowerCase() as NetworkKey;
  const config = oauthConfig[networkKey];

  if (!config) {
    return NextResponse.json({ error: `Red no soportada: ${params.network}` }, { status: 400 });
  }

  if (!config.clientId) {
    return NextResponse.json(
      { error: `Variables de entorno para ${params.network} no configuradas` },
      { status: 500 }
    );
  }

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  // CSRF state: base64(JSON)
  const statePayload = {
    clientId,
    userId: (session.user as any).id as string,
    network: networkKey,
    ts: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  const redirectUri = `${REDIRECT_BASE}/api/social/callback/${networkKey}`;

  const authUrl = new URL(config.authUrl);
  if (networkKey === "tiktok") {
    authUrl.searchParams.set("client_key", config.clientId);
  } else {
    authUrl.searchParams.set("client_id", config.clientId);
  }
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    networkKey === "x" ? config.scopes : config.scopes
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  // X uses space-separated scopes but requires them in the URL differently
  if (networkKey === "x") {
    authUrl.searchParams.set("scope", config.scopes);
  }

  // For Meta (Facebook/Instagram): force page selector to always appear,
  // even if permissions were previously granted. This ensures all available pages
  // are shown in the authorization dialog, not just previously authorized ones.
  if (networkKey === "facebook" || networkKey === "instagram") {
    authUrl.searchParams.set("auth_type", "rerequest");
  }

  // Extra params (e.g. PKCE for X)
  if (config.extras) {
    for (const [key, val] of Object.entries(config.extras)) {
      authUrl.searchParams.set(key, val);
    }
  }

  return NextResponse.redirect(authUrl.toString());
}
