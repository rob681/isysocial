import type { VideoFilter, TextOverlay, StickerOverlay, TrimRange, AudioTrack } from "./types";
import { DEFAULT_FILTER } from "./constants";
import { LRUCache } from "@/lib/lru-cache";

// ─── Format Time ───────────────────────────────────────────────────────────

export function formatTime(secs: number): string {
  if (!secs || !isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── CSS Filter String ─────────────────────────────────────────────────────

export function buildCssFilterString(filter: VideoFilter): string {
  const parts: string[] = [];
  if (filter.brightness !== 100) parts.push(`brightness(${filter.brightness}%)`);
  if (filter.contrast !== 100) parts.push(`contrast(${filter.contrast}%)`);
  if (filter.saturation !== 100) parts.push(`saturate(${filter.saturation}%)`);
  if (filter.grayscale > 0) parts.push(`grayscale(${filter.grayscale}%)`);
  if (filter.sepia > 0) parts.push(`sepia(${filter.sepia}%)`);
  if (filter.blur > 0) parts.push(`blur(${filter.blur}px)`);
  if (filter.hueRotate > 0) parts.push(`hue-rotate(${filter.hueRotate}deg)`);
  return parts.length > 0 ? parts.join(" ") : "none";
}

// ─── Default Filter ────────────────────────────────────────────────────────

export function getDefaultFilter(): VideoFilter {
  return { ...DEFAULT_FILTER };
}

// ─── Generate Thumbnails ───────────────────────────────────────────────────

export async function generateThumbnails(videoUrl: string, count: number = 6): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;

    const thumbnails: string[] = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve([]);
      return;
    }

    // Small thumbnails for the strip
    canvas.width = 80;
    canvas.height = 142; // 9:16 ratio

    video.onloadedmetadata = async () => {
      const dur = video.duration;
      if (!dur || !isFinite(dur)) {
        resolve([]);
        return;
      }

      const times: number[] = [];
      for (let i = 0; i < count; i++) {
        times.push((dur / count) * i + dur / (count * 2));
      }

      for (const time of times) {
        try {
          const dataUrl = await captureFrame(video, canvas, ctx, time);
          thumbnails.push(dataUrl);
        } catch {
          // Skip failed frames
        }
      }

      video.src = "";
      resolve(thumbnails);
    };

    video.onerror = () => resolve([]);
    video.src = videoUrl;
  });
}

// ─── Render Edited Video ──────────────────────────────────────────────────

interface RenderParams {
  videoUrl: string;
  trim: TrimRange;
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  filter: VideoFilter;
  audioTrack: AudioTrack | null;
  onProgress?: (pct: number) => void;
}

// Pre-load sticker images for export (LRU cache to prevent unbounded growth)
const exportStickerCache = new LRUCache<string, HTMLImageElement>(50);

function preloadStickerImages(stickers: StickerOverlay[]): Promise<void> {
  const promises = stickers.map((s) => {
    if (exportStickerCache.has(s.url)) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { exportStickerCache.set(s.url, img); resolve(); };
      img.onerror = () => resolve();
      img.src = s.url;
    });
  });
  return Promise.all(promises).then(() => {});
}

function drawOverlaysForExport(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  textOverlays: TextOverlay[],
  stickerOverlays: StickerOverlay[]
) {
  // Text overlays
  for (const overlay of textOverlays) {
    const visible = time >= overlay.startTime && (overlay.endTime === 0 || time <= overlay.endTime);
    if (!visible) continue;

    const x = (overlay.x / 100) * w;
    const y = (overlay.y / 100) * h;
    const fontSize = overlay.fontSize * (w / 400);

    let displayText = overlay.text;
    if (overlay.textTransform === "uppercase") displayText = displayText.toUpperCase();
    if (overlay.textTransform === "lowercase") displayText = displayText.toLowerCase();

    ctx.font = `${overlay.bold ? "bold " : ""}${fontSize}px ${overlay.fontFamily}, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (overlay.letterSpacing) {
      (ctx as any).letterSpacing = `${overlay.letterSpacing}px`;
    }

    // Background
    if (overlay.backgroundColor && overlay.backgroundColor !== "transparent") {
      const metrics = ctx.measureText(displayText);
      const pad = fontSize * 0.3;
      const bgW = metrics.width + pad * 2;
      const bgH = fontSize + pad * 2;
      ctx.fillStyle = overlay.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(x - bgW / 2, y - bgH / 2, bgW, bgH, fontSize * 0.15);
      ctx.fill();
    }

    // Shadow / glow
    if (overlay.shadow) {
      const parts = overlay.shadow.split(",")[0]?.trim().split(/\s+/) || [];
      if (parts.length >= 4) {
        ctx.shadowOffsetX = parseInt(parts[0]!) || 0;
        ctx.shadowOffsetY = parseInt(parts[1]!) || 0;
        ctx.shadowBlur = parseInt(parts[2]!) || 0;
        ctx.shadowColor = parts[3] || overlay.color;
      }
    }

    // Stroke
    if (overlay.strokeColor && overlay.strokeWidth) {
      ctx.strokeStyle = overlay.strokeColor;
      ctx.lineWidth = overlay.strokeWidth * (w / 400);
      ctx.strokeText(displayText, x, y);
    }

    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = overlay.color;
    ctx.fillText(displayText, x, y);
    (ctx as any).letterSpacing = "0px";
  }

  // Sticker overlays
  for (const sticker of stickerOverlays) {
    const visible = time >= sticker.startTime && (sticker.endTime === 0 || time <= sticker.endTime);
    if (!visible) continue;

    const img = exportStickerCache.get(sticker.url);
    if (!img || !img.complete) continue;

    const sw = (sticker.width / 100) * w;
    const sh = img.height ? sw * (img.height / img.width) : sw;
    const sx = (sticker.x / 100) * w - sw / 2;
    const sy = (sticker.y / 100) * h - sh / 2;
    ctx.drawImage(img, sx, sy, sw, sh);
  }
}

export async function renderEditedVideo(params: RenderParams): Promise<Blob> {
  const { videoUrl, trim, textOverlays, stickerOverlays, filter, onProgress } = params;

  // Preload sticker images
  await preloadStickerImages(stickerOverlays);

  // Step 1: Fetch the video as a blob to avoid CORS tainted canvas issues
  onProgress?.(0);
  const videoResponse = await fetch(videoUrl);
  const videoBlob = await videoResponse.blob();
  const localUrl = URL.createObjectURL(videoBlob);

  try {
    return await new Promise<Blob>((resolve, reject) => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }

      const filterStr = buildCssFilterString(filter);
      const trimDuration = trim.end - trim.start;
      let recording = false;

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth || 1080;
        canvas.height = video.videoHeight || 1920;
        video.currentTime = trim.start;
      };

      video.onseeked = () => {
        // Only start recording once
        if (recording) return;
        recording = true;

        const stream = canvas.captureStream(30);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          video.pause();
          video.src = "";
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };

        recorder.onerror = () => reject(new Error("MediaRecorder error"));
        recorder.start(100);
        video.play().catch(() => reject(new Error("Video play failed")));

        const renderLoop = () => {
          if (video.paused || video.ended || video.currentTime >= trim.end) {
            if (recorder.state === "recording") recorder.stop();
            return;
          }

          // Draw video frame with filter
          if (filterStr !== "none") {
            ctx.filter = filterStr;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.filter = "none";

          // Draw overlays
          drawOverlaysForExport(ctx, canvas.width, canvas.height, video.currentTime, textOverlays, stickerOverlays);

          // Progress
          const elapsed = video.currentTime - trim.start;
          onProgress?.(Math.min(99, Math.round((elapsed / trimDuration) * 100)));

          requestAnimationFrame(renderLoop);
        };

        requestAnimationFrame(renderLoop);
      };

      video.onerror = () => reject(new Error("Failed to load video"));
      video.src = localUrl;
    });
  } finally {
    URL.revokeObjectURL(localUrl);
    onProgress?.(100);
  }
}

// ─── Thumbnail Generation ─────────────────────────────────────────────────

function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  time: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("seek timeout")), 5000);

    video.onseeked = () => {
      clearTimeout(timeout);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.5));
    };

    video.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("seek error"));
    };

    video.currentTime = time;
  });
}
