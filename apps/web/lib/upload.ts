// ─── Client-side file upload utility ─────────────────────────────────────────
// Uploads files directly from the browser to Supabase Storage using signed URLs.
// This bypasses Vercel's serverless body-size limit (4.5 MB) entirely.
//
// Flow:
//   1. GET /api/files/upload-url  → server creates signed URL (tiny request)
//   2. PUT {signedUrl}            → browser uploads directly to Supabase (no limit)
//   3. GET /api/files/signed-url  → server generates a 1-hour viewing URL

export interface UploadResult {
  url: string;           // 1-hour signed viewing URL
  storagePath: string;   // "isysocial-media/folder/file.ext" — save this to DB
  fileName: string;
  mimeType: string;
}

export async function uploadFileToStorage(
  file: File,
  folder = "general"
): Promise<UploadResult> {
  // ── Step 1: Get a signed upload URL from our server ────────────────────────
  const urlRes = await fetch(
    `/api/files/upload-url?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(file.name)}`
  );
  if (!urlRes.ok) {
    const errData = await urlRes.json().catch(() => ({}));
    throw new Error(errData.error || "No se pudo obtener la URL de subida");
  }
  const { signedUrl, storagePath } = (await urlRes.json()) as {
    signedUrl: string;
    storagePath: string;
  };

  // ── Step 2: Upload the file directly to Supabase (bypasses Vercel) ────────
  // Supabase signed upload URLs accept a PUT with the raw file as body.
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(
      `Error al subir al almacenamiento: HTTP ${uploadRes.status}${errText ? ` — ${errText}` : ""}`
    );
  }

  // ── Step 3: Generate a short-lived viewing URL ─────────────────────────────
  const viewRes = await fetch(
    `/api/files/signed-url?path=${encodeURIComponent(storagePath)}`
  );
  if (!viewRes.ok) {
    // Upload succeeded but can't get viewing URL — return storagePath so caller
    // can retry later; don't fail the whole operation.
    console.warn("[upload] File uploaded but could not generate viewing URL");
    return { url: "", storagePath, fileName: file.name, mimeType: file.type };
  }
  const { url } = (await viewRes.json()) as { url: string };

  return { url, storagePath, fileName: file.name, mimeType: file.type };
}
