// ─── Agency-level Meta OAuth Authorize ──────────────────────────────────────
// Redirects admin users to Facebook's OAuth dialog to connect
// the agency's Meta account (Facebook Pages + Instagram Business).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const META_APP_ID = process.env.META_APP_ID;
  if (!META_APP_ID) {
    return NextResponse.json({ error: "META_APP_ID not configured" }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/api/social/meta/callback`;

  // State for CSRF protection — includes agency context
  const state = Buffer.from(
    JSON.stringify({
      agencyId: (session.user as any).agencyId,
      userId: (session.user as any).id,
      timestamp: Date.now(),
    })
  ).toString("base64url");

  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
    "pages_manage_posts",
    "pages_manage_metadata",
    "business_management",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
  ].join(",");

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
