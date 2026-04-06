"use client";

import { useRef, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { TrimRange, AudioTrack } from "../types";
import { formatTime } from "../utils";

interface TimelineProps {
  duration: number;
  currentTime: number;
  trim: TrimRange;
  thumbnails: string[];
  isPlaying: boolean;
  audioTrack: AudioTrack | null;
  onSeek: (time: number) => void;
  onTrimChange: (trim: TrimRange) => void;
  onTogglePlay: () => void;
  onAudioVolumeChange?: (volume: number) => void;
  onAudioMuteToggle?: () => void;
}

export function Timeline({
  duration,
  currentTime,
  trim,
  thumbnails,
  isPlaying,
  audioTrack,
  onSeek,
  onTrimChange,
  onTogglePlay,
  onAudioVolumeChange,
  onAudioMuteToggle,
}: TimelineProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  // Convert pixel X to time
  const xToTime = useCallback((clientX: number): number => {
    const el = stripRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  // Click to seek
  const handleStripClick = useCallback((e: React.MouseEvent) => {
    const t = xToTime(e.clientX);
    if (t >= trim.start && t <= trim.end) {
      onSeek(t);
    }
  }, [xToTime, trim, onSeek]);

  // Drag trim handle
  const startDrag = useCallback((handle: "start" | "end", e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const t = xToTime(ev.clientX);
      if (handle === "start") {
        onTrimChange({ ...trim, start: Math.max(0, Math.min(t, trim.end - 0.5)) });
      } else {
        onTrimChange({ ...trim, end: Math.max(trim.start + 0.5, Math.min(t, duration)) });
      }
    };

    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  }, [xToTime, trim, duration, onTrimChange]);

  // Playhead position as percentage
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trimStartPct = duration > 0 ? (trim.start / duration) * 100 : 0;
  const trimEndPct = duration > 0 ? (trim.end / duration) * 100 : 100;

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-3 space-y-2 flex-shrink-0">
      {/* Row 1: Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-zinc-200 transition-colors flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-black" fill="black" />
          ) : (
            <Play className="h-4 w-4 text-black ml-0.5" fill="black" />
          )}
        </button>

        <span className="text-xs font-mono text-zinc-300 w-20 flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Audio volume (if audio track exists) */}
        {audioTrack && (
          <div className="flex items-center gap-1.5 ml-auto">
            <button type="button" onClick={onAudioMuteToggle} className="text-zinc-400 hover:text-white transition-colors">
              {audioTrack.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audioTrack.volume * 100)}
              onChange={(e) => onAudioVolumeChange?.(parseInt(e.target.value) / 100)}
              className="w-20 accent-violet-500 h-1"
            />
          </div>
        )}
      </div>

      {/* Row 2: Thumbnail strip with trim handles + playhead */}
      <div
        ref={stripRef}
        className="relative h-14 rounded-lg overflow-hidden cursor-pointer select-none"
        onClick={handleStripClick}
      >
        {/* Thumbnail images */}
        <div className="absolute inset-0 flex">
          {thumbnails.length > 0 ? (
            thumbnails.map((thumb, i) => (
              <img
                key={i}
                src={thumb}
                alt=""
                className="h-full flex-1 object-cover"
                draggable={false}
              />
            ))
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 animate-pulse" />
          )}
        </div>

        {/* Trimmed-out dark overlays */}
        {trimStartPct > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/70"
            style={{ width: `${trimStartPct}%` }}
          />
        )}
        {trimEndPct < 100 && (
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/70"
            style={{ width: `${100 - trimEndPct}%` }}
          />
        )}

        {/* Trim region border */}
        <div
          className="absolute top-0 bottom-0 border-y-2 border-amber-400"
          style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }}
        />

        {/* Start trim handle */}
        <div
          className="absolute top-0 bottom-0 w-3 bg-amber-400 cursor-col-resize z-10 flex items-center justify-center rounded-l-sm"
          style={{ left: `calc(${trimStartPct}% - 6px)` }}
          onPointerDown={(e) => startDrag("start", e)}
        >
          <div className="w-0.5 h-5 bg-amber-800 rounded-full" />
        </div>

        {/* End trim handle */}
        <div
          className="absolute top-0 bottom-0 w-3 bg-amber-400 cursor-col-resize z-10 flex items-center justify-center rounded-r-sm"
          style={{ left: `calc(${trimEndPct}% - 6px)` }}
          onPointerDown={(e) => startDrag("end", e)}
        >
          <div className="w-0.5 h-5 bg-amber-800 rounded-full" />
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        >
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow" />
        </div>
      </div>
    </div>
  );
}
