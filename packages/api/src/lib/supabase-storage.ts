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
): Promise<{ storagePath: string }> {
  const supabase = getClient();

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error("[Supabase Storage] Upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return { storagePath: `${bucket}/${path}` };
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

/**
 * Generate a signed download URL for a stored file.
 * Useful as fallback when the bucket is not set to public.
 * @param storagePath  Full path: "bucket/folder/file.ext"
 * @param expiresIn    Expiry in seconds (default 3600 = 1h)
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = getClient();

  const slashIdx = storagePath.indexOf("/");
  if (slashIdx === -1) {
    throw new Error(`Invalid storagePath: ${storagePath}`);
  }
  const bucket = storagePath.substring(0, slashIdx);
  const filePath = storagePath.substring(slashIdx + 1);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Check whether a bucket's public URL is reachable.
 * Returns a diagnostic object.
 */
export async function checkBucketPublicAccess(bucket: string): Promise<{
  uploadOk: boolean;
  publicAccessible: boolean;
  signedUrlWorks: boolean;
  publicUrl: string;
  fetchError?: string;
  uploadError?: string;
}> {
  const supabase = getClient();
  const testFile = `.health-check-${Date.now()}`;
  const testContent = Buffer.from(`health-check`);

  // Upload
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(testFile, testContent, { contentType: "text/plain", upsert: true });

  if (uploadError) {
    return {
      uploadOk: false,
      publicAccessible: false,
      signedUrlWorks: false,
      publicUrl: "",
      uploadError: uploadError.message,
    };
  }

  // Public URL check
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(testFile);

  let publicAccessible = false;
  let fetchError: string | undefined;
  try {
    const r = await fetch(publicUrl, { method: "HEAD" });
    publicAccessible = r.ok;
    if (!r.ok) fetchError = `HTTP ${r.status}`;
  } catch (err: any) {
    fetchError = err.message;
  }

  // Signed URL check
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(testFile, 60);

  // Cleanup
  await supabase.storage.from(bucket).remove([testFile]);

  return {
    uploadOk: true,
    publicAccessible,
    signedUrlWorks: !!signedData?.signedUrl && !signedError,
    publicUrl,
    fetchError,
  };
}

/**
 * Ensure a storage bucket exists, creating it (private) if not.
 * Uses the service role key, so it only works server-side.
 */
export async function ensureBucketExists(bucket: string): Promise<void> {
  const supabase = getClient();
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    // Can't list — skip creation, let upload fail with the real error
    console.warn("[Supabase Storage] Could not list buckets:", listErr.message);
    return;
  }
  const exists = buckets?.some((b) => b.name === bucket);
  if (!exists) {
    const { error: createErr } = await supabase.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: 52428800, // 50 MB
    });
    if (createErr && !createErr.message.includes("already exist")) {
      console.error("[Supabase Storage] Could not create bucket:", createErr.message);
    } else {
      console.log(`[Supabase Storage] Created bucket: ${bucket}`);
    }
  }
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
