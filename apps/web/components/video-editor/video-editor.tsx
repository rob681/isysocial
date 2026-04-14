"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ActiveTool,
  TextOverlay,
  StickerOverlay,
  TrimRange,
  VideoFilter,
  AudioTrack,
} from "./types";
import { createStickerOverlay } from "./types";
import { getDefaultFilter, generateThumbnails, renderEditedVideo } from "./utils";

// Sub-components
import { Toolbar } from "./components/toolbar";
import { VideoPreview } from "./components/video-preview";
import { Timeline } from "./components/timeline";
import { TrimPanel } from "./components/panels/trim-panel";
import { TextPanel } from "./components/panels/text-panel";
import { FilterPanel } from "./components/panels/filter-panel";
import { StickerPanel } from "./components/panels/sticker-panel";
import { AudioPanel } from "./components/panels/audio-panel";

interface VideoEditorProps {
  videoUrl: string;
  postId?: string;
  clientName?: string;
  basePath?: string;
  onClose?: () => void;
  onExport?: (blob: Blob) => Promise<void>;
}

export function VideoEditor({ videoUrl, clientName, onClose, onExport }: VideoEditorProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Core state
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trim, setTrim] = useState<TrimRange>({ start: 0, end: 0 });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Tool state
  const [activeTool, setActiveTool] = useState<ActiveTool>("trim");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [filter, setFilter] = useState<VideoFilter>(getDefaultFilter());
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // ─── Video Events ────────────────────────────────────────────────────────

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration;
    setDuration(dur);
    setTrim({ start: 0, end: dur });
    generateThumbnails(videoUrl, 6).then(setThumbnails).catch(() => {});
  }, [videoUrl]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (trim.end > 0 && video.currentTime >= trim.end) {
      video.pause();
      video.currentTime = trim.start;
      setIsPlaying(false);
      audioRef.current?.pause();
      return;
    }
    setCurrentTime(video.currentTime);
  }, [trim]);

  // ─── Playback ────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < trim.start || video.currentTime >= trim.end) {
        video.currentTime = trim.start;
      }
      video.play();
      setIsPlaying(true);
      // Sync audio
      const audio = audioRef.current;
      if (audio && audioTrack) {
        audio.currentTime = video.currentTime;
        audio.play().catch(() => {});
      }
    } else {
      video.pause();
      setIsPlaying(false);
      audioRef.current?.pause();
    }
  }, [trim, audioTrack]);

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  // Keep audio volume/mute in sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioTrack) return;
    audio.volume = audioTrack.volume;
    audio.muted = audioTrack.muted;
  }, [audioTrack?.volume, audioTrack?.muted]);

  // Cleanup on unmount: release memory and blob URLs
  useEffect(() => {
    return () => {
      // Cleanup video
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.src = "";
        video.load();
      }

      // Cleanup audio
      if (audioTrack) {
        URL.revokeObjectURL(audioTrack.url);
      }

      // Cleanup canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Cleanup thumbnails (revoke data URLs)
      thumbnails.forEach((thumbnail) => {
        if (thumbnail.startsWith("data:")) {
          // Data URLs don't need revoking, but we clear the state
        }
      });
      setThumbnails([]);

      // Cancel any pending animation frames
      if (typeof requestAnimationFrame !== "undefined") {
        // Animation frames are already cleaned up by React
      }
    };
  }, [audioTrack]);

  // ─── Text Overlays ───────────────────────────────────────────────────────

  const handleAddText = useCallback((overlay: TextOverlay) => {
    setTextOverlays((prev) => [...prev, overlay]);
  }, []);

  const handleUpdateText = useCallback((id: string, changes: Partial<TextOverlay>) => {
    setTextOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...changes } : o)));
  }, []);

  const handleDeleteText = useCallback((id: string) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedOverlay === id) setSelectedOverlay(null);
  }, [selectedOverlay]);

  // ─── Sticker Overlays ────────────────────────────────────────────────────

  const handleAddSticker = useCallback((url: string, title: string) => {
    const sticker = createStickerOverlay(url, title, duration);
    setStickerOverlays((prev) => [...prev, sticker]);
    setSelectedSticker(sticker.id);
  }, [duration]);

  const handleUpdateSticker = useCallback((id: string, changes: Partial<StickerOverlay>) => {
    setStickerOverlays((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }, []);

  const handleDeleteSticker = useCallback((id: string) => {
    setStickerOverlays((prev) => prev.filter((s) => s.id !== id));
    if (selectedSticker === id) setSelectedSticker(null);
  }, [selectedSticker]);

  // ─── Audio ───────────────────────────────────────────────────────────────

  const handleLoadAudio = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setAudioTrack({ id: `aud_${Date.now()}`, name: file.name, url, volume: 0.7, muted: false });
  }, []);

  const handleRemoveAudio = useCallback(() => {
    if (audioTrack) URL.revokeObjectURL(audioTrack.url);
    setAudioTrack(null);
    audioRef.current?.pause();
  }, [audioTrack]);

  // ─── Export ──────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportProgress(0);
    try {
      const blob = await renderEditedVideo({
        videoUrl,
        trim,
        textOverlays,
        stickerOverlays,
        filter,
        audioTrack,
        onProgress: setExportProgress,
      });
      if (onExport) await onExport(blob);
      onClose?.();
    } catch (err) {
      console.error("Export failed:", err);
      setExporting(false);
    }
  }, [videoUrl, trim, textOverlays, stickerOverlays, filter, audioTrack, onExport, onClose]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-lg">🎬</span>
          <h1 className="text-sm font-bold">Isycine Studio</h1>
          {clientName && (
            <span className="text-xs text-zinc-400 hidden sm:inline">— {clientName}</span>
          )}
        </div>
        <Button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          size="sm"
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar
        </Button>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

        {/* Center: preview + timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video preview — height = total minus timeline (140px reserved) */}
          <div className="overflow-hidden" style={{ height: "calc(100% - 140px)" }}>
            <VideoPreview
              videoRef={videoRef}
              canvasRef={canvasRef}
              videoUrl={videoUrl}
              filter={filter}
              textOverlays={textOverlays}
              stickerOverlays={stickerOverlays}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              selectedOverlayId={selectedOverlay}
              selectedStickerId={selectedSticker}
              onSelectOverlay={setSelectedOverlay}
              onSelectSticker={setSelectedSticker}
              onMoveOverlay={(id, x, y) => handleUpdateText(id, { x, y })}
              onMoveSticker={(id, x, y) => handleUpdateSticker(id, { x, y })}
            />
          </div>

          {/* Timeline — fixed height, always visible */}
          <div className="flex-shrink-0 border-t border-zinc-700 bg-zinc-900">
            <Timeline
              duration={duration}
              currentTime={currentTime}
              trim={trim}
              thumbnails={thumbnails}
              isPlaying={isPlaying}
              audioTrack={audioTrack}
              onSeek={handleSeek}
              onTrimChange={setTrim}
              onTogglePlay={togglePlay}
              onAudioVolumeChange={(v) => setAudioTrack((a) => a ? { ...a, volume: v } : null)}
              onAudioMuteToggle={() => setAudioTrack((a) => a ? { ...a, muted: !a.muted } : null)}
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[280px] border-l border-zinc-800 bg-zinc-900 overflow-y-auto flex-shrink-0">
          {activeTool === "trim" && (
            <TrimPanel trim={trim} duration={duration} currentTime={currentTime} onTrimChange={setTrim} />
          )}
          {activeTool === "text" && (
            <TextPanel
              overlays={textOverlays}
              selectedId={selectedOverlay}
              duration={duration}
              onAdd={handleAddText}
              onUpdate={handleUpdateText}
              onDelete={handleDeleteText}
              onSelect={setSelectedOverlay}
            />
          )}
          {activeTool === "filter" && (
            <FilterPanel filter={filter} onFilterChange={setFilter} />
          )}
          {activeTool === "sticker" && (
            <StickerPanel
              stickers={stickerOverlays}
              selectedId={selectedSticker}
              onAddSticker={handleAddSticker}
              onUpdate={handleUpdateSticker}
              onDelete={handleDeleteSticker}
              onSelect={setSelectedSticker}
            />
          )}
          {activeTool === "audio" && (
            <AudioPanel
              audioTrack={audioTrack}
              onLoadAudio={handleLoadAudio}
              onVolumeChange={(v) => setAudioTrack((a) => a ? { ...a, volume: v } : null)}
              onMuteToggle={() => setAudioTrack((a) => a ? { ...a, muted: !a.muted } : null)}
              onRemove={handleRemoveAudio}
            />
          )}
        </div>
      </div>

      {/* Hidden audio */}
      {audioTrack && <audio ref={audioRef} src={audioTrack.url} preload="auto" />}

      {/* Export progress overlay */}
      {exporting && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-violet-500/20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-white">Renderizando video...</h3>
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-sm text-zinc-400">{exportProgress}% completado</p>
            <p className="text-xs text-zinc-500">No cierres esta ventana</p>
          </div>
        </div>
      )}
    </div>
  );
}
