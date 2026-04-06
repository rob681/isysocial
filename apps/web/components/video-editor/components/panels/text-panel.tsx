"use client";

import { Plus, Trash2 } from "lucide-react";
import type { TextOverlay } from "../../types";
import { createTextOverlay } from "../../types";
import { TEXT_TEMPLATES } from "../../constants";
import { formatTime } from "../../utils";

interface TextPanelProps {
  overlays: TextOverlay[];
  selectedId: string | null;
  duration: number;
  onAdd: (overlay: TextOverlay) => void;
  onUpdate: (id: string, changes: Partial<TextOverlay>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
}

export function TextPanel({ overlays, selectedId, duration, onAdd, onUpdate, onDelete, onSelect }: TextPanelProps) {
  const handleAddTemplate = (templateId: string) => {
    const template = TEXT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const overlay = createTextOverlay(duration, { ...template.style, templateId, text: template.preview });
    onAdd(overlay);
    onSelect(overlay.id);
  };

  const selected = overlays.find((o) => o.id === selectedId);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Texto</h3>

      {/* Template grid */}
      <div>
        <p className="text-[10px] text-zinc-400 mb-2">Plantillas</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TEXT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleAddTemplate(tpl.id)}
              className="h-14 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-primary/50 hover:bg-zinc-750 transition-all flex items-center justify-center overflow-hidden"
            >
              <span
                className="text-center px-1 truncate"
                style={{
                  fontSize: Math.min(tpl.style.fontSize || 24, 16),
                  color: tpl.style.color || "#fff",
                  fontWeight: tpl.style.bold ? 700 : 400,
                  textTransform: tpl.style.textTransform || "none",
                  letterSpacing: tpl.style.letterSpacing ? `${Math.min(tpl.style.letterSpacing, 3)}px` : undefined,
                  textShadow: tpl.style.shadow?.replace(/\d+px/g, (m) => `${Math.max(1, parseInt(m) / 4)}px`) || undefined,
                  WebkitTextStroke: tpl.style.strokeColor ? `1px ${tpl.style.strokeColor}` : undefined,
                }}
              >
                {tpl.preview}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Or add plain text */}
      <button
        onClick={() => {
          const o = createTextOverlay(duration);
          onAdd(o);
          onSelect(o.id);
        }}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors text-xs"
      >
        <Plus className="h-3.5 w-3.5" /> Texto libre
      </button>

      {/* Overlay list */}
      {overlays.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-400">Textos ({overlays.length})</p>
          {overlays.map((o) => (
            <div key={o.id}>
              <button
                onClick={() => onSelect(selectedId === o.id ? null : o.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedId === o.id ? "bg-primary/10 border border-primary/30" : "bg-zinc-800 border border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <span className="text-xs text-white truncate flex-1">{o.text}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(o.id); }}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>

              {/* Edit controls when selected */}
              {selectedId === o.id && selected && (
                <div className="mt-1.5 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3">
                  <div>
                    <label className="text-[10px] text-zinc-400">Texto</label>
                    <input
                      value={selected.text}
                      onChange={(e) => onUpdate(o.id, { text: e.target.value })}
                      className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-white mt-0.5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400">Tamaño</label>
                      <input
                        type="number"
                        min={12}
                        max={80}
                        value={selected.fontSize}
                        onChange={(e) => onUpdate(o.id, { fontSize: +e.target.value })}
                        className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-white mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">Color</label>
                      <input
                        type="color"
                        value={selected.color}
                        onChange={(e) => onUpdate(o.id, { color: e.target.value })}
                        className="w-full h-8 rounded-md border border-zinc-700 bg-zinc-800 mt-0.5 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400">Posición X %</label>
                      <input type="range" min={5} max={95} value={selected.x} onChange={(e) => onUpdate(o.id, { x: +e.target.value })} className="w-full accent-primary h-1.5" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">Posición Y %</label>
                      <input type="range" min={5} max={95} value={selected.y} onChange={(e) => onUpdate(o.id, { y: +e.target.value })} className="w-full accent-primary h-1.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400">Aparece</label>
                      <span className="block text-[10px] text-zinc-500 font-mono">{formatTime(selected.startTime)}</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">Desaparece</label>
                      <span className="block text-[10px] text-zinc-500 font-mono">{formatTime(selected.endTime)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
