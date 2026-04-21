// ─── TikTok Publisher ─────────────────────────────────────────────────────────
// Publishes VIDEO / REEL posts to TikTok via Content Posting API v2.
//
// Uses FILE_UPLOAD (not PULL_FROM_URL) because PULL_FROM_URL requires the
// hosting domain to be pre-verified in the TikTok Developer Portal. Our videos
// live on Supabase (`*.supabase.co`), which we don't own, so PULL_FROM_URL
// fails with "URL ownership verification" errors. FILE_UPLOAD sidesteps this
// entirely by pushing the bytes directly to TikTok.
//
// Flow:
//   1. Fetch the video bytes from the media URL (Supabase public storage).
//   2. Decide chunk strategy based on video size.
//   3. POST /post/publish/creator_info/query/ → get privacy_level_options
//      and creator interaction flags (comment/duet/stitch disabled).
//   4. POST /post/publish/video/init/ with source=FILE_UPLOAD + video_size +
//      chunk_size + total_chunk_count → TikTok returns publish_id + upload_url.
//   5. PUT each chunk to upload_url with Content-Range + Content-Type.
//   6. TikTok processes asynchronously; the video appears on TikTok after
//      ~minutes. We persist publish_id as platformPostId.
//
// Privacy level: we NEVER hard-code "PUBLIC_TO_EVERYONE". Instead we pick
// the first allowed level from creator_info.privacy_level_options, preferring
// public when available. Unaudited / sandbox apps typically only get
// "SELF_ONLY" — posting publicly from them returns a
// "content-sharing-guidelines" rejection.
//
// Chunk constraints (per TikTok docs):
//   - MIN chunk_size: 5 MB  (only required when total_chunk_count > 1)
//   - MAX chunk_size: 64 MB
//   - Last chunk can be smaller than chunk_size.
//   - For single-chunk uploads, chunk_size === video_size (even if < 5 MB).
//   - Total video size cap: 4 GB.

import type { PublishContext, PublishResult } from "./index";
import { buildCaption } from "./index";

const TIKTOK_API = "https://open.tiktokapis.com/v2";

const MIN_CHUNK_SIZE = 5 * 1024 * 1024;       // 5 MB
const MAX_CHUNK_SIZE = 64 * 1024 * 1024;      // 64 MB
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;  // 10 MB — balanced default
const MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024; // 4 GB

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
    // ── 1. Fetch video bytes ───────────────────────────────────────────────
    const videoRes = await fetch(ctx.mediaUrls[0]);
    if (!videoRes.ok) {
      return {
        success: false,
        error: `No se pudo descargar el video desde el almacenamiento (HTTP ${videoRes.status}).`,
      };
    }
    const videoBuf = Buffer.from(await videoRes.arrayBuffer());
    const videoSize = videoBuf.byteLength;
    const contentType = videoRes.headers.get("content-type") ?? "video/mp4";

    if (videoSize === 0) {
      return { success: false, error: "El archivo de video está vacío." };
    }
    if (videoSize > MAX_VIDEO_SIZE) {
      return {
        success: false,
        error: "El video supera el tamaño máximo permitido por TikTok (4 GB).",
      };
    }

    // ── 2. Decide chunk strategy ───────────────────────────────────────────
    // Rules:
    //   - If video_size <= MAX_CHUNK_SIZE → single chunk (chunk_size = video_size).
    //   - Else → multiple chunks of DEFAULT_CHUNK_SIZE (10 MB). Last chunk
    //     will be whatever's left (≤ chunk_size).
    let chunkSize: number;
    let totalChunkCount: number;

    if (videoSize <= MAX_CHUNK_SIZE) {
      chunkSize = videoSize; // single chunk; TikTok accepts chunk_size < 5 MB here
      totalChunkCount = 1;
    } else {
      chunkSize = Math.min(
        Math.max(DEFAULT_CHUNK_SIZE, MIN_CHUNK_SIZE),
        MAX_CHUNK_SIZE
      );
      totalChunkCount = Math.ceil(videoSize / chunkSize);
    }

    // ── 3. Query creator_info ──────────────────────────────────────────────
    // TikTok requires apps to honor the creator's privacy settings and only
    // use privacy levels that are allowed for the user's account. Unaudited
    // / sandbox apps typically only get SELF_ONLY; audited apps get public +
    // mutual-friends levels. Hard-coding PUBLIC_TO_EVERYONE triggers the
    // "content-sharing-guidelines" rejection.
    const creatorRes = await fetch(`${TIKTOK_API}/post/publish/creator_info/query/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${ctx.accessToken}`,
      },
    });
    const creatorData = await creatorRes.json();
    const creatorErrCode: string | undefined = creatorData?.error?.code;
    const creatorHasErr = creatorErrCode && creatorErrCode !== "ok";
    const creator = creatorData?.data;

    if (!creatorRes.ok || creatorHasErr || !creator) {
      const msg =
        creatorData?.error?.message ??
        creatorErrCode ??
        "Error consultando la información del creador en TikTok";
      const requiresReconnect =
        creatorRes.status === 401 ||
        creatorErrCode === "access_token_invalid" ||
        creatorErrCode === "scope_not_authorized" ||
        creatorErrCode === "unauthorized";
      return {
        success: false,
        error: msg,
        ...(requiresReconnect ? { requiresReconnect: true } : {}),
      };
    }

    const privacyLevelOptions: string[] = Array.isArray(creator.privacy_level_options)
      ? creator.privacy_level_options
      : [];
    // Prefer PUBLIC_TO_EVERYONE when available (audited app), else fall back
    // to the first allowed level (typically SELF_ONLY for sandbox/unaudited).
    const privacyLevel =
      privacyLevelOptions.includes("PUBLIC_TO_EVERYONE")
        ? "PUBLIC_TO_EVERYONE"
        : (privacyLevelOptions[0] ?? "SELF_ONLY");

    // Respect creator-level toggles — TikTok rejects the init if we try to
    // enable an interaction the creator has disabled in their settings.
    const disableComment = !!creator.comment_disabled;
    const disableDuet = !!creator.duet_disabled;
    const disableStitch = !!creator.stitch_disabled;

    // ── 4. Init publish → get publish_id + upload_url ──────────────────────
    const initBody = {
      post_info: {
        title: title.slice(0, 2200), // TikTok max caption length
        privacy_level: privacyLevel,
        disable_duet: disableDuet,
        disable_comment: disableComment,
        disable_stitch: disableStitch,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    };

    const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${ctx.accessToken}`,
      },
      body: JSON.stringify(initBody),
    });

    const initData = await initRes.json();

    // TikTok Content Posting API v2 response shapes:
    //   Success: { data: { publish_id, upload_url }, error: { code: "ok", ... } }
    //   Error:   { error: { code: "...", message: "...", log_id } }
    const initErrorCode: string | undefined = initData?.error?.code;
    const hasInitError = initErrorCode && initErrorCode !== "ok";
    const publishId: string | undefined = initData?.data?.publish_id;
    const uploadUrl: string | undefined = initData?.data?.upload_url;

    if (!initRes.ok || hasInitError || !publishId || !uploadUrl) {
      const msg =
        initData?.error?.message ??
        initErrorCode ??
        "Error iniciando publicación en TikTok";

      const requiresReconnect =
        initRes.status === 401 ||
        initErrorCode === "access_token_invalid" ||
        initErrorCode === "scope_not_authorized" ||
        initErrorCode === "unauthorized";

      return {
        success: false,
        error: msg,
        ...(requiresReconnect ? { requiresReconnect: true } : {}),
      };
    }

    // ── 5. Upload chunks ──────────────────────────────────────────────────
    // PUT each chunk to upload_url with the right Content-Range.
    // TikTok accepts 200 / 201 / 206 as successful chunk uploads.
    for (let i = 0; i < totalChunkCount; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, videoSize) - 1;
      const chunk = videoBuf.subarray(start, end + 1);

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": chunk.byteLength.toString(),
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        },
        // Node 18+ fetch accepts Buffer/Uint8Array as body
        body: chunk,
      });

      if (![200, 201, 206].includes(uploadRes.status)) {
        const detail = await uploadRes.text().catch(() => "");
        return {
          success: false,
          error:
            `Error subiendo chunk ${i + 1}/${totalChunkCount} a TikTok ` +
            `(HTTP ${uploadRes.status}). ${detail.slice(0, 200)}`,
        };
      }
    }

    // TikTok processes the video asynchronously; it appears on TikTok in
    // a few minutes. We save publish_id as platformPostId so we can poll
    // the /post/publish/status/fetch/ endpoint later if needed.
    return {
      success: true,
      platformPostId: publishId,
      platformUrl: "https://www.tiktok.com/",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message ?? "Error publicando en TikTok",
    };
  }
}
