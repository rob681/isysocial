import { createClient } from "@supabase/supabase-js";

let _supabase: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Buckets: "isysocial-media" (post images/videos), "isysocial-assets" (logos/avatars)

export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<{ storagePath: string; url: string }> {
  const supabase = getClient();

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error("[Supabase Storage] Upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { storagePath: `${bucket}/${path}`, url: publicUrl };
}

export async function createSignedUploadUrl(
  bucket: string,
  path: string
): Promise<{ signedUrl: string; token: string; path: string; publicUrl: string }> {
  const supabase = getClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[Supabase Storage] Signed URL error:", error);
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    publicUrl,
  };
}

export async function deleteFile(storagePath: string): Promise<void> {
  const supabase = getClient();

  const slashIdx = storagePath.indexOf("/");
  if (slashIdx === -1) return;

  const bucket = storagePath.substring(0, slashIdx);
  const path = storagePath.substring(slashIdx + 1);

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error("[Supabase Storage] Delete error:", error);
  }
}
