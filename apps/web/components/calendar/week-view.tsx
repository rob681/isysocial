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

const DAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
// DOW for each index: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
const DAY_INDEX_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

interface WeekViewPost {
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

interface WeekViewProps {
  startDate: string; // ISO date of Monday
  postsByDay: Record<string, WeekViewPost[]>;
  basePath: string;
  dayThemeMap?: Record<number, { theme: string; emoji?: string | null }>;
}

function getWeekDates(startDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]!);
  }
  return dates;
}

export function WeekView({ startDate, postsByDay, basePath, dayThemeMap }: WeekViewProps) {
  const dates = getWeekDates(startDate);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-7">
        {dates.map((date, i) => {
          const posts = postsByDay[date] || [];
          const isToday = date === today;
          const dayNum = new Date(date + "T12:00:00").getDate();
          const monthName = new Date(date + "T12:00:00").toLocaleDateString("es", { month: "short" });
          const dow = DAY_INDEX_TO_DOW[i]!;
          const theme = dayThemeMap?.[dow];

          return (
            <div
              key={date}
              className={cn(
                "border-r last:border-r-0 min-h-[500px] flex flex-col",
                isToday && "bg-blue-50/50 dark:bg-blue-950/10"
              )}
            >
              {/* Day header */}
              <div className={cn(
                "border-b sticky top-0 z-10 overflow-hidden",
                isToday ? "bg-blue-50 dark:bg-blue-950/20" : "bg-card"
              )}>
                {/* Theme banner */}
                {theme && (
                  <div
                    className="w-full px-2 py-1 flex items-center justify-center gap-1"
                    style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                  >
                    <span className="text-[11px]">{theme.emoji || "🏷️"}</span>
                    <span className="text-[10px] font-semibold text-white truncate">{theme.theme}</span>
                  </div>
                )}
                <div className="p-2 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">
                    {DAY_NAMES_FULL[i]}
                  </p>
                  <p className={cn(
                    "text-lg font-bold",
                    isToday && "text-blue-600"
                  )}>
                    {dayNum}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{monthName}</p>
                </div>
              </div>

              {/* Posts */}
              <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                {posts.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/40 text-center pt-4">
                    Sin posts
                  </p>
                )}
                {posts.map((post) => {
                  const time = post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
                    : "";

                  return (
                    <Link key={post.id} href={`${basePath}/${post.id}`}>
                      <div className="rounded-md border p-1.5 hover:shadow-sm transition-shadow cursor-pointer bg-background">
                        {/* Thumbnail */}
                        {post.media?.[0]?.fileUrl && (
                          <div className="w-full aspect-video rounded overflow-hidden mb-1">
                            <img src={post.media[0].fileUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {/* Time */}
                        {time && (
                          <p className="text-[10px] font-medium text-muted-foreground">{time}</p>
                        )}
                        {/* Title */}
                        <p className="text-[11px] font-medium line-clamp-2 leading-tight">
                          {post.title || post.copy?.slice(0, 40) || "Sin título"}
                        </p>
                        {/* Badges */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span
                            className="text-[8px] font-bold px-1 py-0.5 rounded text-white"
                            style={{ backgroundColor: NETWORK_COLORS[post.network as SocialNetwork] || "#888" }}
                          >
                            {NETWORK_LABELS[post.network as SocialNetwork]}
                          </span>
                          <Badge variant="secondary" className={cn("text-[8px] px-1 py-0", POST_STATUS_COLORS[post.status as PostStatus])}>
                            {POST_STATUS_LABELS[post.status as PostStatus]}
                          </Badge>
                        </div>
                        {/* Client */}
                        {post.client && (
                          <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
                            {post.client.companyName}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
