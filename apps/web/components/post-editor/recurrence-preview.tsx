"use client";

import { useMemo } from "react";
import { CalendarDays, Repeat } from "lucide-react";
import type { RepeatConfig } from "./calendar-scheduler";
import { cn } from "@/lib/utils";

interface RecurrencePreviewProps {
  startDate: Date;
  repeatConfig: RepeatConfig;
  maxToShow?: number;
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateOccurrences(
  startDate: Date,
  config: RepeatConfig,
  count: number
): Date[] {
  if (config.type === "once") return [startDate];

  const results: Date[] = [];
  const maxDate = config.endDate || new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const h = startDate.getHours();
  const m = startDate.getMinutes();

  let cursor = new Date(startDate);

  while (results.length < count && cursor <= maxDate) {
    if (config.type === "daily") {
      results.push(new Date(cursor));
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);

    } else if (config.type === "weekly") {
      const days = config.daysOfWeek?.length ? config.daysOfWeek : [startDate.getDay()];
      // Build next 7 days from cursor and collect matching
      for (let d = 0; d < 7 && results.length < count; d++) {
        const candidate = new Date(cursor);
        candidate.setDate(cursor.getDate() + d);
        candidate.setHours(h, m, 0, 0);
        if (days.includes(candidate.getDay()) && candidate >= startDate && candidate <= maxDate) {
          // avoid duplicates
          if (!results.find((r) => r.getTime() === candidate.getTime())) {
            results.push(new Date(candidate));
          }
        }
      }
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);

    } else if (config.type === "monthly") {
      results.push(new Date(cursor));
      cursor = new Date(cursor);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return results.slice(0, count);
}

function repeatLabel(config: RepeatConfig): string {
  switch (config.type) {
    case "daily": return "Diariamente";
    case "monthly": return "Mensualmente";
    case "weekly": {
      if (!config.daysOfWeek?.length) return "Semanalmente";
      const names = config.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ");
      return `Cada semana: ${names}`;
    }
    default: return "Una vez";
  }
}

export function RecurrencePreview({ startDate, repeatConfig, maxToShow = 10 }: RecurrencePreviewProps) {
  const occurrences = useMemo(
    () => generateOccurrences(startDate, repeatConfig, maxToShow),
    [startDate, repeatConfig, maxToShow]
  );

  if (repeatConfig.type === "once" || occurrences.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Repeat className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-primary">{repeatLabel(repeatConfig)}</span>
        {repeatConfig.endDate && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            hasta {repeatConfig.endDate.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <p className="text-[10px] text-muted-foreground">
          Se crearán <span className="font-semibold text-foreground">{occurrences.length}+</span> publicaciones:
        </p>
      </div>

      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {occurrences.map((date, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 text-[11px] py-0.5 px-2 rounded",
              i === 0 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
            )}
          >
            <span className="w-4 text-center opacity-50">{i + 1}</span>
            <span className="capitalize">{formatDate(date)}</span>
          </div>
        ))}
        {!repeatConfig.endDate && (
          <p className="text-[10px] text-muted-foreground text-center py-1 opacity-60">
            … y más hasta la fecha de fin
          </p>
        )}
      </div>
    </div>
  );
}
