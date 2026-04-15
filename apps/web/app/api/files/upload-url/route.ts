// ─── Signed Upload URL Generator ─────────────────────────────────────────────
// Returns a short-lived Supabase signed upload URL so the browser can upload
// files directly to Supabase Storage (bypasses Vercel's 4.5 MB body limit).
//
// Flow:
//   1. Client → GET /api/files/upload-url?folder=ideas&filename=photo.jpg
//   2. Server generates signed URL via service-role key
//   3. Client → PUT {signedUrl}  (raw file bytes, directly to Supabase — no Vercel)
//   4. Client uses storagePath to call the normal /api/files/signed-url for viewing

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ensureBucketExists,
  createSignedUploadUrl,
} from "@isysocial/api/src/lib/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "isysocial-media";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const folder = req.nextUrl.searchParams.get("folder") || "general";
  const filename = req.nextUrl.searchParams.get("filename") || "file";
  const ext = filename.split(".").pop() || "bin";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `${folder}/${uniqueName}`;

  try {
    await ensureBucketExists(BUCKET);
    const { signedUrl, path: uploadedPath } = await createSignedUploadUrl(
      BUCKET,
      filePath
    );
    const storagePath = `${BUCKET}/${uploadedPath}`;
    return NextResponse.json({ signedUrl, storagePath });
  } catch (err: any) {
    console.error("[upload-url] Error generating signed upload URL:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
