"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, Heart, Send } from "lucide-react";
import type { MockupProps } from "./types";

export function InstagramStoryMockup({
  clientName,
  clientAvatar,
  copy,
  media,
  className,
}: MockupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasMedia = media && media.length > 0;
  const currentMedia = hasMedia ? media[currentIndex] : null;
  const totalSlides = media ? media.length : 1;

  const goNext = () => {
    if (media && currentIndex < media.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  return (
    <div className={cn(
      "relative bg-zinc-900 rounded-2xl shadow-lg overflow-hidden max-w-[270px] w-full",
      "aspect-[9/16]",
      className
    )}>
      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden cursor-pointer"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                i < currentIndex
                  ? "w-full bg-white"
                  : i === currentIndex
                  ? "w-2/3 bg-white"
                  : "w-0"
              )}
            />
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-5 left-3 right-3 flex items-center gap-2 z-20">
        <div className="w-8 h-8 rounded-full ring-2 ring-white overflow-hidden flex-shrink-0">
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
        <p className="text-white text-sm font-medium drop-shadow">
          {clientName.toLowerCase().replace(/\s/g, "")}
        </p>
        <span className="text-white/60 text-xs">2h</span>
      </div>

      {/* Tap navigation areas */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-0 top-0 w-1/3 h-full z-30 cursor-pointer"
            aria-label="Anterior"
          />
          <button
            onClick={goNext}
            className="absolute right-0 top-0 w-1/3 h-full z-30 cursor-pointer"
            aria-label="Siguiente"
          />
        </>
      )}

      {/* Media / Background */}
      {currentMedia ? (
        currentMedia.type === "video" ? (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
            </div>
          </div>
        ) : (
          <img src={currentMedia.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
          <div className="text-white/60 text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-lg border-2 border-dashed border-white/40 flex items-center justify-center">
              <span className="text-3xl text-white/60">+</span>
            </div>
            <p className="text-xs">Agrega contenido</p>
          </div>
        </div>
      )}

      {/* Gradient overlay bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent z-10" />

      {/* Copy overlay */}
      {copy && (
        <div className="absolute bottom-20 left-4 right-4 z-20">
          <p className="text-white text-sm font-medium drop-shadow-lg text-center">
            {copy}
          </p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 z-20">
        <div className="flex-1 border border-white/40 rounded-full px-4 py-1.5">
          <p className="text-white/60 text-sm">Enviar mensaje</p>
        </div>
        <Heart className="h-6 w-6 text-white" />
        <Send className="h-6 w-6 text-white" />
      </div>

      {/* Swipe up indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
        <ChevronUp className="h-5 w-5 text-white/50 animate-bounce" />
      </div>
    </div>
  );
}
