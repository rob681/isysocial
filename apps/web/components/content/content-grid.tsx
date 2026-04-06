"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileImage,
  Calendar,
  MessageCircle,
  Play,
  Check,
} from "lucide-react";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType } from "@isysocial/shared";

interface ContentGridPost {
  id: string;
  title: string | null;
  copy: string | null;
  network: string;
  postType: string;
  status: string;
  scheduledAt: string | Date | null;
  media?: { id: string; fileUrl: string; mimeType: string }[];
  _count: { comments: number };
  client?: { companyName: string; logoUrl: string | null } | null;
}

interface ContentGridProps {
  posts: ContentGridPost[];
  basePath: string;
  showClient?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function ContentGrid({ posts, basePath, showClient = false, selectedIds, onToggleSelect }: ContentGridProps) {
  const selectionEnabled = !!selectedIds && !!onToggleSelect;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {posts.map((post) => {
        const statusColor = POST_STATUS_COLORS[post.status as PostStatus] || "";
        const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
        const thumbnail = post.media?.[0]?.fileUrl;
        const isVideo = post.media?.[0]?.mimeType?.startsWith("video/");
        const needsAction = post.status === "IN_REVIEW";
        const isSelected = selectionEnabled && selectedIds.has(post.id);

        const card = (
          <Card className={`group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden h-full ${needsAction ? "ring-2 ring-yellow-400/50" : ""} ${isSelected ? "ring-2 ring-primary shadow-md" : ""}`}>
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              {thumbnail ? (
                <>
                  <img
                    src={thumbnail}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                        <Play className="h-5 w-5 text-zinc-700 ml-0.5" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}

              {/* Status badge overlay */}
              <div className={`absolute ${selectionEnabled ? "top-2 left-10" : "top-2 left-2"}`}>
                <Badge
                  variant="secondary"
                  className={`${statusColor} text-[10px] shadow-sm backdrop-blur-sm`}
                >
                  {POST_STATUS_LABELS[post.status as PostStatus]}
                </Badge>
              </div>

              {/* Network badge overlay */}
              <div className="absolute top-2 right-2">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white shadow-sm"
                  style={{ backgroundColor: networkColor }}
                >
                  {NETWORK_LABELS[post.network as SocialNetwork]}
                </span>
              </div>

              {/* Multi-image indicator */}
              {post.media && post.media.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                  +{post.media.length - 1}
                </div>
              )}
            </div>

            {/* Info */}
            <CardContent className="p-3 space-y-1.5">
              <p className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">
                {post.title || post.copy?.slice(0, 80) || "Sin contenido"}
              </p>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{POST_TYPE_LABELS[post.postType as PostType]}</span>
                  {post._count.comments > 0 && (
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="h-3 w-3" />
                      {post._count.comments}
                    </span>
                  )}
                </div>
                {post.scheduledAt && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.scheduledAt).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </div>

              {showClient && post.client && (
                <div className="flex items-center gap-1.5 pt-1 border-t">
                  {post.client.logoUrl ? (
                    <img
                      src={post.client.logoUrl}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[8px] font-bold">
                      {post.client.companyName.charAt(0)}
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground truncate">
                    {post.client.companyName}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );

        const hasSelection = selectionEnabled && selectedIds.size > 0;

        return (
          <div key={post.id} className="relative group">
            {/* Selection checkbox - outside Link to prevent navigation */}
            {selectionEnabled && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSelect(post.id);
                }}
                className={`absolute top-3 left-3 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : hasSelection
                      ? "bg-white/80 border-zinc-300 hover:border-primary backdrop-blur-sm"
                      : "bg-white/80 border-zinc-300 hover:border-primary backdrop-blur-sm opacity-0 group-hover:opacity-100"
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Card wrapped in Link for navigation */}
            <Link href={`${basePath}/${post.id}`}>
              {card}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
