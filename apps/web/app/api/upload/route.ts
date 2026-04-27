import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, getPublicUrlFromPath, ensureBucketExists } from "@isysocial/api/src/lib/supabase-storage";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Archivo demasiado grande (máximo 50 MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `${folder}/${filename}`;
    const bucket = "isysocial-media";

    // Auto-create bucket if it doesn't exist yet
    await ensureBucketExists(bucket);

    const { storagePath } = await uploadFile(bucket, path, buffer, file.type);

    // CRITICAL: return a PERMANENT public URL, not a 1-hour signed URL.
    //
    // History: this used to return `getSignedUrl(storagePath, 3600)`. That
    // URL was stored verbatim into `iso_post_media.fileUrl` and later sent
    // to Meta/LinkedIn/etc. when the post was published. As soon as the
    // hour elapsed (e.g. a scheduled post publishing the next morning), the
    // platform fetched the URL, got a Supabase 401, and returned errors
    // like "Missing or invalid image file" — cron retries every 5 min
    // never recovered because the stored URL stayed dead. The
    // `isysocial-media` bucket is public, so a public URL is correct AND
    // never expires.
    const publicUrl = getPublicUrlFromPath(storagePath);

    return NextResponse.json({
      url: publicUrl,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error("[Upload] Error:", error);
    // Return the actual error message so the client can show it
    const message = error?.message || "Error al subir archivo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
