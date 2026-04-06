"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Globe, ThumbsUp, MessageCircle, Share2, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import type { MockupProps } from "./types";

export function FacebookPostMockup({
  clientName,
  clientAvatar,
  copy,
  hashtags,
  media,
  scheduledAt,
  className,
}: MockupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayCopy = copy || "Escribe el copy de tu publicación...";
  const fullText = hashtags ? `${displayCopy}\n\n${hashtags}` : displayCopy;
  const hasMedia = media && media.length > 0;
  const currentMedia = hasMedia ? media[currentIndex] : null;
  const isCarousel = media && media.length > 1;
  const timeAgo = scheduledAt
    ? scheduledAt.toLocaleDateString("es", { day: "numeric", month: "short" })
    : "Ahora mismo";

  return (
    <div className={cn("bg-white dark:bg-zinc-900 rounded-lg shadow-md border max-w-[500px] w-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 pb-2">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {clientAvatar ? (
            <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-blue-600 font-bold text-sm">
              {clientName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{clientName}</p>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <span>{timeAgo}</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
          </div>
        </div>
        <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
          <MoreHorizontal className="h-5 w-5 text-zinc-400" />
        </button>
      </div>

      {/* Copy */}
      <div className="px-3 pb-2">
        <p className={cn(
          "text-sm whitespace-pre-wrap",
          !copy && "text-zinc-400 italic"
        )}>
          {fullText}
        </p>
      </div>

      {/* Media — images: 4:5, video: native aspect ratio (Facebook supports vertical, horizontal, square) */}
      {currentMedia ? (
        <div className="relative w-full bg-zinc-900 overflow-hidden" style={currentMedia.type === "video" ? {} : { aspectRatio: "4/5" }}>
          {currentMedia.type === "video" ? (
            <video
              src={currentMedia.url}
              className="w-full bg-black"
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={currentMedia.url} alt="" className="w-full h-full object-cover" />
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
        <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <div className="text-zinc-300 dark:text-zinc-600 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
            <p className="text-xs">Agrega una imagen</p>
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
                i === currentIndex ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"
              )}
            />
          ))}
        </div>
      )}

      {/* Reactions bar */}
      <div className="px-3 py-2 flex items-center justify-between border-b text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">👍</span>
            <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">❤️</span>
          </div>
          <span className="ml-1">24</span>
        </div>
        <div className="flex items-center gap-3">
          <span>5 comentarios</span>
          <span>2 compartidos</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-around p-1">
        {[
          { icon: <ThumbsUp className="h-4 w-4" />, label: "Me gusta" },
          { icon: <MessageCircle className="h-4 w-4" />, label: "Comentar" },
          { icon: <Share2 className="h-4 w-4" />, label: "Compartir" },
        ].map(({ icon, label }) => (
          <button
            key={label}
            className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 text-sm font-medium"
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
