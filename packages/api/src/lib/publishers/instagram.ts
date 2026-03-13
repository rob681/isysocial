// ─── Instagram Publisher ──────────────────────────────────────────────────────
// Publishes posts to Instagram Business Account via Meta Graph API v20.0
// Requires: Instagram Business/Creator Account linked to a Facebook Page
// accountId = Instagram Business Account ID (not username)
// accessToken = Page access token (same as Facebook)

import type { PublishContext, PublishResult } from "./index";
import { buildCaption } from "./index";

const GRAPH = "https://graph.facebook.com/v20.0";

export async function publishToInstagram(ctx: PublishContext): Promise<PublishResult> {
  const igUserId = ctx.accountId;
  const caption = buildCaption(ctx.copy, ctx.hashtags);

  try {
    if ((ctx.postType === "VIDEO" || ctx.postType === "REEL") && ctx.mediaUrls.length > 0) {
      return await publishReel(igUserId, caption, ctx.mediaUrls[0]!, ctx.accessToken);
    }

    if (ctx.postType === "CAROUSEL" && ctx.mediaUrls.length > 1) {
      return await publishCarousel(igUserId, caption, ctx.mediaUrls, ctx.accessToken);
    }

    if (ctx.mediaUrls.length > 0) {
      // Single image (IMAGE or STORY)
      const mediaType = ctx.postType === "STORY" ? "STORIES" : "IMAGE";
      return await publishSingleImage(igUserId, caption, ctx.mediaUrls[0]!, ctx.accessToken, mediaType);
    }

    return {
      success: false,
      error: "Instagram requiere al menos una imagen o video para publicar.",
    };
  } catch (err: any) {
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
  if (!containerRes.ok || containerData.error) {
    return {
      success: false,
      error: containerData.error?.message ?? "Error creando contenedor de media en Instagram",
    };
  }

  const creationId: string = containerData.id;

  // Step 2: Publish container
  return await publishContainer(igUserId, creationId, token);
}

// ── Carousel ──────────────────────────────────────────────────────────────────
async function publishCarousel(
  igUserId: string,
  caption: string,
  imageUrls: string[],
  token: string
): Promise<PublishResult> {
  // Step 1: Create a child media container for each image
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
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message ?? "Error creando item de carrusel en Instagram",
      };
    }
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
  if (!carouselRes.ok || carouselData.error) {
    return {
      success: false,
      error: carouselData.error?.message ?? "Error creando carrusel en Instagram",
    };
  }

  // Step 3: Publish
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
  if (!containerRes.ok || containerData.error) {
    return {
      success: false,
      error: containerData.error?.message ?? "Error creando contenedor de reel en Instagram",
    };
  }

  const creationId: string = containerData.id;

  // Step 2: Wait for video processing (poll up to 30s)
  await waitForVideoReady(igUserId, creationId, token);

  // Step 3: Publish
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
  if (!publishRes.ok || publishData.error) {
    return {
      success: false,
      error: publishData.error?.message ?? "Error publicando media en Instagram",
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

async function waitForVideoReady(
  igUserId: string,
  creationId: string,
  token: string,
  maxAttempts = 10
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(
      `${GRAPH}/${creationId}?fields=status_code&access_token=${token}`
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Error procesando video en Instagram");
  }
}
