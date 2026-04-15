// ─── Signed URL Generator ────────────────────────────────────────────────────
// Returns a short-lived signed URL for a Supabase Storage file.
// Used as fallback when the public bucket URL is inaccessible.
// Usage: GET /api/files/signed-url?path=isysocial-media/folder/file.jpg

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSignedUrl } from "@isysocial/api/src/lib/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Must be authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storagePath = req.nextUrl.searchParams.get("path");
  if (!storagePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  try {
    const url = await getSignedUrl(storagePath, 3600);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[signed-url] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
