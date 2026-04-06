"use client";

import { MapPin } from "lucide-react";
import type { TrimRange } from "../../types";
import { formatTime } from "../../utils";

interface TrimPanelProps {
  trim: TrimRange;
  duration: number;
  currentTime: number;
  onTrimChange: (trim: TrimRange) => void;
}

export function TrimPanel({ trim, duration, currentTime, onTrimChange }: TrimPanelProps) {
  const trimmedDuration = (trim.end || duration) - trim.start;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Recortar video</h3>
      <p className="text-[11px] text-zinc-400">
        Ajusta el inicio y fin del video. Usa los botones para marcar la posición actual.
      </p>

      {/* Start */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-zinc-400">Inicio</label>
          <span className="text-[11px] font-mono text-zinc-300">{formatTime(trim.start)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={trim.start}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onTrimChange({ ...trim, start: Math.min(v, trim.end - 0.5) });
          }}
          className="w-full accent-primary h-1.5"
        />
        <button
          onClick={() => onTrimChange({ ...trim, start: Math.min(currentTime, trim.end - 0.5) })}
          className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors"
        >
          <MapPin className="h-3 w-3" /> Marcar inicio aquí
        </button>
      </div>

      {/* End */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-zinc-400">Fin</label>
          <span className="text-[11px] font-mono text-zinc-300">{formatTime(trim.end)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={trim.end}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onTrimChange({ ...trim, end: Math.max(v, trim.start + 0.5) });
          }}
          className="w-full accent-primary h-1.5"
        />
        <button
          onClick={() => onTrimChange({ ...trim, end: Math.max(currentTime, trim.start + 0.5) })}
          className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors"
        >
          <MapPin className="h-3 w-3" /> Marcar fin aquí
        </button>
      </div>

      {/* Duration result */}
      <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-3 text-center">
        <p className="text-[10px] text-zinc-400 mb-1">Duración resultante</p>
        <p className="text-lg font-bold font-mono text-white">{formatTime(trimmedDuration)}</p>
      </div>

      {(trim.start > 0 || trim.end < duration) && (
        <button
          onClick={() => onTrimChange({ start: 0, end: duration })}
          className="w-full text-[11px] text-zinc-400 hover:text-white py-1.5 rounded-md border border-zinc-700 hover:border-zinc-500 transition-colors"
        >
          Restablecer duración completa
        </button>
      )}
    </div>
  );
}
