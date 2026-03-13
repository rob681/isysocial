// ─── X (Twitter) Publisher ───────────────────────────────────────────────────
// Publishes tweets via X API v2
// Uses OAuth 2.0 Bearer token (User Auth)
// Free tier: 50 tweets/day write

import type { PublishContext, PublishResult } from "./index";
import { buildCaption } from "./index";

const X_API = "https://api.twitter.com";
const MAX_TWEET_LEN = 280;
const TRUNCATION_SUFFIX = "…";

export async function publishToX(ctx: PublishContext): Promise<PublishResult> {
  let text = buildCaption(ctx.copy, ctx.hashtags);

  // Truncate to 280 chars if needed
  if (text.length > MAX_TWEET_LEN) {
    text = text.slice(0, MAX_TWEET_LEN - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX;
  }

  try {
    if (ctx.mediaUrls.length > 0 && (ctx.postType === "IMAGE" || ctx.postType === "CAROUSEL")) {
      return await publishWithMedia(text, ctx.mediaUrls, ctx.accessToken);
    }

    return await publishText(text, ctx.accessToken);
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Error publicando en X" };
  }
}

// ── Text Tweet ────────────────────────────────────────────────────────────────
async function publishText(text: string, token: string): Promise<PublishResult> {
  const res = await fetch(`${X_API}/2/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();
  return handleXResponse(data, res.ok);
}

// ── Tweet with Media ──────────────────────────────────────────────────────────
async function publishWithMedia(
  text: string,
  imageUrls: string[],
  token: string
): Promise<PublishResult> {
  const mediaIds: string[] = [];

  // Upload up to 4 images (X limit)
  for (const url of imageUrls.slice(0, 4)) {
    const mediaId = await uploadMedia(url, token);
    mediaIds.push(mediaId);
  }

  const body: Record<string, any> = { text };
  if (mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  const res = await fetch(`${X_API}/2/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return handleXResponse(data, res.ok);
}

// ── Media Upload (v1.1 endpoint — still required for media) ──────────────────
async function uploadMedia(imageUrl: string, token: string): Promise<string> {
  // Download image from Supabase
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("No se pudo descargar la imagen para subir a X");
  const imgBuffer = await imgRes.arrayBuffer();
  const imgBase64 = Buffer.from(imgBuffer).toString("base64");

  // Upload via v1.1 media/upload (still required for OAuth 2.0 user context)
  const formData = new URLSearchParams();
  formData.append("media_data", imgBase64);

  const res = await fetch(`${X_API}/1.1/media/upload.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${token}`,
    },
    body: formData.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.media_id_string) {
    throw new Error(data?.error ?? data?.message ?? "Error subiendo media a X");
  }

  return data.media_id_string as string;
}

// ── Response Handler ──────────────────────────────────────────────────────────
function handleXResponse(data: any, ok: boolean): PublishResult {
  if (!ok || data?.errors || data?.error) {
    const errMsg =
      data?.errors?.[0]?.message ??
      data?.error ??
      data?.detail ??
      "Error publicando en X";
    return { success: false, error: errMsg };
  }

  const tweetId: string = data?.data?.id ?? "";
  const username: string = data?.data?.author_id ?? "";

  return {
    success: true,
    platformPostId: tweetId,
    platformUrl: tweetId
      ? `https://x.com/i/web/status/${tweetId}`
      : "https://x.com",
  };
}
