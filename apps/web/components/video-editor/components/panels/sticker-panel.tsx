"use client";

import { Trash2 } from "lucide-react";
import type { StickerOverlay } from "../../types";
import { GiphySearch } from "../giphy-search";

interface StickerPanelProps {
  stickers: StickerOverlay[];
  selectedId: string | null;
  onAddSticker: (url: string, title: string) => void;
  onUpdate: (id: string, changes: Partial<StickerOverlay>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
}

export function StickerPanel({ stickers, selectedId, onAddSticker, onUpdate, onDelete, onSelect }: StickerPanelProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Stickers</h3>

      <GiphySearch onSelectGif={onAddSticker} />

      {/* Placed stickers */}
      {stickers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-400">Colocados ({stickers.length})</p>
          {stickers.map((s) => (
            <div key={s.id}>
              <button
                onClick={() => onSelect(selectedId === s.id ? null : s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedId === s.id ? "bg-primary/10 border border-primary/30" : "bg-zinc-800 border border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <img src={s.url} alt={s.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                <span className="text-xs text-white truncate flex-1">{s.title || "Sticker"}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>

              {selectedId === s.id && (
                <div className="mt-1.5 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400">Posición X %</label>
                      <input type="range" min={5} max={95} value={s.x} onChange={(e) => onUpdate(s.id, { x: +e.target.value })} className="w-full accent-primary h-1.5" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">Posición Y %</label>
                      <input type="range" min={5} max={95} value={s.y} onChange={(e) => onUpdate(s.id, { y: +e.target.value })} className="w-full accent-primary h-1.5" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400">Tamaño</label>
                    <input type="range" min={5} max={80} value={s.width} onChange={(e) => onUpdate(s.id, { width: +e.target.value })} className="w-full accent-primary h-1.5" />
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
