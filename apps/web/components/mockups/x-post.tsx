"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Repeat2, Heart, BarChart3, Share, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import type { MockupProps } from "./types";
import { TruncatedText } from "./truncated-text";

export function XPostMockup({
  clientName,
  clientAvatar,
  copy,
  hashtags,
  media,
  scheduledAt,
  className,
}: MockupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayCopy = copy || "Escribe el contenido del post...";
  const fullText = hashtags ? `${displayCopy}\n\n${hashtags}` : displayCopy;
  const hasMedia = media && media.length > 0;
  const currentMedia = hasMedia ? media[currentIndex] : null;
  const isCarousel = media && media.length > 1;
  const handle = `@${clientName.toLowerCase().replace(/\s/g, "")}`;
  const timeAgo = scheduledAt
    ? scheduledAt.toLocaleDateString("es", { day: "numeric", month: "short" })
    : "2h";

  return (
    <div className={cn("bg-white dark:bg-zinc-900 rounded-lg shadow-md border max-w-[500px] w-full", className)}>
      <div className="flex gap-3 p-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          {clientAvatar ? (
            <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {clientName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{clientName}</span>
            {/* Verified badge */}
            <svg className="h-4 w-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.88 13.43 2 12 2s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81C9.33 21.12 10.57 22 12 22s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91C21.12 14.67 22 13.43 22 12zm-11.07 4.83l-3.54-3.54 1.41-1.41 2.13 2.12 4.24-4.24 1.41 1.42-5.65 5.65z" />
            </svg>
            <span className="text-zinc-500 text-sm truncate">{handle}</span>
            <span className="text-zinc-400 text-sm">·</span>
            <span className="text-zinc-500 text-sm flex-shrink-0">{timeAgo}</span>
            <button className="ml-auto p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full flex-shrink-0">
              <MoreHorizontal className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          {copy ? (
            <TruncatedText
              text={fullText}
              maxChars={280}
              className="text-sm whitespace-pre-wrap leading-relaxed text-zinc-900 dark:text-zinc-100"
              accentColor="text-blue-500 dark:text-blue-400"
            />
          ) : (
            <p className="text-sm text-zinc-400 italic">{fullText}</p>
          )}

          {/* Media */}
          {currentMedia ? (
            <div className="relative mt-3 rounded-2xl overflow-hidden border">
              {currentMedia.type === "video" ? (
                <video
                  src={currentMedia.url}
                  className="w-full aspect-video object-cover bg-black"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img src={currentMedia.url} alt="" className="w-full aspect-video object-cover" />
              )}

              {/* Carousel indicator badge */}
              {isCarousel && (
                <div className="absolute top-3 right-3 bg-zinc-800/70 text-white text-xs font-medium px-2 py-1 rounded-full">
                  {currentIndex + 1}/{media!.length}
                </div>
              )}

              {/* Carousel navigation */}
              {isCarousel && currentIndex > 0 && (
                <button
                  onClick={() => setCurrentIndex((i) => i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />
                </button>
              )}
              {isCarousel && currentIndex < media!.length - 1 && (
                <button
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl overflow-hidden border aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <div className="text-zinc-300 dark:text-zinc-600 text-center">
                <div className="w-10 h-10 mx-auto mb-1 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
                  <span className="text-xl">+</span>
                </div>
                <p className="text-xs">Agrega media</p>
              </div>
            </div>
          )}

          {/* Carousel dots */}
          {isCarousel && (
            <div className="flex justify-center gap-1 py-2">
              {media!.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i === currentIndex ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-600"
                  )}
                />
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-3 max-w-[380px]">
            {[
              { icon: <MessageCircle className="h-4 w-4" />, count: "12" },
              { icon: <Repeat2 className="h-4 w-4" />, count: "5" },
              { icon: <Heart className="h-4 w-4" />, count: "48" },
              { icon: <BarChart3 className="h-4 w-4" />, count: "1.2K" },
            ].map(({ icon, count }, i) => (
              <button
                key={i}
                className="flex items-center gap-1 text-zinc-500 hover:text-blue-500 text-xs group"
              >
                <span className="p-1.5 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                  {icon}
                </span>
                <span>{count}</span>
              </button>
            ))}
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-500 hover:text-blue-500">
                <Bookmark className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-500 hover:text-blue-500">
                <Share className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
