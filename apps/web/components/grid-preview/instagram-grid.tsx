"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { FileImage, Instagram, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostType } from "@isysocial/shared";
import { POST_TYPE_LABELS } from "@isysocial/shared";
import Link from "next/link";

interface InstagramGridProps {
  clientId: string;
  network: "INSTAGRAM" | "TIKTOK";
  limit?: number;
  linkPrefix?: string; // e.g. "/admin/contenido"
}

export function InstagramGrid({
  clientId,
  network,
  limit = 9,
  linkPrefix = "/admin/contenido",
}: InstagramGridProps) {
  const { data, isLoading } = trpc.posts.list.useQuery({
    clientId,
    network,
    status: ["APPROVED", "SCHEDULED", "PUBLISHED"],
    page: 1,
    limit,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: limit }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-none" />
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
          No hay publicaciones aprobadas para {network === "INSTAGRAM" ? "Instagram" : "TikTok"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 bg-zinc-200 dark:bg-zinc-800">
      {posts.map((post) => {
        const thumbnail = post.media?.[0]?.fileUrl;
        const isVideo = post.postType === "REEL" || post.postType === "VIDEO" || post.postType === "STORY";

        return (
          <Link key={post.id} href={`${linkPrefix}/${post.id}`}>
            <div
              className={cn(
                "aspect-square bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative group cursor-pointer",
                "hover:opacity-90 transition-opacity"
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
                  <FileImage className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}

              {/* Video indicator */}
              {isVideo && (
                <div className="absolute top-1.5 right-1.5">
                  <Film className="h-4 w-4 text-white drop-shadow-md" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white text-xs font-medium text-center px-2 line-clamp-2">
                  {post.title || POST_TYPE_LABELS[post.postType as PostType]}
                </p>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Fill remaining cells to complete grid */}
      {posts.length < limit &&
        Array.from({ length: limit - posts.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-700"
          >
            <FileImage className="h-6 w-6 text-muted-foreground/15" />
          </div>
        ))}
    </div>
  );
}
