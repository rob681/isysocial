// ─── Extract pending Meta accounts from cookie ───────────────────────────────
// This route handler decodes the meta_pending_accounts cookie and returns
// it as JSON so the frontend selector page can read it.
// The cookie is HTTP-only, so we need this route to bridge to the client.

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cookieValue = req.cookies.get("meta_pending_accounts")?.value;

    if (!cookieValue) {
      return NextResponse.json(
        { error: "No pending Meta accounts found" },
        { status: 404 }
      );
    }

    // Decode the cookie
    const decodedData = JSON.parse(
      Buffer.from(cookieValue, "base64url").toString()
    );

    // Return the data
    return NextResponse.json(decodedData);
  } catch (err) {
    console.error("[Meta Pending Accounts Error]", err);
    return NextResponse.json(
      { error: "Failed to decode pending accounts" },
      { status: 400 }
    );
  }
}
