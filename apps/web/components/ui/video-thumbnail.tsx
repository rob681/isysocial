"use client";

import { useState } from "react";
import { Film } from "lucide-react";

interface VideoThumbnailProps {
  src: string;
  className?: string;
}

/**
 * Renders the first frame of a video by briefly auto-playing (muted) and
 * then pausing at 0.1s. This forces the browser to actually decode a frame,
 * which is necessary because some browsers / CDNs (Supabase) don't honor
 * the `#t=0.1` media fragment alone.
 *
 * No canvas, no CORS headers required. The video never actually plays
 * visibly — we pause on the first loaded frame.
 */
export function VideoThumbnail({ src, className }: VideoThumbnailProps) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (errored) {
    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-zinc-900`}>
        <Film className="h-6 w-6 text-zinc-400" />
      </div>
    );
  }

  return (
    <div className={`${className ?? ""} relative overflow-hidden bg-zinc-900`}>
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}
      <video
        src={src}
        className={`w-full h-full object-cover ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}
        muted
        playsInline
        autoPlay
        loop={false}
        preload="auto"
        onLoadedData={(e) => {
          // Force frame to render, then immediately pause
          const v = e.currentTarget;
          try {
            v.pause();
            // Seek to 0.1s for a slightly better frame (skip black intro)
            if (v.duration > 0.2) {
              v.currentTime = 0.1;
            }
          } catch {
            // Ignore pause/seek errors
          }
          setLoaded(true);
        }}
        onCanPlay={(e) => {
          // Belt & suspenders: ensure paused
          try {
            e.currentTarget.pause();
          } catch {
            // Ignore
          }
        }}
        onError={() => setErrored(true)}
      />
    </div>
  );
}
