/**
 * SSO Token Generator — Isysocial
 *
 * Creates a short-lived SSO token that allows the user to authenticate
 * in Isytask without re-entering credentials.
 *
 * Flow:
 * 1. User clicks "Go to Isytask" in Isysocial
 * 2. Frontend calls POST /api/sso/generate
 * 3. Returns a one-time token + redirect URL
 * 4. User is redirected to Isytask's /api/sso/consume?token=xxx
 * 5. Isytask verifies the token, creates a session, and redirects to dashboard
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@isysocial/db";
import {
  createSSOSession,
  getOrCreateOrganization,
} from "@isysocial/api";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { email, name, role, agencyId, avatarUrl } = session.user as any;

  if (!agencyId) {
    return NextResponse.json({ error: "No agency context" }, { status: 400 });
  }

  try {
    // Get agency name for organization lookup
    const agency = await db.agency.findUniqueOrThrow({
      where: { id: agencyId },
      select: { name: true },
    });

    const org = await getOrCreateOrganization(db, "ISYSOCIAL", agencyId, agency.name);

    // Create short-lived SSO token (5 minutes)
    const ssoSession = await createSSOSession(db, {
      organizationId: org.id,
      email,
      sourceApp: "ISYSOCIAL",
      userName: name,
      userRole: role,
      userAvatarUrl: avatarUrl,
      ttlMinutes: 5,
    });

    const isytaskUrl = process.env.ISYTASK_APP_URL || "https://isytask-web.vercel.app";
    const redirectUrl = `${isytaskUrl}/api/sso/consume?token=${ssoSession.token}`;

    return NextResponse.json({ redirectUrl, token: ssoSession.token });
  } catch (error) {
    console.error("[SSO] Failed to generate token:", error);
    return NextResponse.json({ error: "Failed to generate SSO token" }, { status: 500 });
  }
}
