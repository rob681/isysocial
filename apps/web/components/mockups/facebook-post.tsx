"use client";

import { cn } from "@/lib/utils";
import { Globe, ThumbsUp, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
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
  const displayCopy = copy || "Escribe el copy de tu publicación...";
  const fullText = hashtags ? `${displayCopy}\n\n${hashtags}` : displayCopy;
  const hasMedia = media && media.length > 0;
  const firstMedia = hasMedia ? media[0] : null;
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

      {/* Media */}
      {firstMedia && (
        <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          {firstMedia.type === "video" ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
              </div>
            </div>
          ) : (
            <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {!hasMedia && (
        <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <div className="text-zinc-300 dark:text-zinc-600 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
            <p className="text-xs">Agrega una imagen</p>
          </div>
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
