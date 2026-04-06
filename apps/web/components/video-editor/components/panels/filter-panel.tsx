"use client";

import { RotateCcw } from "lucide-react";
import type { VideoFilter } from "../../types";
import { FILTER_PRESETS, DEFAULT_FILTER } from "../../constants";

interface FilterPanelProps {
  filter: VideoFilter;
  onFilterChange: (filter: VideoFilter) => void;
}

export function FilterPanel({ filter, onFilterChange }: FilterPanelProps) {
  // Detect active preset
  const activePreset = FILTER_PRESETS.find(
    (p) => JSON.stringify(p.filter) === JSON.stringify(filter)
  );

  const sliders: { key: keyof VideoFilter; label: string; min: number; max: number }[] = [
    { key: "brightness", label: "Brillo", min: 0, max: 200 },
    { key: "contrast", label: "Contraste", min: 0, max: 200 },
    { key: "saturation", label: "Saturación", min: 0, max: 200 },
  ];

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Filtros</h3>

      {/* Preset cards - horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onFilterChange({ ...preset.filter })}
            className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              activePreset?.id === preset.id
                ? "bg-primary/15 border-2 border-primary ring-1 ring-primary/30"
                : "bg-zinc-800 border border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <span className="text-lg">{preset.emoji}</span>
            <span className="text-[9px] text-zinc-300 font-medium">{preset.name}</span>
          </button>
        ))}
      </div>

      {/* Manual sliders */}
      <div className="space-y-3">
        {sliders.map((s) => (
          <div key={s.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-zinc-400">{s.label}</label>
              <span className="text-[11px] font-mono text-zinc-300">{filter[s.key]}%</span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={filter[s.key]}
              onChange={(e) => onFilterChange({ ...filter, [s.key]: parseInt(e.target.value) })}
              className="w-full accent-primary h-1.5"
            />
          </div>
        ))}
      </div>

      {/* Reset */}
      <button
        onClick={() => onFilterChange({ ...DEFAULT_FILTER })}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-xs"
      >
        <RotateCcw className="h-3 w-3" /> Restablecer
      </button>
    </div>
  );
}
