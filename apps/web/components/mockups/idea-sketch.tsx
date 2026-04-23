"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

const NETWORK_COLORS: Record<string, string> = {
  INSTAGRAM: "#E1306C",
  FACEBOOK: "#1877F2",
  TIKTOK: "#010101",
  LINKEDIN: "#0A66C2",
  X: "#000000",
};

const NETWORK_SHORT: Record<string, string> = {
  INSTAGRAM: "IG",
  FACEBOOK: "FB",
  TIKTOK: "TK",
  LINKEDIN: "LI",
  X: "X",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap');`;
const FONT_FAMILY = "'Kalam', cursive";

/** Max description chars before truncating in compact view */
const DESC_MAX = 110;

interface IdeaSketchMockupProps {
  title?: string;
  description?: string;
  networks?: string[];
  className?: string;
  /** Array of image/video URLs to display */
  images?: string[];
  /** Whether the first item is a video (legacy; use videoFlags for mixed carousels) */
  isVideo?: boolean;
  /** Per-index video flags — takes precedence over isVideo when provided */
  videoFlags?: boolean[];
}

// ─── Inner card (shared between compact + expanded) ────────────────────────
function SketchCard({
  title,
  description,
  networks = [],
  images = [],
  isVideo = false,
  videoFlags,
  expanded = false,
}: IdeaSketchMockupProps & { expanded?: boolean }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const hasImages = images.length > 0;
  const currentImg = images[imgIdx] ?? null;
  // Prefer per-index videoFlags; fall back to legacy isVideo (index 0 only).
  const isCurrentVideo = videoFlags
    ? !!videoFlags[imgIdx]
    : isVideo && imgIdx === 0;

  const truncDesc =
    !descExpanded && description && description.length > DESC_MAX
      ? description.slice(0, DESC_MAX) + "…"
      : description;
  const showVerMas =
    !descExpanded && description && description.length > DESC_MAX;

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx((i) => (i < images.length - 1 ? i + 1 : 0));
  };

  return (
    <>
      {/* SVG defs for pencil filter */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id="idea-pencil">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.04"
              numOctaves="5"
              result="noise"
              seed="2"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Header: bulb + title */}
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 flex items-center justify-center text-xl flex-shrink-0"
          style={{ filter: "url(#idea-pencil)" }}
        >
          💡
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs text-amber-600/70 uppercase"
            style={{ fontFamily: FONT_FAMILY, letterSpacing: "0.18em" }}
          >
            idea
          </p>
          {title ? (
            <p
              className={cn(
                "font-bold text-zinc-800 leading-tight",
                expanded ? "text-2xl" : "text-xl"
              )}
              style={{ fontFamily: FONT_FAMILY }}
            >
              {title}
            </p>
          ) : (
            <SketchLine width="80%" opacity={0.35} />
          )}
        </div>
      </div>

      {/* Image / video / placeholder */}
      <div
        className="w-full border border-amber-800/15 flex items-center justify-center relative overflow-hidden"
        style={{ borderRadius: "8px 20px 10px 18px/18px 10px 20px 8px" }}
      >
        {hasImages && currentImg ? (
          <>
            {isCurrentVideo ? (
              <video
                src={currentImg}
                className={cn(
                  "w-full h-auto object-contain bg-black",
                  expanded ? "max-h-[60vh]" : "max-h-72"
                )}
                muted
                playsInline
                controls={expanded}
              />
            ) : (
              <img
                src={currentImg}
                alt=""
                className={cn(
                  "w-full h-auto object-contain bg-amber-100/60",
                  expanded ? "max-h-[60vh]" : "max-h-72"
                )}
              />
            )}

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5 transition-opacity"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5 transition-opacity"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        i === imgIdx ? "bg-white" : "bg-white/40"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          /* Sketch placeholder */
          <div
            className="w-full bg-amber-100/70 flex items-center justify-center relative"
            style={{ minHeight: "100px", filter: "url(#idea-pencil)" }}
          >
            <svg
              className="absolute inset-0 w-full h-full opacity-20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="hatch"
                  patternUnits="userSpaceOnUse"
                  width="10"
                  height="10"
                  patternTransform="rotate(45)"
                >
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#92400e" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hatch)" />
            </svg>
            <svg
              width="48"
              height="36"
              viewBox="0 0 48 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-30 relative z-10"
            >
              <path
                d="M2 34L14 10L22 22L30 14L46 34H2Z"
                stroke="#92400e"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="38" cy="8" r="5" stroke="#92400e" strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1 px-1">
        {description ? (
          <div>
            <p
              className={cn(
                "text-zinc-600 leading-snug",
                expanded ? "text-lg" : "text-base"
              )}
              style={{ fontFamily: FONT_FAMILY }}
            >
              {truncDesc}
            </p>
            {showVerMas && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDescExpanded(true); }}
                className="text-sm text-amber-700/70 underline underline-offset-2 mt-0.5"
                style={{ fontFamily: FONT_FAMILY }}
              >
                Ver más
              </button>
            )}
            {descExpanded && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDescExpanded(false); }}
                className="text-sm text-amber-700/70 underline underline-offset-2 mt-0.5 ml-2"
                style={{ fontFamily: FONT_FAMILY }}
              >
                Ver menos
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <SketchLine width="100%" />
            <SketchLine width="85%" />
            <SketchLine width="60%" />
          </div>
        )}
      </div>

      {/* Doodle arrow + "borrador" */}
      <div className="flex items-center gap-1.5 px-1">
        <svg
          width="20"
          height="13"
          viewBox="0 0 18 12"
          className="text-amber-500 opacity-60 flex-shrink-0"
          style={{ filter: "url(#idea-pencil)" }}
        >
          <path
            d="M1 6 Q5 2 9 6 Q13 10 17 6"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M14 3L17 6L14 9"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="text-sm text-amber-600/60"
          style={{ fontFamily: FONT_FAMILY, fontStyle: "italic" }}
        >
          borrador
        </span>
      </div>

      {/* Network badges */}
      {networks.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-1">
          {networks.map((net) => (
            <span
              key={net}
              className="inline-flex items-center px-2.5 py-0.5 text-sm font-bold text-white"
              style={{
                backgroundColor: NETWORK_COLORS[net] || "#6b7280",
                filter: "url(#idea-pencil)",
                borderRadius: "12px 4px 10px 4px/4px 10px 4px 12px",
                fontFamily: FONT_FAMILY,
              }}
            >
              {NETWORK_SHORT[net] ?? net}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex gap-1.5 px-1">
          {["IG", "FB", "TK"].map((abbr) => (
            <span
              key={abbr}
              className="inline-flex items-center px-2.5 py-0.5 text-sm font-bold text-zinc-400 rounded-full border border-zinc-300/60"
              style={{
                borderRadius: "12px 4px 10px 4px/4px 10px 4px 12px",
                filter: "url(#idea-pencil)",
                fontFamily: FONT_FAMILY,
              }}
            >
              {abbr}
            </span>
          ))}
        </div>
      )}

      {/* Corner doodle */}
      <svg
        className="absolute bottom-4 right-5 opacity-10 pointer-events-none"
        width="28"
        height="28"
        viewBox="0 0 28 28"
      >
        <path
          d="M4 24 L14 4 L24 24"
          stroke="#92400e"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 17 L20 17"
          stroke="#92400e"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}

// ─── Main exported component ────────────────────────────────────────────────
export function IdeaSketchMockup({
  title,
  description,
  networks = [],
  className,
  images = [],
  isVideo = false,
  videoFlags,
}: IdeaSketchMockupProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock body scroll while overlay is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <style>{FONT_IMPORT}</style>

      {/* Compact card */}
      <div
        className={cn("relative w-full group", className)}
        style={{ fontFamily: FONT_FAMILY }}
      >
        {/* Paper depth shadow */}
        <div
          className="absolute inset-0 bg-amber-100/60 pointer-events-none"
          style={{
            transform: "rotate(1.5deg) translate(4px, 4px)",
            borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
          }}
        />

        {/* Main card */}
        <div
          className="relative bg-amber-50 border-2 border-amber-800/20 p-5 space-y-4"
          style={{
            borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
            minHeight: "320px",
          }}
        >
          {/* Expand button — top-right, visible on hover */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-800/10 hover:bg-amber-800/20 rounded-full p-1.5"
            title="Ver en pantalla completa"
          >
            <Maximize2 className="h-3.5 w-3.5 text-amber-800/60" />
          </button>

          <SketchCard
            title={title}
            description={description}
            networks={networks}
            images={images}
            isVideo={isVideo}
            videoFlags={videoFlags}
          />
        </div>
      </div>

      {/* Fullscreen modal — portal so it sits above the app header/sidebar */}
      {mounted &&
        modalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center py-16 px-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
            onClick={() => setModalOpen(false)}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="fixed top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
            >
              <X className="h-5 w-5 text-zinc-700" />
            </button>

            <div
              className="relative w-full max-w-lg"
              style={{ fontFamily: FONT_FAMILY }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Paper depth shadow */}
              <div
                className="absolute inset-0 bg-amber-100/60 pointer-events-none"
                style={{
                  transform: "rotate(1.5deg) translate(5px, 5px)",
                  borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
                }}
              />

              {/* Expanded card */}
              <div
                className="relative bg-amber-50 border-2 border-amber-800/20 p-6 space-y-5"
                style={{
                  borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
                }}
              >
                <SketchCard
                  title={title}
                  description={description}
                  networks={networks}
                  images={images}
                  isVideo={isVideo}
                  videoFlags={videoFlags}
                  expanded
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Helper: wavy sketch placeholder line
function SketchLine({ width = "100%", opacity = 0.25 }: { width?: string; opacity?: number }) {
  return (
    <div
      className="h-2.5 bg-amber-800/30 rounded-full"
      style={{ width, opacity, filter: "url(#idea-pencil)" }}
    />
  );
}
