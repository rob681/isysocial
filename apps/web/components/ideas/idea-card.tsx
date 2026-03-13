"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  MessageCircle,
  Link2,
  Image,
  Calendar,
  ArrowRight,
  User2,
} from "lucide-react";
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
    media?: { fileUrl: string }[];
    _count?: { comments: number; links: number; media: number };
  };
  basePath: string; // e.g., "/admin/ideas", "/editor/ideas"
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function IdeaCard({ idea, basePath, isDraggable, onDragStart }: IdeaCardProps) {
  const statusColor = IDEA_STATUS_COLORS[idea.status as IdeaStatus] || "";
  const networkColor = idea.network
    ? NETWORK_COLORS[idea.network as SocialNetwork] || "#888"
    : null;
  const thumbnail = idea.media?.[0]?.fileUrl;

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
        {/* Hero image - full bleed, larger and more prominent */}
        {thumbnail && (
          <div className="w-full h-40 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
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
            {/* Show media count only if no thumbnail visible */}
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
