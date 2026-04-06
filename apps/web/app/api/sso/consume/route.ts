/**
 * SSO Token Consumer — Isysocial
 *
 * Verifies an SSO token from Isytask, finds the user,
 * creates a NextAuth session, and redirects to the dashboard.
 */

import { NextResponse } from "next/server";
import { db } from "@isysocial/db";
import { consumeSSOSession } from "@isysocial/api";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_sso_token", req.url));
  }

  try {
    const ssoSession = await consumeSSOSession(db, token);

    if (!ssoSession) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_or_expired_sso_token", req.url)
      );
    }

    // Find the organization and its Isysocial agency
    const org = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM shared.organizations WHERE id = $1`,
      ssoSession.organization_id
    );

    if (!org[0]?.isysocial_agency_id) {
      return NextResponse.redirect(
        new URL("/login?error=no_isysocial_account", req.url)
      );
    }

    const agencyId = org[0].isysocial_agency_id;

    // Find user in Isysocial by email + agency
    const user = await db.user.findFirst({
      where: {
        email: ssoSession.email,
        agencyId,
        isActive: true,
      },
      include: {
        clientProfile: { select: { id: true } },
        editorProfile: { select: { id: true, permissions: true } },
      },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL(
          `/login?error=no_isysocial_user&email=${encodeURIComponent(ssoSession.email)}`,
          req.url
        )
      );
    }

    // Create NextAuth-compatible JWT token
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.redirect(new URL("/login?error=server_config", req.url));
    }

    const jwtPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      agencyId: user.agencyId,
      clientProfileId: user.clientProfile?.id ?? null,
      editorProfileId: user.editorProfile?.id ?? null,
      permissions: user.editorProfile?.permissions ?? [],
      onboardingCompleted: user.onboardingCompleted,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    const sessionToken = jwt.sign(jwtPayload, secret, { algorithm: "HS256" });

    // Set the NextAuth session cookie
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
    const isSecure = baseUrl.startsWith("https");
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const cookieStore = await cookies();
    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    // Redirect to appropriate dashboard
    const dashboardMap: Record<string, string> = {
      SUPER_ADMIN: "/superadmin",
      ADMIN: "/admin",
      EDITOR: "/editor",
      CLIENTE: "/cliente",
    };

    const dashboardPath = dashboardMap[user.role] || "/admin";
    return NextResponse.redirect(new URL(dashboardPath, baseUrl));
  } catch (error) {
    console.error("[SSO] Failed to consume token:", error);
    return NextResponse.redirect(new URL("/login?error=sso_failed", req.url));
  }
}
