"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

interface MockupExpandableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps any mockup with a hover expand button.
 * On click, renders the same mockup in a fullscreen portal overlay so it
 * always sits above the app header/sidebar, regardless of stacking contexts.
 *
 * Fixes:
 * - Hides compact view when expanded (prevents double video playback)
 * - Expands phone-frame mockups to a larger size via CSS zoom
 */
export function MockupExpandable({ children, className }: MockupExpandableProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const compactRef = useRef<HTMLDivElement>(null);

  // Only render portal on the client
  useEffect(() => setMounted(true), []);

  // Lock body scroll while overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Pause/mute all videos in the compact view when overlay opens
  useEffect(() => {
    if (!compactRef.current) return;
    const videos = compactRef.current.querySelectorAll<HTMLVideoElement>("video");
    if (open) {
      videos.forEach((v) => {
        v.pause();
        v.muted = true;
      });
    } else {
      // Restore mute state to false when closing (video will re-play on interaction)
      videos.forEach((v) => {
        v.muted = false;
      });
    }
  }, [open]);

  return (
    <>
      {/* Compact view — hidden (display:none) while expanded to stop video playback */}
      <div
        ref={compactRef}
        className={`relative group w-full flex justify-center ${className ?? ""} ${open ? "hidden" : ""}`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 shadow"
          title="Ver en pantalla completa"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        {children}
      </div>

      {/* Fullscreen overlay — rendered at document.body via portal so it
          always stacks above the app layout header/sidebar */}
      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center py-10 px-6 bg-black/85 backdrop-blur-sm overflow-y-auto"
            onClick={() => setOpen(false)}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="fixed top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
              title="Cerrar"
            >
              <X className="h-5 w-5 text-zinc-700" />
            </button>

            {/* Mockup container — zoom:1.6 makes phone-frame mockups (270px) render
                at ~430px without changing the component's internal layout.
                flex justify-center centers them inside the max-w-xl box. */}
            <div
              className="relative w-full max-w-xl flex justify-center"
              style={{ zoom: 1.55 }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
