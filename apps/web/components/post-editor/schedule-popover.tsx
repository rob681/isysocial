"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchedulePopoverProps {
  value: string; // ISO string "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  network?: string;
  clientId?: string;
}

const QUICK_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "3h", hours: 3 },
  { label: "6h", hours: 6 },
  { label: "Mañana 9am", days: 1, hour: 9 },
  { label: "Mañana 2pm", days: 1, hour: 14 },
  { label: "Mañana 7pm", days: 1, hour: 19 },
];

function getMinDatetime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5); // at least 5 min from now
  return now.toISOString().slice(0, 16);
}

function getMaxDatetime() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 16);
}

export function SchedulePopover({ value, onChange, network, clientId }: SchedulePopoverProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const suggestMutation = trpc.ai.suggestBestTimes.useMutation({
    onSuccess: () => setSuggestionsLoaded(true),
  });

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSuggestions]);

  const handleOpenSuggestions = () => {
    setShowSuggestions(true);
    if (!suggestionsLoaded && !suggestMutation.isLoading) {
      suggestMutation.mutate({ network: network || "INSTAGRAM", clientId });
    }
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[number]) => {
    const d = new Date();
    if (preset.hours) {
      d.setHours(d.getHours() + preset.hours);
    } else if (preset.days) {
      d.setDate(d.getDate() + preset.days);
      d.setHours(preset.hour || 9, 0, 0, 0);
    }
    onChange(d.toISOString().slice(0, 16));
  };

  return (
    <div className="space-y-2 relative" ref={popoverRef}>
      <Label>Fecha programada</Label>

      {/* Date/time input */}
      <div className="flex gap-2">
        <Input
          type="datetime-local"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          min={getMinDatetime()}
          max={getMaxDatetime()}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={handleOpenSuggestions}
          title="Sugerencias de horario AI"
        >
          <Sparkles className="h-4 w-4 text-primary" />
        </Button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1">
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="px-2 py-0.5 text-[10px] rounded-full border hover:bg-accent transition-colors"
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* AI Suggestions popup */}
      {showSuggestions && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg p-4 space-y-3 animate-in slide-in-from-top-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">
                Mejores horarios para {network || "tu red"}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {suggestMutation.isLoading && (
            <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analizando historial...</span>
            </div>
          )}

          {suggestMutation.data?.suggestions && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Basado en tu historial de publicaciones{clientId ? " y audiencia del cliente" : ""}:
              </p>
              <div className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-3">
                {suggestMutation.data.suggestions}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Selecciona un horario arriba o elige de las sugerencias rápidas
              </p>
            </div>
          )}

          {suggestMutation.error && (
            <p className="text-sm text-red-500">
              Error: {suggestMutation.error.message}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setSuggestionsLoaded(false);
              suggestMutation.mutate({ network: network || "INSTAGRAM", clientId });
            }}
            disabled={suggestMutation.isLoading}
          >
            {suggestMutation.isLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            Regenerar sugerencias
          </Button>
        </div>
      )}
    </div>
  );
}
