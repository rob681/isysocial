"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Plus, Calendar, FileImage, CalendarDays, CalendarRange, CalendarClock } from "lucide-react";
import { NETWORK_LABELS, NETWORK_COLORS, POST_STATUS_LABELS, POST_STATUS_COLORS, getHolidaysForMonth, getMiscDaysForMonth, HOLIDAY_REGION_LABELS } from "@isysocial/shared";
import type { SocialNetwork, PostStatus, HolidayRegion } from "@isysocial/shared";
import { cn, localYMD, localHour } from "@/lib/utils";
import { Topbar } from "@/components/layout/topbar";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";

type CalendarViewMode = "month" | "week" | "day";
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6;
  const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];
  const prevLast = new Date(year, month - 1, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) { const d = prevLast - i; const m = month === 1 ? 12 : month - 1; const y = month === 1 ? year - 1 : year; days.push({ date: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, isCurrentMonth: false }); }
  for (let d = 1; d <= daysInMonth; d++) { days.push({ date: `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, isCurrentMonth: true }); }
  const rem = 42 - days.length;
  for (let d = 1; d <= rem; d++) { const m = month === 12 ? 1 : month + 1; const y = month === 12 ? year + 1 : year; days.push({ date: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, isCurrentMonth: false }); }
  return days;
}

function getMondayOfWeek(date: Date): string {
  const d = new Date(date); const day = d.getDay(); d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  // Local YYYY-MM-DD — `toISOString` returns UTC and would shift the week
  // boundary across the date line for non-UTC timezones.
  return localYMD(d)!;
}

export default function EditorCalendarioPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [holidayRegions, setHolidayRegions] = useState<HolidayRegion[]>(["MX"]);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(now));
  const [dayDate, setDayDate] = useState(() => localYMD(now)!);

  useEffect(() => { const s = localStorage.getItem("isysocial-calendar-view"); if (s === "month" || s === "week" || s === "day") setViewMode(s); }, []);
  const handleViewChange = (v: CalendarViewMode) => { setViewMode(v); localStorage.setItem("isysocial-calendar-view", v); };

  const { data: monthData, isLoading: monthLoading } = trpc.calendar.getMonth.useQuery({ year, month }, { enabled: viewMode === "month" });
  const { data: weekData, isLoading: weekLoading } = trpc.calendar.getWeek.useQuery({ startDate: weekStart }, { enabled: viewMode === "week" });
  const { data: dayData, isLoading: dayLoading } = trpc.calendar.getDay.useQuery({ date: dayDate }, { enabled: viewMode === "day" });

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  const holidays = useMemo(() => getHolidaysForMonth(year, month, holidayRegions), [year, month, holidayRegions]);
  const miscDays = useMemo(() => getMiscDaysForMonth(year, month), [year, month]);
  const today = localYMD(now)!;

  // ── Client-side bucketing in the browser's local timezone ────────────────
  // Server returns flat arrays with ±1-day buffer; bucket locally so
  // day/hour boundaries follow the user's timezone, not UTC.
  const monthPostsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const p of (monthData?.posts as any[] | undefined) ?? []) {
      const key = localYMD(p.scheduledAt);
      if (!key) continue;
      (map[key] ??= []).push(p);
    }
    return map;
  }, [monthData]);
  const weekPostsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const p of (weekData?.posts as any[] | undefined) ?? []) {
      const key = localYMD(p.scheduledAt);
      if (!key) continue;
      (map[key] ??= []).push(p);
    }
    return map;
  }, [weekData]);
  const dayPostsByHour = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const p of (dayData?.posts as any[] | undefined) ?? []) {
      const h = localHour(p.scheduledAt);
      if (h === null) continue;
      (map[h] ??= []).push(p);
    }
    return map;
  }, [dayData]);
  const dayAllPosts = useMemo(() => {
    return ((dayData?.posts as any[] | undefined) ?? []).filter((p) => {
      if (!p.scheduledAt) return true;
      return localYMD(p.scheduledAt) === dayDate;
    });
  }, [dayData, dayDate]);

  const prevPeriod = () => {
    if (viewMode === "month") { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
    else if (viewMode === "week") { const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() - 7); setWeekStart(localYMD(d)!); }
    else { const d = new Date(dayDate + "T12:00:00"); d.setDate(d.getDate() - 1); setDayDate(localYMD(d)!); }
  };
  const nextPeriod = () => {
    if (viewMode === "month") { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }
    else if (viewMode === "week") { const d = new Date(weekStart + "T12:00:00"); d.setDate(d.getDate() + 7); setWeekStart(localYMD(d)!); }
    else { const d = new Date(dayDate + "T12:00:00"); d.setDate(d.getDate() + 1); setDayDate(localYMD(d)!); }
  };
  const goToday = () => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); setWeekStart(getMondayOfWeek(now)); setDayDate(localYMD(now)!); };

  const periodTitle = viewMode === "month" ? `${MONTH_NAMES[month - 1]} ${year}`
    : viewMode === "week" ? (() => { const s = new Date(weekStart + "T12:00:00"); const e = new Date(s); e.setDate(e.getDate() + 6); return `${s.getDate()} ${s.toLocaleDateString("es",{month:"short"})} — ${e.getDate()} ${e.toLocaleDateString("es",{month:"short"})} ${e.getFullYear()}`; })()
    : new Date(dayDate + "T12:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const dayPosts = selectedDay ? (monthPostsByDay[selectedDay] ?? []) : [];
  const isLoading = viewMode === "month" ? monthLoading : viewMode === "week" ? weekLoading : dayLoading;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Calendario" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-muted-foreground text-sm">Vista {viewMode === "month" ? "mensual" : viewMode === "week" ? "semanal" : "diaria"} de publicaciones</p>
        </div>
        <Link href="/editor/contenido/nuevo"><Button><Plus className="h-4 w-4 mr-2" />Nueva publicación</Button></Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevPeriod}><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold min-w-[240px] text-center capitalize">{periodTitle}</h2>
          <Button variant="outline" size="icon" onClick={nextPeriod}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Hoy</Button>
        </div>
        <div className="flex items-center rounded-lg border bg-card p-0.5">
          {([{ key: "month" as const, label: "Mes", icon: CalendarDays }, { key: "week" as const, label: "Semana", icon: CalendarRange }, { key: "day" as const, label: "Día", icon: CalendarClock }]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => handleViewChange(key)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "month" && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-muted-foreground font-medium">Redes:</span>
            {Object.entries(NETWORK_COLORS).map(([net, color]) => (<div key={net} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} /><span>{NETWORK_LABELS[net as SocialNetwork]}</span></div>))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Festivos:</span>
            {(Object.entries(HOLIDAY_REGION_LABELS) as [HolidayRegion, string][]).map(([region, label]) => (
              <button key={region} onClick={() => setHolidayRegions(prev => prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region])}
                className={cn("px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors", holidayRegions.includes(region) ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400" : "bg-transparent border-border text-muted-foreground hover:bg-muted")}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? <Skeleton className="h-[600px] w-full rounded-lg" />
        : viewMode === "week" && weekData ? <WeekView startDate={weekData.startDate} postsByDay={weekPostsByDay as any} basePath="/editor/contenido" />
        : viewMode === "day" && dayData ? <DayView date={dayData.date} postsByHour={dayPostsByHour as any} allPosts={dayAllPosts as any} basePath="/editor/contenido" />
        : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b">{DAY_NAMES.map(d => <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground bg-muted/30">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {calendarDays.map((dayInfo, i) => {
              const posts = monthPostsByDay[dayInfo.date] || []; const dayHolidays = holidays.get(dayInfo.date) || []; const dayMisc = miscDays.get(dayInfo.date) || []; const isToday = dayInfo.date === today;
              return (
                <div key={i} className={cn("min-h-[90px] p-1.5 border-b border-r cursor-pointer transition-colors hover:bg-accent/30", !dayInfo.isCurrentMonth && "bg-muted/20 opacity-50", isToday && "bg-blue-50 dark:bg-blue-950/20", dayHolidays.length > 0 && dayInfo.isCurrentMonth && "bg-amber-50/50 dark:bg-amber-950/10")}
                  onClick={() => { if (posts.length > 0) setSelectedDay(dayInfo.date); }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={cn("text-xs font-medium", isToday && "text-blue-600 font-bold", !dayInfo.isCurrentMonth && "text-muted-foreground")}>{dayInfo.day}</p>
                    <div className="flex items-center gap-0.5">
                      {dayMisc.length > 0 && <span className="text-[10px]" title={dayMisc.map(d => `${d.emoji} ${d.name}`).join(", ")}>{dayMisc[0].emoji}</span>}
                      {dayHolidays.length > 0 && <span className="text-[9px] text-amber-600 dark:text-amber-400" title={dayHolidays.map(h => h.name).join(", ")}>★</span>}
                    </div>
                  </div>
                  {dayHolidays.length > 0 && dayInfo.isCurrentMonth && <p className="text-[9px] text-amber-600 dark:text-amber-400 leading-tight mb-0.5 truncate">{dayHolidays[0].name}</p>}
                  {dayMisc.length > 0 && dayInfo.isCurrentMonth && <p className="text-[9px] text-violet-600 dark:text-violet-400 leading-tight mb-0.5 truncate">{dayMisc[0].name}</p>}
                  <div className="flex flex-wrap gap-1">
                    {posts.slice(0, 4).map((post: any, j: number) => (<div key={j} className="w-2.5 h-2.5 rounded-full ring-1 ring-white dark:ring-zinc-900" style={{ backgroundColor: NETWORK_COLORS[post.network as SocialNetwork] || "#888" }} title={`${NETWORK_LABELS[post.network as SocialNetwork]} — ${post.title || "Sin título"}`} />))}
                    {posts.length > 4 && <span className="text-[9px] text-muted-foreground">+{posts.length - 4}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Sheet open={!!selectedDay} onOpenChange={open => !open && setSelectedDay(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />{selectedDay && new Date(selectedDay + "T12:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-3">
            {dayPosts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No hay publicaciones este día</p>
            : dayPosts.map((post: any) => (
              <Link key={post.id} href={`/editor/contenido/${post.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {post.media?.[0]?.fileUrl ? <img src={post.media[0].fileUrl} alt="" className="w-full h-full object-cover" /> : <FileImage className="h-5 w-5 text-muted-foreground/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title || post.copy?.slice(0, 40) || "Sin título"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: NETWORK_COLORS[post.network as SocialNetwork] }}>{NETWORK_LABELS[post.network as SocialNetwork]}</span>
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", POST_STATUS_COLORS[post.status as PostStatus])}>{POST_STATUS_LABELS[post.status as PostStatus]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{post.client?.companyName}</p>
                    </div>
                  </div>
                </CardContent></Card>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      </main>
    </div>
  );
}
