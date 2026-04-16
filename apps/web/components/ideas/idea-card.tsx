"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageCircle,
  Link2,
  Image,
  Calendar,
  Play,
  User2,
} from "lucide-react";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import {
  IDEA_STATUS_LABELS,
  IDEA_STATUS_COLORS,
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostType, IdeaStatus } from "@isysocial/shared";
import { cn } from "@/lib/utils";

interface IdeaCardProps {
  idea: {
    id: string;
    title: string;
    description?: string | null;
    network?: string | null;
    postType?: string | null;
    status: string;
    tentativeDate?: string | Date | null;
    client?: {
      companyName: string;
      user?: { name: string; avatarUrl?: string | null } | null;
    } | null;
    isClientIdea?: boolean;
    media?: { fileUrl: string; mimeType?: string | null }[];
    _count?: { comments: number; links: number; media: number };
  };
  basePath: string;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function IdeaCard({ idea, basePath, isDraggable, onDragStart }: IdeaCardProps) {
  const statusColor = IDEA_STATUS_COLORS[idea.status as IdeaStatus] || "";
  const networkColor = idea.network
    ? NETWORK_COLORS[idea.network as SocialNetwork] || "#888"
    : null;
  const firstMedia = idea.media?.[0];
  const thumbnail = firstMedia?.fileUrl;
  const isVideo = firstMedia?.mimeType?.startsWith("video/") ?? false;

  return (
    <Link href={`${basePath}/${idea.id}`}>
      <Card
        className={cn(
          "hover:shadow-md transition-all cursor-pointer group overflow-hidden",
          isDraggable && "active:scale-[0.98]"
        )}
        draggable={isDraggable}
        onDragStart={onDragStart}
      >
        {/* Hero media thumbnail — full bleed */}
        {thumbnail && (
          <div className="w-full h-40 bg-zinc-900 overflow-hidden relative flex items-center justify-center">
            {isVideo ? (
              <>
                <VideoThumbnail
                  src={thumbnail}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
                    <Play className="h-4 w-4 text-zinc-800 ml-0.5" />
                  </div>
                </div>
              </>
            ) : (
              <img
                src={thumbnail}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
          </div>
        )}

        <CardContent className="p-3 space-y-2">
          {/* Client idea badge */}
          {idea.isClientIdea && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium flex items-center gap-0.5">
                <User2 className="h-2.5 w-2.5" />
                Idea del cliente
              </span>
            </div>
          )}

          {/* Title */}
          <p className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {idea.title}
          </p>

          {/* Description excerpt */}
          {idea.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {idea.description}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {idea.network && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: networkColor || "#888" }}
              >
                {NETWORK_LABELS[idea.network as SocialNetwork]}
              </span>
            )}
            {idea.postType && (
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-full">
                {POST_TYPE_LABELS[idea.postType as PostType]}
              </span>
            )}
          </div>

          {/* Client */}
          {idea.client && (
            <p className="text-xs text-muted-foreground truncate">
              {idea.client.companyName}
            </p>
          )}

          {/* Date + counters */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            {idea.tentativeDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(idea.tentativeDate).toLocaleDateString("es", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            {(idea._count?.comments ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {idea._count!.comments}
              </span>
            )}
            {(idea._count?.links ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {idea._count!.links}
              </span>
            )}
            {!thumbnail && (idea._count?.media ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                {idea._count!.media}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
