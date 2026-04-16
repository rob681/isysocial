// ─── Facebook Publisher ───────────────────────────────────────────────────────
// Publishes posts to a Facebook Page via Meta Graph API v20.0

import type { PublishContext, PublishResult } from "./index";
import { buildCaption } from "./index";

/** Checks if a Meta API error response indicates a revoked / expired token */
function isTokenExpiredError(data: any): boolean {
  return (
    data?.error?.code === 190 ||
    data?.error?.message?.includes("session has been invalidated") ||
    data?.error?.message?.includes("Error validating access token")
  );
}

function tokenExpiredResult(context: string): PublishResult {
  return {
    success: false,
    error: `TOKEN_EXPIRED: ${context}`,
    requiresReconnect: true,
  };
}

const GRAPH = "https://graph.facebook.com/v20.0";

export async function publishToFacebook(ctx: PublishContext): Promise<PublishResult> {
  const pageId = ctx.pageId ?? ctx.accountId;
  const caption = buildCaption(ctx.copy, ctx.hashtags);

  try {
    // Multiple images → carousel (regardless of postType)
    if (ctx.mediaUrls.length > 1) {
      return await publishCarousel(pageId, caption, ctx.mediaUrls, ctx.accessToken);
    }

    if ((ctx.postType === "IMAGE" || ctx.postType === "STORY") && ctx.mediaUrls.length === 1) {
      return await publishSinglePhoto(pageId, caption, ctx.mediaUrls[0]!, ctx.accessToken);
    }

    if ((ctx.postType === "VIDEO" || ctx.postType === "REEL") && ctx.mediaUrls[0]) {
      return await publishVideo(pageId, caption, ctx.mediaUrls[0], ctx.accessToken);
    }

    // TEXT / default — if there's a single image but postType is not IMAGE, still publish as photo
    if (ctx.mediaUrls.length === 1) {
      return await publishSinglePhoto(pageId, caption, ctx.mediaUrls[0]!, ctx.accessToken);
    }

    return await publishFeed(pageId, caption, ctx.accessToken);
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Error publicando en Facebook" };
  }
}

// ── Single Photo ──────────────────────────────────────────────────────────────
async function publishSinglePhoto(
  pageId: string,
  caption: string,
  url: string,
  token: string
): Promise<PublishResult> {
  const res = await fetch(`${GRAPH}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, caption, access_token: token }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    if (isTokenExpiredError(data)) return tokenExpiredResult("publishSinglePhoto");
    return { success: false, error: data.error?.message ?? "Error al publicar foto en Facebook" };
  }

  // Returns { post_id: "pageId_postId" } or { id: "photoId" }
  const postId: string = data.post_id ?? data.id;
  return {
    success: true,
    platformPostId: postId,
    platformUrl: `https://www.facebook.com/${postId.replace("_", "/posts/")}`,
  };
}

// ── Carousel (multiple photos → feed post) ────────────────────────────────────
async function publishCarousel(
  pageId: string,
  caption: string,
  urls: string[],
  token: string
): Promise<PublishResult> {
  // Step 1: Upload each photo as un-published
  const photoIds: string[] = [];
  for (const url of urls) {
    const res = await fetch(`${GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, published: false, access_token: token }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      if (isTokenExpiredError(data)) return tokenExpiredResult("publishCarousel:upload");
      return { success: false, error: data.error?.message ?? "Error subiendo foto del carrusel" };
    }
    photoIds.push(data.id);
  }

  // Step 2: Create feed post with attached_media
  const res = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption,
      attached_media: photoIds.map((id) => ({ media_fbid: id })),
      access_token: token,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    if (isTokenExpiredError(data)) return tokenExpiredResult("publishCarousel:feed");
    return { success: false, error: data.error?.message ?? "Error publicando carrusel en Facebook" };
  }

  return {
    success: true,
    platformPostId: data.id,
    platformUrl: `https://www.facebook.com/${data.id.replace("_", "/posts/")}`,
  };
}

// ── Video / Reel ──────────────────────────────────────────────────────────────
async function publishVideo(
  pageId: string,
  caption: string,
  videoUrl: string,
  token: string
): Promise<PublishResult> {
  const res = await fetch(`${GRAPH}/${pageId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_url: videoUrl,
      description: caption,
      access_token: token,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    if (isTokenExpiredError(data)) return tokenExpiredResult("publishVideo");
    return { success: false, error: data.error?.message ?? "Error publicando video en Facebook" };
  }

  return {
    success: true,
    platformPostId: data.id,
    platformUrl: `https://www.facebook.com/video/${data.id}`,
  };
}

// ── Text / Link feed post ─────────────────────────────────────────────────────
async function publishFeed(
  pageId: string,
  message: string,
  token: string
): Promise<PublishResult> {
  const res = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    if (isTokenExpiredError(data)) return tokenExpiredResult("publishFeed");
    return { success: false, error: data.error?.message ?? "Error publicando en Facebook" };
  }

  return {
    success: true,
    platformPostId: data.id,
    platformUrl: `https://www.facebook.com/${data.id.replace("_", "/posts/")}`,
  };
}
