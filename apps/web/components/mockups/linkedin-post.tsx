"use client";

import { cn } from "@/lib/utils";
import { Globe, ThumbsUp, MessageCircle, Repeat2, Send, MoreHorizontal } from "lucide-react";
import type { MockupProps } from "./types";

export function LinkedInPostMockup({
  clientName,
  clientAvatar,
  copy,
  hashtags,
  media,
  scheduledAt,
  className,
}: MockupProps) {
  const displayCopy = copy || "Escribe el copy de tu publicación...";
  const fullText = hashtags ? `${displayCopy}\n\n${hashtags}` : displayCopy;
  const hasMedia = media && media.length > 0;
  const firstMedia = hasMedia ? media[0] : null;
  const isCarousel = media && media.length > 1;
  const timeAgo = scheduledAt
    ? scheduledAt.toLocaleDateString("es", { day: "numeric", month: "short" })
    : "Ahora";

  return (
    <div className={cn("bg-white dark:bg-zinc-900 rounded-lg shadow-md border max-w-[500px] w-full", className)}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="w-12 h-12 rounded-full bg-blue-100 overflow-hidden flex-shrink-0">
          {clientAvatar ? (
            <img src={clientAvatar} alt={clientName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {clientName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{clientName}</p>
          <p className="text-xs text-zinc-500 line-clamp-1">Empresa de marketing digital</p>
          <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
            <span>{timeAgo}</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
          </div>
        </div>
        <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
          <MoreHorizontal className="h-5 w-5 text-zinc-400" />
        </button>
      </div>

      {/* Copy */}
      <div className="px-4 pb-3">
        <p className={cn(
          "text-sm whitespace-pre-wrap leading-relaxed",
          !copy && "text-zinc-400 italic"
        )}>
          {fullText.length > 200 ? fullText.slice(0, 200) + "..." : fullText}
        </p>
        {fullText.length > 200 && (
          <button className="text-blue-600 text-sm font-medium mt-1">...ver más</button>
        )}
      </div>

      {/* Media */}
      {firstMedia ? (
        <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          {firstMedia.type === "video" ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[18px] border-l-white border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
              </div>
            </div>
          ) : (
            <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
          )}
          {isCarousel && (
            <div className="absolute top-3 right-3 bg-zinc-800/70 text-white text-xs font-medium px-2 py-1 rounded">
              1/{media!.length}
            </div>
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

      {/* Reactions */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-zinc-500 border-b">
        <div className="flex items-center gap-1">
          <span className="text-base">👍</span>
          <span className="text-base">🎉</span>
          <span className="text-base">💡</span>
          <span className="ml-1">42 reacciones</span>
        </div>
        <span>8 comentarios</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-around p-1">
        {[
          { icon: <ThumbsUp className="h-4 w-4" />, label: "Recomendar" },
          { icon: <MessageCircle className="h-4 w-4" />, label: "Comentar" },
          { icon: <Repeat2 className="h-4 w-4" />, label: "Compartir" },
          { icon: <Send className="h-4 w-4" />, label: "Enviar" },
        ].map(({ icon, label }) => (
          <button
            key={label}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 text-xs font-medium"
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
