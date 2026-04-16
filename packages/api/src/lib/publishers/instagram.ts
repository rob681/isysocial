// ─── Instagram Publisher ──────────────────────────────────────────────────────
// Publishes posts to Instagram Business Account via Meta Graph API v20.0
// Requires: Instagram Business/Creator Account linked to a Facebook Page
// accountId = Instagram Business Account ID (not username)
// accessToken = Page access token (same as Facebook)

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

export async function publishToInstagram(ctx: PublishContext): Promise<PublishResult> {
  const igUserId = ctx.accountId;
  const caption = buildCaption(ctx.copy, ctx.hashtags);

  console.log(`[IG Publisher] Starting publish. accountId=${igUserId}, postType=${ctx.postType}, mediaUrls=${ctx.mediaUrls.length}`);

  if (!igUserId) {
    return { success: false, error: "Falta el ID de cuenta de Instagram. Reconecta la red social." };
  }

  try {
    if ((ctx.postType === "VIDEO" || ctx.postType === "REEL") && ctx.mediaUrls.length > 0) {
      return await publishReel(igUserId, caption, ctx.mediaUrls[0]!, ctx.accessToken);
    }

    if (ctx.postType === "CAROUSEL" && ctx.mediaUrls.length > 1) {
      return await publishCarousel(igUserId, caption, ctx.mediaUrls, ctx.accessToken);
    }

    if (ctx.postType === "STORY" && ctx.mediaUrls.length > 0) {
      // Stories don't support captions — pass empty
      // Must detect if media is video to use correct field (image_url vs video_url)
      return await publishStory(igUserId, ctx.mediaUrls[0]!, ctx.accessToken);
    }

    if (ctx.mediaUrls.length > 0) {
      return await publishSingleImage(igUserId, caption, ctx.mediaUrls[0]!, ctx.accessToken, "IMAGE");
    }

    return {
      success: false,
      error: "Instagram requiere al menos una imagen o video para publicar.",
    };
  } catch (err: any) {
    console.error("[IG Publisher] Uncaught error:", err);
    return { success: false, error: err?.message ?? "Error publicando en Instagram" };
  }
}

// ── Single Image ──────────────────────────────────────────────────────────────
async function publishSingleImage(
  igUserId: string,
  caption: string,
  imageUrl: string,
  token: string,
  mediaType: string = "IMAGE"
): Promise<PublishResult> {
  // Step 1: Create media container
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      media_type: mediaType,
      access_token: token,
    }),
  });

  const containerData = await containerRes.json();
  console.log(`[IG Publisher] Single image container response: status=${containerRes.status}`, JSON.stringify(containerData).slice(0, 500));
  if (!containerRes.ok || containerData.error) {
    if (isTokenExpiredError(containerData)) return tokenExpiredResult("publishSingleImage:container");
    return {
      success: false,
      error: `Instagram: ${containerData.error?.message ?? "Error creando contenedor"} (code: ${containerData.error?.code ?? containerRes.status})`,
    };
  }

  const creationId: string = containerData.id;

  // Step 2: Wait for container to be ready (fixes error 9007 "Media ID is not available")
  await waitForContainerReady(creationId, token, 8, 2000);

  // Step 3: Publish container
  return await publishContainer(igUserId, creationId, token);
}

// ── Carousel ──────────────────────────────────────────────────────────────────
async function publishCarousel(
  igUserId: string,
  caption: string,
  imageUrls: string[],
  token: string
): Promise<PublishResult> {
  // Step 1: Create a child media container for each image and wait for each to be ready
  const childIds: string[] = [];
  for (const imageUrl of imageUrls) {
    const res = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: token,
      }),
    });
    const data = await res.json();
    console.log(`[IG Publisher] Carousel item response: status=${res.status}`, JSON.stringify(data).slice(0, 300));
    if (!res.ok || data.error) {
      if (isTokenExpiredError(data)) return tokenExpiredResult("publishCarousel:item");
      return {
        success: false,
        error: `Instagram carrusel: ${data.error?.message ?? "Error creando item"} (code: ${data.error?.code ?? res.status})`,
      };
    }

    // Wait for each child container to be ready before continuing
    await waitForContainerReady(data.id, token, 8, 2000);
    childIds.push(data.id);
  }

  // Step 2: Create carousel container
  const carouselRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: token,
    }),
  });

  const carouselData = await carouselRes.json();
  console.log(`[IG Publisher] Carousel container response: status=${carouselRes.status}`, JSON.stringify(carouselData).slice(0, 300));
  if (!carouselRes.ok || carouselData.error) {
    if (isTokenExpiredError(carouselData)) return tokenExpiredResult("publishCarousel:container");
    return {
      success: false,
      error: `Instagram carrusel: ${carouselData.error?.message ?? "Error creando carrusel"} (code: ${carouselData.error?.code ?? carouselRes.status})`,
    };
  }

  // Step 3: Wait for carousel container to be ready
  await waitForContainerReady(carouselData.id, token, 8, 2000);

  // Step 4: Publish
  return await publishContainer(igUserId, carouselData.id, token);
}

// ── Reel / Video ──────────────────────────────────────────────────────────────
async function publishReel(
  igUserId: string,
  caption: string,
  videoUrl: string,
  token: string
): Promise<PublishResult> {
  // Step 1: Create video container
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_url: videoUrl,
      caption,
      media_type: "REELS",
      access_token: token,
    }),
  });

  const containerData = await containerRes.json();
  console.log(`[IG Publisher] Reel container response: status=${containerRes.status}`, JSON.stringify(containerData).slice(0, 300));
  if (!containerRes.ok || containerData.error) {
    if (isTokenExpiredError(containerData)) return tokenExpiredResult("publishReel:container");
    return {
      success: false,
      error: `Instagram reel: ${containerData.error?.message ?? "Error creando contenedor"} (code: ${containerData.error?.code ?? containerRes.status})`,
    };
  }

  const creationId: string = containerData.id;

  // Step 2: Wait for video processing (videos take longer — poll up to 60s)
  await waitForContainerReady(creationId, token, 20, 3000);

  // Step 3: Publish
  return await publishContainer(igUserId, creationId, token);
}

// ── Story (photo or video) ────────────────────────────────────────────────────
/**
 * Publishes a Story to Instagram.
 * Detects whether the media is a video or image by URL extension.
 * - Photo stories: image_url + media_type=STORIES
 * - Video stories: video_url + media_type=STORIES (requires polling for processing)
 *
 * Error 9004 ("Only photo or video can be accepted as media type") occurs when:
 * 1. The URL is not publicly accessible to Meta's crawlers
 * 2. image_url is passed for a video file (or vice versa)
 */
async function publishStory(
  igUserId: string,
  mediaUrl: string,
  token: string
): Promise<PublishResult> {
  const isVideo = /\.(mp4|mov|avi|webm|m4v)(\?|$)/i.test(mediaUrl);

  const containerBody: Record<string, string> = {
    media_type: "STORIES",
    access_token: token,
  };

  if (isVideo) {
    containerBody.video_url = mediaUrl;
  } else {
    containerBody.image_url = mediaUrl;
  }

  console.log(`[IG Publisher] Story type: ${isVideo ? "VIDEO" : "IMAGE"}, url=${mediaUrl.slice(0, 80)}...`);

  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });

  const containerData = await containerRes.json();
  console.log(`[IG Publisher] Story container response: status=${containerRes.status}`, JSON.stringify(containerData).slice(0, 500));

  if (!containerRes.ok || containerData.error) {
    if (isTokenExpiredError(containerData)) return tokenExpiredResult("publishStory:container");
    return {
      success: false,
      error: `Instagram Story: ${containerData.error?.message ?? "Error creando contenedor"} (code: ${containerData.error?.code ?? containerRes.status})`,
    };
  }

  const creationId: string = containerData.id;

  // Videos need processing time; images are near-instant
  await waitForContainerReady(creationId, token, isVideo ? 20 : 8, isVideo ? 3000 : 2000);

  return await publishContainer(igUserId, creationId, token);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function publishContainer(
  igUserId: string,
  creationId: string,
  token: string
): Promise<PublishResult> {
  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });

  const publishData = await publishRes.json();
  console.log(`[IG Publisher] Publish container response: status=${publishRes.status}`, JSON.stringify(publishData).slice(0, 300));
  if (!publishRes.ok || publishData.error) {
    if (isTokenExpiredError(publishData)) return tokenExpiredResult("publishContainer");
    return {
      success: false,
      error: `Instagram publish: ${publishData.error?.message ?? "Error publicando"} (code: ${publishData.error?.code ?? publishRes.status})`,
    };
  }

  // Fetch permalink
  const mediaId: string = publishData.id;
  let platformUrl = `https://www.instagram.com/p/${mediaId}/`;

  try {
    const mediaRes = await fetch(
      `${GRAPH}/${mediaId}?fields=permalink&access_token=${token}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.permalink) platformUrl = mediaData.permalink;
  } catch {
    // ignore — URL is best-effort
  }

  return { success: true, platformPostId: mediaId, platformUrl };
}

/**
 * Polls a media container until its status_code is FINISHED.
 * Works for images, carousel items, carousel parents, and reels.
 * maxAttempts × intervalMs = total wait time.
 */
async function waitForContainerReady(
  creationId: string,
  token: string,
  maxAttempts = 10,
  intervalMs = 2000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(
      `${GRAPH}/${creationId}?fields=status_code,status&access_token=${token}`
    );
    const data = await res.json();
    console.log(`[IG Publisher] Container ${creationId} status (attempt ${i + 1}): ${data.status_code}`);
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") {
      throw new Error(`Error procesando contenedor en Instagram: ${data.status ?? "estado desconocido"}`);
    }
    // IN_PROGRESS or PUBLISHED → keep polling
  }
  // Timeout — attempt publish anyway (container might still work)
  console.warn(`[IG Publisher] Container ${creationId} polling timed out, attempting publish anyway`);
}
