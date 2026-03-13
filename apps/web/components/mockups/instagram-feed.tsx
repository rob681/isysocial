"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import type { MockupProps } from "./types";

export function InstagramFeedMockup({
  clientName,
  clientAvatar,
  copy,
  hashtags,
  media,
  className,
}: MockupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayCopy = copy || "Escribe el caption...";
  const hasMedia = media && media.length > 0;
  const currentMedia = hasMedia ? media[currentIndex] : null;
  const isCarousel = media && media.length > 1;

  return (
    <div className={cn("bg-white dark:bg-zinc-900 rounded-lg shadow-md border max-w-[468px] w-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-8 h-8 rounded-full ring-2 ring-pink-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 overflow-hidden flex-shrink-0">
          {clientAvatar ? (
            <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {clientName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{clientName.toLowerCase().replace(/\s/g, "")}</p>
        </div>
        <button className="p-1">
          <MoreHorizontal className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
        </button>
      </div>

      {/* Media */}
      <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {currentMedia ? (
          currentMedia.type === "video" ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
              </div>
            </div>
          ) : (
            <img src={currentMedia.url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-zinc-300 dark:text-zinc-600 text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
                <span className="text-3xl">+</span>
              </div>
              <p className="text-xs">Agrega una imagen</p>
            </div>
          </div>
        )}

        {/* Carousel indicator badge */}
        {isCarousel && (
          <div className="absolute top-3 right-3 bg-zinc-800/70 text-white text-xs font-medium px-2 py-1 rounded-full">
            {currentIndex + 1}/{media!.length}
          </div>
        )}

        {/* Carousel navigation buttons */}
        {isCarousel && currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-zinc-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />
          </button>
        )}
        {isCarousel && currentIndex < media!.length - 1 && (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 dark:bg-zinc-800/80 shadow-md flex items-center justify-center hover:bg-white dark:hover:bg-zinc-700 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />
          </button>
        )}
      </div>

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
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 text-zinc-900 dark:text-zinc-100 cursor-pointer hover:text-zinc-500" />
          <MessageCircle className="h-6 w-6 text-zinc-900 dark:text-zinc-100 cursor-pointer hover:text-zinc-500" />
          <Send className="h-6 w-6 text-zinc-900 dark:text-zinc-100 cursor-pointer hover:text-zinc-500" />
        </div>
        <Bookmark className="h-6 w-6 text-zinc-900 dark:text-zinc-100 cursor-pointer hover:text-zinc-500" />
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">128 Me gusta</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-2">
        <p className="text-sm">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 mr-1">
            {clientName.toLowerCase().replace(/\s/g, "")}
          </span>
          <span className={cn(!copy && "text-zinc-400 italic")}>
            {displayCopy}
          </span>
        </p>
        {hashtags && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{hashtags}</p>
        )}
      </div>

      {/* Comments preview */}
      <div className="px-3 pb-2">
        <p className="text-xs text-zinc-400">Ver los 12 comentarios</p>
      </div>

      {/* Timestamp */}
      <div className="px-3 pb-3">
        <p className="text-[10px] text-zinc-400 uppercase">Hace 2 horas</p>
      </div>
    </div>
  );
}
