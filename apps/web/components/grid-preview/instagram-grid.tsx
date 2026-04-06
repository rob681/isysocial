"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { FileImage, Film, Clock, CheckCircle2, Send, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostType, PostStatus } from "@isysocial/shared";
import { POST_TYPE_LABELS, POST_STATUS_LABELS } from "@isysocial/shared";
import Link from "next/link";

interface InstagramGridProps {
  clientId: string;
  network: "INSTAGRAM" | "TIKTOK";
  limit?: number;
  linkPrefix?: string;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Borrador", bg: "bg-zinc-500", icon: null },
  IN_REVIEW: { label: "Revisión", bg: "bg-amber-500", icon: null },
  APPROVED: { label: "Aprobado", bg: "bg-blue-500", icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
  SCHEDULED: { label: "Programado", bg: "bg-purple-500", icon: <Clock className="h-2.5 w-2.5" /> },
  PUBLISHED: { label: "Publicado", bg: "bg-green-500", icon: <Send className="h-2.5 w-2.5" /> },
};

export function InstagramGrid({
  clientId,
  network,
  limit = 18,
  linkPrefix = "/admin/contenido",
}: InstagramGridProps) {
  // Fetch all relevant statuses — shows scheduled + published content
  const { data, isLoading } = trpc.posts.list.useQuery({
    clientId,
    network,
    status: ["APPROVED", "SCHEDULED", "PUBLISHED"],
    page: 1,
    limit,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-[2px]">
        {Array.from({ length: limit > 9 ? 9 : limit }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-[3px]" />
        ))}
      </div>
    );
  }

  const posts = data?.posts || [];

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileImage className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          No hay publicaciones para {network === "INSTAGRAM" ? "Instagram" : "TikTok"}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Los posts aprobados y programados aparecerán aquí
        </p>
      </div>
    );
  }

  // Separate published (bottom, chronological) and upcoming (top, future)
  const published = posts.filter((p) => p.status === "PUBLISHED");
  const upcoming = posts.filter((p) => p.status !== "PUBLISHED");
  // Show upcoming first (preview of future grid), then published
  const orderedPosts = [...upcoming, ...published].slice(0, limit);

  return (
    <div className="bg-white dark:bg-zinc-950">
      {/* Legend */}
      {upcoming.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Programado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Aprobado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Publicado
          </span>
        </div>
      )}

      {/* Instagram-style 4:5 grid */}
      <div className="grid grid-cols-3 gap-[2px] bg-zinc-100 dark:bg-zinc-800">
        {orderedPosts.map((post) => {
          const thumbnail = post.media?.[0]?.fileUrl;
          const isVideo = post.postType === "REEL" || post.postType === "VIDEO" || post.postType === "STORY";
          const isCarousel = post.postType === "CAROUSEL" || (post.media?.length || 0) > 1;
          const statusInfo = STATUS_BADGE[post.status] || STATUS_BADGE.DRAFT;
          const isScheduled = post.status === "SCHEDULED" || post.status === "APPROVED";

          return (
            <Link key={post.id} href={`${linkPrefix}/${post.id}`}>
              <div
                className={cn(
                  "aspect-[4/5] bg-white dark:bg-zinc-950 overflow-hidden relative group cursor-pointer rounded-[2px]",
                  "hover:brightness-90 transition-all duration-150",
                  isScheduled && "ring-1 ring-inset ring-purple-300/40 dark:ring-purple-500/30"
                )}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={post.title || "Post"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                    <FileImage className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                )}

                {/* Scheduled overlay — subtle dashed border + opacity */}
                {isScheduled && !thumbnail && (
                  <div className="absolute inset-0 border-2 border-dashed border-purple-300/50 dark:border-purple-500/40 rounded-[2px]" />
                )}

                {/* Video indicator (top-right) */}
                {isVideo && (
                  <div className="absolute top-1.5 right-1.5">
                    <Film className="h-4 w-4 text-white drop-shadow-lg" />
                  </div>
                )}

                {/* Carousel indicator (top-right) */}
                {isCarousel && !isVideo && (
                  <div className="absolute top-1.5 right-1.5">
                    <Layers className="h-4 w-4 text-white drop-shadow-lg" />
                  </div>
                )}

                {/* Status badge (bottom-left) — only for non-published */}
                {post.status !== "PUBLISHED" && (
                  <div className={cn(
                    "absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white text-[9px] font-medium",
                    statusInfo.bg
                  )}>
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <p className="text-white text-xs font-medium text-center px-2 line-clamp-2">
                    {post.title || POST_TYPE_LABELS[post.postType as PostType]}
                  </p>
                  {post.scheduledAt && (
                    <p className="text-white/70 text-[10px]">
                      {new Date(post.scheduledAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Fill remaining cells */}
        {orderedPosts.length < 9 &&
          Array.from({ length: Math.max(0, 9 - orderedPosts.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-[4/5] bg-white dark:bg-zinc-950 flex items-center justify-center"
            >
              <FileImage className="h-6 w-6 text-muted-foreground/10" />
            </div>
          ))}
      </div>
    </div>
  );
}
