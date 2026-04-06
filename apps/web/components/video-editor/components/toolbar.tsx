"use client";

import { Scissors, Type, SlidersHorizontal, Smile, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveTool } from "../types";

const TOOLS: { id: ActiveTool; icon: typeof Scissors; label: string }[] = [
  { id: "trim", icon: Scissors, label: "Recortar" },
  { id: "text", icon: Type, label: "Texto" },
  { id: "filter", icon: SlidersHorizontal, label: "Filtros" },
  { id: "sticker", icon: Smile, label: "Stickers" },
  { id: "audio", icon: Music, label: "Audio" },
];

interface ToolbarProps {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
}

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-3 gap-1">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            type="button"
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "w-12 h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
            title={tool.label}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-medium leading-none">{tool.label}</span>
          </button>
        );
      })}
    </div>
  );
}
