"use client";

import { useState } from "react";
import {
  Type,
  ImageIcon,
  Square,
  Circle,
  Minus,
  Palette,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { StoryElement, StickerProps, ShapeProps } from "./types";
import { getDefaultTextProps } from "./types";
import { STORY_TEMPLATES, type StoryTemplate } from "./templates";

interface ToolPanelProps {
  onAddElement: (type: StoryElement["type"], props: StoryElement["props"], overrides?: Partial<StoryElement>) => void;
  onShowBackgrounds: () => void;
  onLoadTemplate?: (template: StoryTemplate) => void;
  hasElements?: boolean;
}

type StickerChip = {
  type: StickerProps["stickerType"];
  label: string;
  emoji?: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  defaults: Record<string, string>;
  variant?: "pill" | "emoji-only";
};

// Only stickers that render meaningfully in a static PNG export
const STICKER_CHIPS: StickerChip[] = [
  { type: "mention", label: "@MENCIÓN", bgColor: "#E1306C", textColor: "#fff", defaults: { username: "usuario" }, variant: "pill" },
  { type: "hashtag", label: "#HASHTAG", bgColor: "#833AB4", textColor: "#fff", defaults: { tag: "hashtag" }, variant: "pill" },
  { type: "location", label: "UBICACIÓN", emoji: "📍", bgColor: "#7C3AED", textColor: "#fff", defaults: { location: "Ciudad" }, variant: "pill" },
  { type: "emoji", label: "", emoji: "😍", bgColor: "#FFF3E0", textColor: "#000", defaults: { emoji: "😍" }, variant: "emoji-only" },
  { type: "music", label: "MÚSICA", emoji: "🎵", bgColor: "rgba(0,0,0,0.75)", textColor: "#fff", defaults: { songName: "Canción", artist: "Artista" }, variant: "pill" },
  { type: "gif", label: "GIF", bgColor: "#00E5FF", textColor: "#000", defaults: { query: "trending", gifUrl: "" }, variant: "pill" },
  { type: "frame", label: "MARCO", emoji: "🖼", bgColor: "#fff", textColor: "#374151", borderColor: "#E5E7EB", defaults: { frameStyle: "polaroid", photoUrl: "" }, variant: "pill" },
  { type: "avatar", label: "AVATAR", emoji: "🧑", bgColor: "#E8DEF8", textColor: "#4A148C", defaults: { avatarUrl: "", style: "default" }, variant: "pill" },
  { type: "cutout", label: "RECORTE", emoji: "✂️", bgColor: "#FEF9C3", textColor: "#92400E", borderColor: "#FDE68A", defaults: { imageUrl: "", shape: "circle" }, variant: "pill" },
];

// Dimensions per sticker type
function getStickerSize(type: StickerProps["stickerType"]): { w: number; h: number } {
  switch (type) {
    case "emoji": return { w: 150, h: 150 };
    case "music": return { w: 500, h: 100 };
    case "gif": return { w: 300, h: 300 };
    case "frame": return { w: 400, h: 480 };
    case "cutout": return { w: 250, h: 250 };
    case "avatar": return { w: 200, h: 200 };
    default: return { w: 300, h: 64 };
  }
}

// ─── Sticker Chip Component ─────────────────────────────────────────────────

function StickerChipButton({ chip, onClick }: { chip: StickerChip; onClick: () => void }) {
  // Emoji-only variant (large emoji button)
  if (chip.variant === "emoji-only") {
    return (
      <button
        onClick={onClick}
        className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:scale-110 active:scale-95 transition-all shadow-sm"
        title="Emoji"
      >
        {chip.emoji}
      </button>
    );
  }

  // Default: Pill variant
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide hover:scale-[1.05] active:scale-[0.97] transition-all shadow-sm border"
      style={{
        backgroundColor: chip.bgColor,
        color: chip.textColor,
        borderColor: chip.borderColor || "transparent",
      }}
      title={chip.label || chip.type}
    >
      {chip.emoji && <span className="text-sm">{chip.emoji}</span>}
      {chip.label}
    </button>
  );
}

// ─── Main Tool Panel ─────────────────────────────────────────────────────────

export function ToolPanel({ onAddElement, onShowBackgrounds, onLoadTemplate, hasElements }: ToolPanelProps) {
  const [stickersOpen, setStickersOpen] = useState(true);
  const [shapesOpen, setShapesOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const [confirmTemplate, setConfirmTemplate] = useState<StoryTemplate | null>(null);

  const handleAddText = () => {
    onAddElement("text", getDefaultTextProps(), { width: 600, height: 120, x: 240, y: 800 });
  };

  const handleAddSticker = (chip: StickerChip) => {
    const { w, h } = getStickerSize(chip.type);
    onAddElement(
      "sticker",
      { kind: "sticker", stickerType: chip.type, data: chip.defaults },
      { width: w, height: h, x: 540 - w / 2, y: 960 - h / 2 }
    );
  };

  const handleAddShape = (shapeType: ShapeProps["shapeType"]) => {
    const size = shapeType === "line" ? { width: 400, height: 8 } : { width: 200, height: 200 };
    onAddElement(
      "shape",
      { kind: "shape", shapeType, fill: shapeType === "line" ? "transparent" : "#ffffff33", stroke: "#ffffff", strokeWidth: 3, cornerRadius: shapeType === "rect" ? 12 : 0 },
      { ...size, x: 540 - size.width / 2, y: 960 - size.height / 2 }
    );
  };

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "stories");
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) {
          onAddElement("image", { kind: "image", src: data.url, brightness: 0, contrast: 0 }, { width: 400, height: 400, x: 340, y: 760 });
        }
      } catch {
        // upload failed silently
      }
    };
    input.click();
  };

  const handleTemplateClick = (template: StoryTemplate) => {
    if (hasElements) {
      setConfirmTemplate(template);
    } else {
      onLoadTemplate?.(template);
    }
  };

  return (
    <div className="w-[260px] bg-card border-r flex flex-col overflow-y-auto relative">
      {/* ─── Template Confirmation Dialog ─── */}
      {confirmTemplate && (
        <div className="absolute inset-0 z-50 bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-sm font-semibold text-center">¿Reemplazar el contenido actual?</p>
          <p className="text-xs text-muted-foreground text-center">Usar la plantilla &quot;{confirmTemplate.name}&quot; eliminará los elementos actuales del canvas.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmTemplate(null)}
              className="px-4 py-2 text-xs rounded-lg border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => { onLoadTemplate?.(confirmTemplate); setConfirmTemplate(null); }}
              className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reemplazar
            </button>
          </div>
        </div>
      )}

      {/* ─── Plantillas ─── */}
      <div className="border-b">
        <button
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plantillas</span>
          {templatesOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </button>

        {templatesOpen && (
          <div className="px-3 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {STORY_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="flex-shrink-0 group"
                  title={template.name}
                >
                  <div
                    className="w-[52px] h-[92px] rounded-lg border-2 border-transparent group-hover:border-primary transition-all shadow-sm group-hover:shadow-md overflow-hidden"
                    style={{ background: template.previewGradient }}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1">
                      <div className="w-6 h-0.5 bg-white/60 rounded-full" />
                      <div className="w-8 h-0.5 bg-white/40 rounded-full" />
                      <div className="w-5 h-0.5 bg-white/30 rounded-full" />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center mt-1 group-hover:text-foreground transition-colors">{template.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Texto ─── */}
      <div className="p-3 border-b">
        <button
          onClick={handleAddText}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Type className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Texto</p>
            <p className="text-[10px] text-muted-foreground">Agrega un bloque de texto</p>
          </div>
        </button>
      </div>

      {/* ─── Stickers ─── */}
      <div className="border-b">
        <button
          onClick={() => setStickersOpen(!stickersOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stickers</span>
          {stickersOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </button>

        {stickersOpen && (
          <div className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
              {STICKER_CHIPS.map((chip) => (
                <StickerChipButton key={chip.type} chip={chip} onClick={() => handleAddSticker(chip)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Imagen ─── */}
      <div className="p-3 border-b">
        <button
          onClick={handleImageUpload}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 border border-dashed transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Imagen</p>
            <p className="text-[10px] text-muted-foreground">Sube una foto</p>
          </div>
        </button>
      </div>

      {/* ─── Formas ─── */}
      <div className="border-b">
        <button
          onClick={() => setShapesOpen(!shapesOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formas</span>
          {shapesOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </button>

        {shapesOpen && (
          <div className="px-3 pb-3 flex gap-2">
            <button
              onClick={() => handleAddShape("rect")}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-muted/50 border transition-colors"
              title="Rectángulo"
            >
              <Square className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Rect</span>
            </button>
            <button
              onClick={() => handleAddShape("circle")}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-muted/50 border transition-colors"
              title="Círculo"
            >
              <Circle className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Círculo</span>
            </button>
            <button
              onClick={() => handleAddShape("line")}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-muted/50 border transition-colors"
              title="Línea"
            >
              <Minus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Línea</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── Fondo ─── */}
      <div className="p-3">
        <button
          onClick={onShowBackgrounds}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 border transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <Palette className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Fondo</p>
            <p className="text-[10px] text-muted-foreground">Color, degradado o imagen</p>
          </div>
        </button>
      </div>
    </div>
  );
}
