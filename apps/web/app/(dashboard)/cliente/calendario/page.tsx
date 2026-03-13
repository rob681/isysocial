"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Calendar, FileImage, AlertCircle } from "lucide-react";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  POST_TYPE_LABELS,
  getHolidaysForMonth,
  HOLIDAY_REGION_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType, HolidayRegion } from "@isysocial/shared";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    days.push({
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    days.push({
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      isCurrentMonth: false,
    });
  }

  return days;
}

export default function ClienteCalendarioPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [holidayRegions, setHolidayRegions] = useState<HolidayRegion[]>(["MX"]);

  const { data, isLoading } = trpc.calendar.getMonth.useQuery({ year, month });

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  const holidays = useMemo(() => getHolidaysForMonth(year, month, holidayRegions), [year, month, holidayRegions]);

  const today = now.toISOString().split("T")[0];

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const dayPosts = selectedDay && data?.posts?.[selectedDay] ? data.posts[selectedDay] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mi Calendario</h1>
        <p className="text-muted-foreground text-sm">
          Visualiza tus publicaciones programadas
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold min-w-[180px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}
        >
          Hoy
        </Button>
      </div>

      {/* Legend + Holiday regions */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-muted-foreground font-medium">Redes:</span>
          {Object.entries(NETWORK_COLORS).map(([net, color]) => (
            <div key={net} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span>{NETWORK_LABELS[net as SocialNetwork]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Festivos:</span>
          {(Object.entries(HOLIDAY_REGION_LABELS) as [HolidayRegion, string][]).map(([region, label]) => (
            <button
              key={region}
              onClick={() =>
                setHolidayRegions((prev) =>
                  prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
                )
              }
              className={cn(
                "px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors",
                holidayRegions.includes(region)
                  ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
                  : "bg-transparent border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-lg" />
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground bg-muted/30"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((dayInfo, i) => {
              const posts = data?.posts?.[dayInfo.date] || [];
              const dayHolidays = holidays.get(dayInfo.date) || [];
              const isToday = dayInfo.date === today;
              const hasReview = posts.some((p: any) => p.status === "IN_REVIEW");

              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[90px] p-1.5 border-b border-r cursor-pointer transition-colors hover:bg-accent/30",
                    !dayInfo.isCurrentMonth && "bg-muted/20 opacity-50",
                    isToday && "bg-blue-50 dark:bg-blue-950/20",
                    hasReview && "bg-yellow-50/50 dark:bg-yellow-950/10",
                    dayHolidays.length > 0 && dayInfo.isCurrentMonth && !hasReview && "bg-amber-50/50 dark:bg-amber-950/10"
                  )}
                  onClick={() => {
                    if (posts.length > 0) setSelectedDay(dayInfo.date);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <p className={cn(
                        "text-xs font-medium",
                        isToday && "text-blue-600 font-bold",
                        !dayInfo.isCurrentMonth && "text-muted-foreground"
                      )}>
                        {dayInfo.day}
                      </p>
                      {hasReview && (
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    {dayHolidays.length > 0 && (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400" title={dayHolidays.map((h) => h.name).join(", ")}>★</span>
                    )}
                  </div>

                  {dayHolidays.length > 0 && dayInfo.isCurrentMonth && (
                    <p className="text-[9px] text-amber-600 dark:text-amber-400 leading-tight mb-1 truncate" title={dayHolidays.map((h) => h.name).join(", ")}>
                      {dayHolidays[0].name}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {posts.slice(0, 4).map((post: any, j: number) => (
                      <div
                        key={j}
                        className="w-2.5 h-2.5 rounded-full ring-1 ring-white dark:ring-zinc-900"
                        style={{ backgroundColor: NETWORK_COLORS[post.network as SocialNetwork] || "#888" }}
                        title={`${NETWORK_LABELS[post.network as SocialNetwork]} — ${post.title || "Sin título"}`}
                      />
                    ))}
                    {posts.length > 4 && (
                      <span className="text-[9px] text-muted-foreground">+{posts.length - 4}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail slide-over */}
      <Sheet open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {selectedDay &&
                new Date(selectedDay + "T12:00:00").toLocaleDateString("es", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {dayPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay publicaciones este día
              </p>
            ) : (
              dayPosts.map((post: any) => (
                <Link key={post.id} href={`/cliente/contenido/${post.id}`}>
                  <Card className={cn(
                    "hover:shadow-md transition-shadow cursor-pointer",
                    post.status === "IN_REVIEW" && "ring-2 ring-yellow-400/50"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {post.media?.[0]?.fileUrl ? (
                            <img src={post.media[0].fileUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {post.title || post.copy?.slice(0, 40) || "Sin título"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: NETWORK_COLORS[post.network as SocialNetwork] }}
                            >
                              {NETWORK_LABELS[post.network as SocialNetwork]}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] px-1.5 py-0", POST_STATUS_COLORS[post.status as PostStatus])}
                            >
                              {POST_STATUS_LABELS[post.status as PostStatus]}
                            </Badge>
                            {post.status === "IN_REVIEW" && (
                              <span className="text-[10px] text-yellow-600 font-medium">
                                ← Revisar
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
