"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RepeatConfig {
  type: "once" | "daily" | "weekly" | "monthly";
  endDate?: Date;
  daysOfWeek?: number[];
}

interface CalendarSchedulerProps {
  value?: Date;
  onChange: (date: Date, repeat?: RepeatConfig) => void;
  onClose: () => void;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

// Format a Date as "yyyy-MM-dd" in LOCAL time, not UTC. Using toISOString()
// here would shift the day for users west of UTC (e.g. CDMX at 23:00 local
// reads as the next UTC day).
function toLocalDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function CalendarScheduler({
  value,
  onChange,
  onClose,
}: CalendarSchedulerProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    // Ensure we start with at least current month
    return new Date(today.getFullYear(), today.getMonth());
  });

  const [selectedDate, setSelectedDate] = useState<Date>(
    value || new Date()
  );
  const [hours, setHours] = useState(selectedDate.getHours());
  // Snap the initial minute value to the nearest multiple of 5 so the
  // display starts on a clean step (e.g. "11:20" rather than "11:21" which
  // the stepper could never reach).
  const [minutes, setMinutes] = useState(
    (Math.round(selectedDate.getMinutes() / 5) * 5) % 60
  );

  // Step minutes in 5-min increments, snap-aligning to the nearest multiple
  // of 5 in the direction of travel. Previous implementation used
  // `m - 5` / `m + 5` directly, which:
  //   1. Produced negative numbers when starting from a non-multiple of 5
  //      (e.g. 21 → 16 → 11 → 6 → 1 → -4).
  //   2. Made it impossible to land on 0 or any other multiple of 5 from a
  //      misaligned start — you'd skip right past.
  const stepMinutes = (dir: -1 | 1) => {
    setMinutes((m) => {
      const next =
        dir === 1 ? Math.floor(m / 5) * 5 + 5 : Math.ceil(m / 5) * 5 - 5;
      return ((next % 60) + 60) % 60;
    });
  };

  const [repeatType, setRepeatType] = useState<RepeatConfig["type"]>("once");
  const [repeatEndDate, setRepeatEndDate] = useState<Date | undefined>();
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  const today = new Date();
  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handlePrevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    if (prev >= today) {
      setCurrentMonth(prev);
    }
  };

  const handleNextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    newDate.setHours(hours, minutes, 0, 0);
    setSelectedDate(newDate);
  };

  const applyQuickPreset = (type: "now1h" | "tomorrow9am" | "nextMonday2pm") => {
    const d = new Date();
    d.setSeconds(0, 0);

    switch (type) {
      case "now1h":
        d.setHours(d.getHours() + 1);
        // Snap minutes to the nearest multiple of 5 so the preset lands
        // on a clean step the stepper can reach (10:21 → 11:20, not 11:21).
        d.setMinutes((Math.round(d.getMinutes() / 5) * 5) % 60);
        break;
      case "tomorrow9am":
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        break;
      case "nextMonday2pm":
        // Find next Monday
        const dayOfWeek = d.getDay();
        const daysUntilMonday = dayOfWeek === 1 ? 7 : (1 - dayOfWeek + 7) % 7;
        d.setDate(d.getDate() + (daysUntilMonday || 7));
        d.setHours(14, 0, 0, 0);
        break;
    }

    setSelectedDate(d);
    setHours(d.getHours());
    setMinutes(d.getMinutes());

    // Update calendar view to show selected date
    setCurrentMonth(
      new Date(d.getFullYear(), d.getMonth())
    );
  };

  const handleConfirm = () => {
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours, minutes, 0, 0);

    const repeatConfig: RepeatConfig = {
      type: repeatType,
      ...(repeatType !== "once" && repeatEndDate && { endDate: repeatEndDate }),
      ...(repeatType === "weekly" && selectedWeekDays.length > 0 && {
        daysOfWeek: selectedWeekDays,
      }),
    };

    onChange(finalDate, repeatConfig);
    onClose();
  };

  const selectedDateStr = selectedDate.toLocaleDateString("es-ES", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card">
          <h3 className="font-semibold">Programar publicación</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Mini Calendar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                disabled={!isCurrentMonth}
                className="p-1 hover:bg-accent rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-medium text-sm">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-accent rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const isBlank = day === null;
                const date = isBlank ? null : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const isPast = Boolean(date && date < today && !isSameDay(date, today));
                const isSelected = Boolean(date && isSameDay(date, selectedDate));
                const isToday = Boolean(date && isSameDay(date, today));

                return (
                  <button
                    key={idx}
                    onClick={() => !isBlank && !isPast && date && handleSelectDate(date.getDate())}
                    disabled={isBlank || isPast}
                    className={cn(
                      "aspect-square rounded text-sm font-medium transition-colors flex items-center justify-center",
                      isBlank && "invisible",
                      isPast && "opacity-30 cursor-not-allowed",
                      isSelected && "bg-primary text-primary-foreground",
                      !isBlank &&
                        !isPast &&
                        !isSelected &&
                        "hover:bg-accent border border-transparent",
                      isToday && !isSelected && "border border-primary"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Display */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground text-[11px] mb-1">Fecha seleccionada:</p>
            <p className="font-semibold capitalize">{selectedDateStr}</p>
          </div>

          {/* Time Picker */}
          <div className="space-y-3">
            <Label className="text-xs font-medium">Hora</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center justify-center gap-2">
                <button
                  onClick={() => setHours((h) => (h === 0 ? 23 : h - 1))}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-semibold text-lg">
                  {String(hours).padStart(2, "0")}
                </span>
                <button
                  onClick={() => setHours((h) => (h === 23 ? 0 : h + 1))}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-muted-foreground">:</span>
              <div className="flex-1 flex items-center justify-center gap-2">
                <button
                  onClick={() => stepMinutes(-1)}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-semibold text-lg">
                  {String(minutes).padStart(2, "0")}
                </span>
                <button
                  onClick={() => stepMinutes(1)}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Presets rápidos</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyQuickPreset("now1h")}
                className="px-3 py-2 text-[12px] rounded-lg border hover:bg-accent transition-colors"
              >
                Ahora +1h
              </button>
              <button
                type="button"
                onClick={() => applyQuickPreset("tomorrow9am")}
                className="px-3 py-2 text-[12px] rounded-lg border hover:bg-accent transition-colors"
              >
                Mañana 9am
              </button>
              <button
                type="button"
                onClick={() => applyQuickPreset("nextMonday2pm")}
                className="px-3 py-2 text-[12px] rounded-lg border hover:bg-accent transition-colors"
              >
                Próx. Lun 2pm
              </button>
            </div>
          </div>

          {/* Repeat Options */}
          <div className="space-y-3">
            <Label className="text-xs font-medium">Repetición</Label>
            <Select value={repeatType} onValueChange={(v) => setRepeatType(v as any)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Una sola vez</SelectItem>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="monthly">Mensualmente</SelectItem>
              </SelectContent>
            </Select>

            {/* Weekly: Day selection */}
            {repeatType === "weekly" && (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Selecciona días:</p>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        setSelectedWeekDays((d) =>
                          d.includes(idx)
                            ? d.filter((x) => x !== idx)
                            : [...d, idx]
                        )
                      }
                      className={cn(
                        "h-8 text-[10px] font-medium rounded",
                        selectedWeekDays.includes(idx)
                          ? "bg-primary text-primary-foreground"
                          : "border hover:bg-accent"
                      )}
                    >
                      {day[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* End date for repeats */}
            {repeatType !== "once" && (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium">Hasta cuándo (opcional)</Label>
                <input
                  type="date"
                  value={repeatEndDate ? toLocalDateInputValue(repeatEndDate) : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      // `<input type="date">` emits "yyyy-MM-dd". Parsing that
                      // through `new Date(str)` yields midnight UTC, which
                      // shifts to the previous day in negative-offset zones.
                      // Build a local-midnight Date instead, then bump to
                      // 23:59 local for "end of day" semantics.
                      const [y, m, day] = e.target.value.split("-").map(Number);
                      const d = new Date(y, m - 1, day, 23, 59, 59, 0);
                      setRepeatEndDate(d);
                    } else {
                      setRepeatEndDate(undefined);
                    }
                  }}
                  min={toLocalDateInputValue(new Date())}
                  className="w-full h-9 px-3 rounded border bg-background text-sm"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
