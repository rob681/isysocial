// ─── Profile Picture Caching ──────────────────────────────────────────────────
// Profile picture URLs from Meta/LinkedIn/TikTok CDNs expire after a few days
// to weeks (signed URLs with auth tokens). To keep avatars stable inside
// Isysocial, we download the remote image once and re-host it in our own
// Supabase Storage bucket, returning a permanent public URL.
//
// The bucket `isysocial-media` is public, so `getPublicUrl` returns a URL
// that never expires. We append `?v=<timestamp>` so when a refresh fetches a
// changed avatar, browsers and Supabase's CDN serve the new copy immediately
// instead of the stale cached one.
//
// History note: an earlier version used a 24-hour signed URL, which broke
// avatars the next day. Don't go back to that.

import { uploadFile, getPublicUrlFromPath } from "./supabase-storage";

/**
 * Downloads a profile picture from a remote URL and re-hosts it in Supabase
 * Storage. Returns a permanent public URL on success, or the original URL
 * as a fallback when caching fails (so the UI still shows *something*).
 *
 * Uses a deterministic path per (clientId, network), so re-caching the same
 * client overwrites the previous file — no garbage accumulation.
 */
export async function cacheProfilePic(
  remoteUrl: string,
  clientId: string,
  network: string
): Promise<string> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return remoteUrl;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";
    const path = `client-logos/${clientId}/${network.toLowerCase()}.${ext}`;
    const { storagePath } = await uploadFile(
      "isysocial-media",
      path,
      buffer,
      contentType
    );
    // Permanent public URL + cache-buster so a refreshed avatar invalidates
    // the previous CDN copy on the next render.
    return `${getPublicUrlFromPath(storagePath)}?v=${Date.now()}`;
  } catch (err) {
    console.warn(
      "[cacheProfilePic] Failed to cache, using original URL:",
      err
    );
    return remoteUrl;
  }
}

/**
 * Returns true when a stored `profilePic` URL points to our own Supabase
 * bucket — i.e. it's already cached and stable. Useful for skipping
 * unnecessary re-caching when the upstream URL hasn't changed.
 */
export function isCachedProfilePic(url: string | null | undefined): boolean {
  if (!url) return false;
  // Supabase public storage URLs look like:
  //   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  return url.includes("/storage/v1/object/public/isysocial-media/");
}
