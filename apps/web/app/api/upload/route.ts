import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, getSignedUrl, ensureBucketExists } from "@isysocial/api/src/lib/supabase-storage";

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

    // Generate a 1-hour signed URL for immediate display
    const signedUrl = await getSignedUrl(storagePath, 3600);

    return NextResponse.json({
      url: signedUrl,
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
