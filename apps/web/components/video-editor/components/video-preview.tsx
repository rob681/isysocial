"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Play, Move } from "lucide-react";
import type { TextOverlay, StickerOverlay, VideoFilter } from "../types";
import { buildCssFilterString } from "../utils";
import { LRUCache } from "@/lib/lru-cache";

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoUrl: string;
  filter: VideoFilter;
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  // Drag support
  selectedOverlayId: string | null;
  selectedStickerId: string | null;
  onSelectOverlay: (id: string | null) => void;
  onSelectSticker: (id: string | null) => void;
  onMoveOverlay: (id: string, x: number, y: number) => void;
  onMoveSticker: (id: string, x: number, y: number) => void;
}

// Pre-load sticker images (LRU cache to prevent unbounded growth)
const stickerImageCache = new LRUCache<string, HTMLImageElement>(50);

function loadStickerImage(url: string): HTMLImageElement | null {
  if (stickerImageCache.has(url)) return stickerImageCache.get(url)!;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  img.onload = () => stickerImageCache.set(url, img);
  stickerImageCache.set(url, img);
  return null;
}

export function VideoPreview({
  videoRef,
  canvasRef,
  videoUrl,
  filter,
  textOverlays,
  stickerOverlays,
  currentTime,
  isPlaying,
  onTogglePlay,
  onLoadedMetadata,
  onTimeUpdate,
  selectedOverlayId,
  selectedStickerId,
  onSelectOverlay,
  onSelectSticker,
  onMoveOverlay,
  onMoveSticker,
}: VideoPreviewProps) {
  const animRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ type: "text" | "sticker"; id: string } | null>(null);

  // Convert client coordinates to percentage position on the video
  const clientToPercent = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  // Handle pointer down on the video area — detect which overlay was clicked
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const pos = clientToPercent(e.clientX, e.clientY);
    if (!pos) return;

    // Check stickers first (they're drawn on top)
    for (let i = stickerOverlays.length - 1; i >= 0; i--) {
      const s = stickerOverlays[i]!;
      const halfW = s.width / 2;
      const halfH = s.width * 0.8; // approximate height
      if (Math.abs(pos.x - s.x) < halfW && Math.abs(pos.y - s.y) < halfH) {
        e.preventDefault();
        e.stopPropagation();
        onSelectSticker(s.id);
        onSelectOverlay(null);
        setDragging({ type: "sticker", id: s.id });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }

    // Check text overlays
    for (let i = textOverlays.length - 1; i >= 0; i--) {
      const t = textOverlays[i]!;
      const hitRadius = Math.max(8, t.fontSize * 0.5);
      if (Math.abs(pos.x - t.x) < hitRadius && Math.abs(pos.y - t.y) < hitRadius) {
        e.preventDefault();
        e.stopPropagation();
        onSelectOverlay(t.id);
        onSelectSticker(null);
        setDragging({ type: "text", id: t.id });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }

    // Clicked empty space — deselect
    onSelectOverlay(null);
    onSelectSticker(null);
  }, [stickerOverlays, textOverlays, clientToPercent, onSelectOverlay, onSelectSticker]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const pos = clientToPercent(e.clientX, e.clientY);
    if (!pos) return;

    if (dragging.type === "text") {
      onMoveOverlay(dragging.id, pos.x, pos.y);
    } else {
      onMoveSticker(dragging.id, pos.x, pos.y);
    }
  }, [dragging, clientToPercent, onMoveOverlay, onMoveSticker]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Draw overlays on canvas
  const drawOverlays = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || video.clientWidth || 1080;
    canvas.height = video.videoHeight || video.clientHeight || 1920;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const time = video.currentTime;

    // Draw text overlays
    for (const overlay of textOverlays) {
      const visible = time >= overlay.startTime && (overlay.endTime === 0 || time <= overlay.endTime);
      if (!visible) continue;

      const x = (overlay.x / 100) * canvas.width;
      const y = (overlay.y / 100) * canvas.height;
      const fontSize = overlay.fontSize * (canvas.width / 400);

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
        ctx.lineWidth = overlay.strokeWidth * (canvas.width / 400);
        ctx.strokeText(displayText, x, y);
      }

      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.fillStyle = overlay.color;
      ctx.fillText(displayText, x, y);

      // Selection indicator
      if (overlay.id === selectedOverlayId) {
        const metrics = ctx.measureText(displayText);
        const pad = fontSize * 0.4;
        const bx = x - metrics.width / 2 - pad;
        const by = y - fontSize / 2 - pad;
        const bw = metrics.width + pad * 2;
        const bh = fontSize + pad * 2;
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      }

      (ctx as any).letterSpacing = "0px";
    }

    // Draw sticker overlays
    for (const sticker of stickerOverlays) {
      const visible = time >= sticker.startTime && (sticker.endTime === 0 || time <= sticker.endTime);
      if (!visible) continue;

      const img = loadStickerImage(sticker.url);
      if (!img || !img.complete) continue;

      const w = (sticker.width / 100) * canvas.width;
      const h = img.height ? w * (img.height / img.width) : w;
      const sx = (sticker.x / 100) * canvas.width - w / 2;
      const sy = (sticker.y / 100) * canvas.height - h / 2;

      ctx.drawImage(img, sx, sy, w, h);

      // Selection indicator
      if (sticker.id === selectedStickerId) {
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(sx - 2, sy - 2, w + 4, h + 4);
        ctx.setLineDash([]);
      }
    }
  }, [canvasRef, videoRef, textOverlays, stickerOverlays, selectedOverlayId, selectedStickerId]);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      drawOverlays();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawOverlays]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
      <div
        ref={containerRef}
        className="relative bg-black rounded-xl overflow-hidden shadow-2xl cursor-crosshair"
        style={{ height: "100%", aspectRatio: "9/16" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Video with CSS filter */}
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ filter: buildCssFilterString(filter) }}
          crossOrigin="anonymous"
          playsInline
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
        />

        {/* Canvas overlay for text + stickers — receives pointer events for dragging */}
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: "none" }}
        />

        {/* Drag hint when overlay selected */}
        {(selectedOverlayId || selectedStickerId) && !dragging && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[10px]">
            <Move className="h-3 w-3" /> Arrastra para mover
          </div>
        )}

        {/* Play button overlay — only when nothing is selected */}
        {!isPlaying && !selectedOverlayId && !selectedStickerId && !dragging && (
          <button
            type="button"
            onClick={onTogglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-7 w-7 text-white ml-0.5" fill="white" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
