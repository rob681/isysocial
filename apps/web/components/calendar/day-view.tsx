"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileImage } from "lucide-react";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType } from "@isysocial/shared";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm

interface DayViewPost {
  id: string;
  title: string | null;
  copy: string | null;
  network: string;
  postType: string;
  status: string;
  scheduledAt: string | Date | null;
  media?: { id: string; fileUrl: string; mimeType: string }[];
  client?: { companyName: string } | null;
  category?: { name: string; color: string } | null;
}

interface DayViewProps {
  date: string;
  postsByHour: Record<number, DayViewPost[]>;
  allPosts: DayViewPost[];
  basePath: string;
}

export function DayView({ date, postsByHour, allPosts, basePath }: DayViewProps) {
  const dateObj = new Date(date + "T12:00:00");
  const formattedDate = dateObj.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Posts without scheduled time
  const unscheduledPosts = allPosts.filter((p) => !p.scheduledAt);

  return (
    <div className="space-y-4">
      {/* Date header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold capitalize">{formattedDate}</h3>
        <p className="text-sm text-muted-foreground">
          {allPosts.length} publicacion{allPosts.length !== 1 ? "es" : ""}
        </p>
      </div>

      {/* Unscheduled posts */}
      {unscheduledPosts.length > 0 && (
        <div className="border rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
            Sin hora programada ({unscheduledPosts.length})
          </p>
          <div className="space-y-2">
            {unscheduledPosts.map((post) => (
              <PostCard key={post.id} post={post} basePath={basePath} />
            ))}
          </div>
        </div>
      )}

      {/* Hourly timeline */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {HOURS.map((hour) => {
          const posts = postsByHour[hour] || [];
          const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
          const now = new Date();
          const isCurrentHour =
            date === now.toISOString().split("T")[0] && now.getHours() === hour;

          return (
            <div
              key={hour}
              className={cn(
                "flex border-b last:border-b-0 min-h-[64px]",
                isCurrentHour && "bg-blue-50/50 dark:bg-blue-950/10"
              )}
            >
              {/* Time label */}
              <div className={cn(
                "w-16 flex-shrink-0 p-2 border-r text-right",
                isCurrentHour && "font-bold text-blue-600"
              )}>
                <span className="text-xs text-muted-foreground">{timeLabel}</span>
              </div>

              {/* Posts in this hour */}
              <div className="flex-1 p-2 space-y-2">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} basePath={basePath} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostCard({ post, basePath }: { post: DayViewPost; basePath: string }) {
  const time = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Link href={`${basePath}/${post.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {post.media?.[0]?.fileUrl ? (
                <img src={post.media[0].fileUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <FileImage className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {time && <span className="text-xs font-mono text-muted-foreground">{time}</span>}
                <p className="text-sm font-medium truncate">
                  {post.title || post.copy?.slice(0, 50) || "Sin título"}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: NETWORK_COLORS[post.network as SocialNetwork] || "#888" }}
                >
                  {NETWORK_LABELS[post.network as SocialNetwork]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {POST_TYPE_LABELS[post.postType as PostType]}
                </span>
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", POST_STATUS_COLORS[post.status as PostStatus])}>
                  {POST_STATUS_LABELS[post.status as PostStatus]}
                </Badge>
                {post.category && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: post.category.color }} />
                    {post.category.name}
                  </span>
                )}
              </div>
              {post.client && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{post.client.companyName}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
