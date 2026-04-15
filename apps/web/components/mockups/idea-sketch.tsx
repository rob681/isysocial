"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

interface IdeaSketchMockupProps {
  title?: string;
  description?: string;
  networks?: string[];
  className?: string;
  /** Array of image/video URLs to display in the placeholder */
  images?: string[];
  /** Whether the first image is a video */
  isVideo?: boolean;
}

export function IdeaSketchMockup({
  title,
  description,
  networks = [],
  className,
  images = [],
  isVideo = false,
}: IdeaSketchMockupProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const hasImages = images.length > 0;
  const currentImg = images[imgIdx] ?? null;

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
      {/* Load Caveat handwritten font */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap');`}</style>

      <div
        className={cn("relative w-full max-w-[320px] mx-auto", className)}
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        {/* Paper depth shadow */}
        <div
          className="absolute inset-0 bg-amber-100/60"
          style={{
            transform: "rotate(1.5deg) translate(4px, 4px)",
            borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
          }}
        />

        {/* Main sketch card */}
        <div
          className="relative bg-amber-50 border-2 border-amber-800/20 p-5 space-y-4"
          style={{
            borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px",
            minHeight: "360px",
          }}
        >
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
                style={{ fontFamily: "'Caveat', cursive", letterSpacing: "0.18em" }}
              >
                idea
              </p>
              {title ? (
                <p
                  className="text-xl font-bold text-zinc-800 leading-tight"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  {title}
                </p>
              ) : (
                <SketchLine width="80%" opacity={0.35} />
              )}
            </div>
          </div>

          {/* Image / placeholder box */}
          <div
            className="w-full border border-amber-800/15 flex items-center justify-center relative overflow-hidden"
            style={{
              minHeight: hasImages ? undefined : "120px",
              borderRadius: "8px 20px 10px 18px/18px 10px 20px 8px",
            }}
          >
            {hasImages && currentImg ? (
              <>
                {/* Actual image or video — object-contain so nothing gets cropped */}
                {isVideo && imgIdx === 0 ? (
                  <video
                    src={currentImg}
                    className="w-full max-h-56 object-contain bg-amber-100/60"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={currentImg}
                    alt=""
                    className="w-full max-h-56 object-contain bg-amber-100/60"
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
              /* Sketch placeholder with hatching */
              <div
                className="w-full h-full bg-amber-100/70 flex items-center justify-center relative"
                style={{ filter: "url(#idea-pencil)" }}
              >
                {/* Diagonal hatching */}
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
                {/* Mountain icon */}
                <svg
                  width="48"
                  height="36"
                  viewBox="0 0 48 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="opacity-30 relative z-10"
                >
                  <path d="M2 34L14 10L22 22L30 14L46 34H2Z" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="38" cy="8" r="5" stroke="#92400e" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2 px-1">
            {description ? (
              <p
                className="text-base text-zinc-600 leading-snug line-clamp-3"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {description}
              </p>
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
              style={{ fontFamily: "'Caveat', cursive", fontStyle: "italic" }}
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
                    fontFamily: "'Caveat', cursive",
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
                    fontFamily: "'Caveat', cursive",
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
            <path d="M4 24 L14 4 L24 24" stroke="#92400e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 17 L20 17" stroke="#92400e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>
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
