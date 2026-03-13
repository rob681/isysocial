"use client";

import { cn } from "@/lib/utils";
import { Heart, MessageCircle, Bookmark, Share2, Music, Plus } from "lucide-react";
import type { MockupProps } from "./types";

export function TikTokMockup({
  clientName,
  clientAvatar,
  copy,
  hashtags,
  media,
  className,
}: MockupProps) {
  const hasMedia = media && media.length > 0;
  const firstMedia = hasMedia ? media[0] : null;
  const displayCopy = copy || "Escribe la descripción...";

  return (
    <div className={cn(
      "relative bg-black rounded-2xl shadow-lg overflow-hidden max-w-[270px] w-full",
      "aspect-[9/16]",
      className
    )}>
      {/* Media / Background */}
      {firstMedia ? (
        firstMedia.type === "video" ? (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[24px] border-l-white border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent ml-1" />
            </div>
          </div>
        ) : (
          <img src={firstMedia.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-black flex items-center justify-center">
          <div className="text-white/30 text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
              <span className="text-3xl text-white/30">+</span>
            </div>
            <p className="text-xs">Agrega un video</p>
          </div>
        </div>
      )}

      {/* Gradient overlay bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent z-10" />

      {/* Right action bar */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 z-20">
        {/* Avatar */}
        <div className="relative mb-2">
          <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden">
            {clientAvatar ? (
              <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {clientName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <Plus className="h-3 w-3 text-white" />
          </div>
        </div>

        <button className="flex flex-col items-center gap-1">
          <Heart className="h-8 w-8 text-white" />
          <span className="text-white text-[10px]">3.5K</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 text-white" />
          <span className="text-white text-[10px]">128</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Bookmark className="h-7 w-7 text-white" />
          <span className="text-white text-[10px]">56</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Share2 className="h-7 w-7 text-white" />
          <span className="text-white text-[10px]">24</span>
        </button>

        {/* Spinning disc */}
        <div className="w-10 h-10 rounded-full border-4 border-zinc-700 bg-zinc-900 overflow-hidden animate-spin-slow">
          {clientAvatar ? (
            <img src={clientAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center">
              <Music className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-16 z-20">
        <p className="text-white font-bold text-sm">
          @{clientName.toLowerCase().replace(/\s/g, "")}
        </p>
        <p className={cn(
          "text-white text-xs leading-relaxed mt-1 line-clamp-3",
          !copy && "text-white/40 italic"
        )}>
          {displayCopy}
        </p>
        {hashtags && (
          <p className="text-white/70 text-xs mt-1">{hashtags}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Music className="h-3 w-3 text-white" />
          <div className="overflow-hidden flex-1">
            <p className="text-white text-[10px] whitespace-nowrap">
              Sonido original · {clientName}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom nav bar (fake) */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/90 px-4 py-2 flex items-center justify-around">
        <span className="text-white text-[10px] font-medium">Inicio</span>
        <span className="text-zinc-500 text-[10px]">Amigos</span>
        <div className="w-8 h-5 bg-white rounded flex items-center justify-center">
          <Plus className="h-4 w-4 text-black" />
        </div>
        <span className="text-zinc-500 text-[10px]">Bandeja</span>
        <span className="text-zinc-500 text-[10px]">Perfil</span>
      </div>
    </div>
  );
}
