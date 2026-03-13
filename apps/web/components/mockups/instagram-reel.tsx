"use client";

import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Send, Bookmark, Music } from "lucide-react";
import type { MockupProps } from "./types";

export function InstagramReelMockup({
  clientName,
  clientAvatar,
  copy,
  hashtags,
  media,
  className,
}: MockupProps) {
  const hasMedia = media && media.length > 0;
  const firstMedia = hasMedia ? media[0] : null;
  const displayCopy = copy || "Escribe la descripción del reel...";

  return (
    <div className={cn(
      "relative bg-zinc-900 rounded-2xl shadow-lg overflow-hidden max-w-[270px] w-full",
      "aspect-[9/16]",
      className
    )}>
      {/* Media / Background */}
      {firstMedia ? (
        firstMedia.type === "video" ? (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[24px] border-l-white border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent ml-1" />
            </div>
          </div>
        ) : (
          <img src={firstMedia.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center">
          <div className="text-white/40 text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-lg border-2 border-dashed border-white/30 flex items-center justify-center">
              <span className="text-3xl text-white/40">+</span>
            </div>
            <p className="text-xs">Agrega un video</p>
          </div>
        </div>
      )}

      {/* Gradient overlay bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent z-10" />

      {/* Right action bar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-20">
        <button className="flex flex-col items-center gap-1">
          <Heart className="h-7 w-7 text-white" />
          <span className="text-white text-[10px]">1.2K</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <MessageCircle className="h-7 w-7 text-white" />
          <span className="text-white text-[10px]">45</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Send className="h-7 w-7 text-white" />
          <span className="text-white text-[10px]">12</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Bookmark className="h-6 w-6 text-white" />
        </button>
        {/* Music album */}
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white/30 overflow-hidden">
          {clientAvatar ? (
            <img src={clientAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music className="h-4 w-4 text-white m-auto mt-1" />
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-14 z-20">
        {/* Username */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/30">
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
          <p className="text-white font-semibold text-sm">
            {clientName.toLowerCase().replace(/\s/g, "")}
          </p>
          <button className="text-white text-xs border border-white/50 rounded px-2 py-0.5">
            Seguir
          </button>
        </div>

        {/* Caption */}
        <p className={cn(
          "text-white text-xs leading-relaxed line-clamp-2",
          !copy && "text-white/50 italic"
        )}>
          {displayCopy}
        </p>
        {hashtags && (
          <p className="text-white/70 text-xs mt-1">{hashtags}</p>
        )}

        {/* Audio */}
        <div className="flex items-center gap-2 mt-2">
          <Music className="h-3 w-3 text-white" />
          <div className="overflow-hidden flex-1">
            <p className="text-white text-[10px] whitespace-nowrap">
              Audio original · {clientName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
