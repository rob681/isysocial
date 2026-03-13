// ─── TikTok Publisher ─────────────────────────────────────────────────────────
// Publishes VIDEO posts to TikTok via Content Posting API v2
// ONLY supports VIDEO post type — other types are rejected with a clear error
// Uses pull-from-URL approach (no binary upload required)

import type { PublishContext, PublishResult } from "./index";
import { buildCaption } from "./index";

const TIKTOK_API = "https://open.tiktokapis.com/v2";

export async function publishToTikTok(ctx: PublishContext): Promise<PublishResult> {
  // TikTok Content Posting API only supports video
  if (ctx.postType !== "VIDEO" && ctx.postType !== "REEL") {
    return {
      success: false,
      error:
        "TikTok solo admite publicaciones de tipo VIDEO. Por favor selecciona un post de video para publicar en TikTok.",
    };
  }

  if (!ctx.mediaUrls[0]) {
    return {
      success: false,
      error: "Se requiere una URL de video para publicar en TikTok.",
    };
  }

  const title = buildCaption(ctx.copy, ctx.hashtags);

  try {
    return await initVideoPublish(title, ctx.mediaUrls[0], ctx.accessToken);
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Error publicando en TikTok" };
  }
}

// ── Init Video Publish (pull-from-URL) ────────────────────────────────────────
async function initVideoPublish(
  title: string,
  videoUrl: string,
  token: string
): Promise<PublishResult> {
  const body = {
    post_info: {
      title: title.slice(0, 2200), // TikTok max caption length
      privacy_level: "PUBLIC_TO_EVERYONE",
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 1000,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  };

  const res = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || data?.error?.code !== "ok") {
    const errMsg =
      data?.error?.message ??
      data?.error?.code ??
      "Error iniciando publicación en TikTok";
    return { success: false, error: errMsg };
  }

  const publishId: string = data?.data?.publish_id ?? "";

  // Note: TikTok processes asynchronously. We save the publish_id as platformPostId.
  // The video will be available on TikTok once processing completes (typically <5 min).
  return {
    success: true,
    platformPostId: publishId,
    platformUrl: "https://www.tiktok.com/", // Specific URL only available after processing
  };
}
