"use client";

import {
  Type,
  AtSign,
  Hash,
  MapPin,
  BarChart2,
  HelpCircle,
  ListChecks,
  Timer,
  Link2,
  Smile,
  ImageIcon,
  Square,
  Circle,
  Minus,
  Palette,
  Info,
  SlidersHorizontal,
  Users,
  Music,
  Film,
  Frame,
  Bell,
  Scissors,
  UserCircle,
  UtensilsCrossed,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StoryElement, StickerProps, ShapeProps } from "./types";
import { getDefaultTextProps } from "./types";

interface ToolPanelProps {
  onAddElement: (type: StoryElement["type"], props: StoryElement["props"], overrides?: Partial<StoryElement>) => void;
  onShowBackgrounds: () => void;
}

const STICKER_TOOLS: { type: StickerProps["stickerType"]; label: string; icon: React.ReactNode; defaults: Record<string, string> }[] = [
  { type: "mention", label: "@Mención", icon: <AtSign className="h-4 w-4" />, defaults: { username: "usuario" } },
  { type: "hashtag", label: "#Hashtag", icon: <Hash className="h-4 w-4" />, defaults: { tag: "hashtag" } },
  { type: "location", label: "Ubicación", icon: <MapPin className="h-4 w-4" />, defaults: { location: "Ciudad" } },
  { type: "poll", label: "Encuesta", icon: <BarChart2 className="h-4 w-4" />, defaults: { question: "¿Qué prefieres?", optionA: "Opción A", optionB: "Opción B" } },
  { type: "questions", label: "Preguntas", icon: <HelpCircle className="h-4 w-4" />, defaults: { question: "Hazme una pregunta" } },
  { type: "quiz", label: "Cuestionario", icon: <ListChecks className="h-4 w-4" />, defaults: { question: "¿Cuál es...?" } },
  { type: "countdown", label: "Cuenta regresiva", icon: <Timer className="h-4 w-4" />, defaults: { label: "Evento", date: "" } },
  { type: "link", label: "Enlace", icon: <Link2 className="h-4 w-4" />, defaults: { url: "", label: "Ver más" } },
  { type: "emoji", label: "Emoji", icon: <Smile className="h-4 w-4" />, defaults: { emoji: "😍" } },
  { type: "emoji_slider", label: "Reacción emoji", icon: <SlidersHorizontal className="h-4 w-4" />, defaults: { emoji: "😍", question: "¿Cuánto te gusta?" } },
  { type: "add_yours", label: "Tu turno", icon: <Users className="h-4 w-4" />, defaults: { prompt: "Comparte tu foto" } },
  { type: "music", label: "Música", icon: <Music className="h-4 w-4" />, defaults: { songName: "Canción", artist: "Artista" } },
  { type: "gif", label: "GIF", icon: <Film className="h-4 w-4" />, defaults: { query: "trending", gifUrl: "" } },
  { type: "frame", label: "Marcos", icon: <Frame className="h-4 w-4" />, defaults: { frameStyle: "polaroid", photoUrl: "" } },
  { type: "notify", label: "Notificar", icon: <Bell className="h-4 w-4" />, defaults: { label: "Activar recordatorio" } },
  { type: "cutout", label: "Recortes", icon: <Scissors className="h-4 w-4" />, defaults: { imageUrl: "", shape: "circle" } },
  { type: "avatar", label: "Avatar", icon: <UserCircle className="h-4 w-4" />, defaults: { avatarUrl: "", style: "default" } },
  { type: "food_order", label: "Pedidos", icon: <UtensilsCrossed className="h-4 w-4" />, defaults: { businessName: "Mi negocio", buttonText: "Pedir ahora" } },
];

// Dimensions per sticker type
function getStickerSize(type: StickerProps["stickerType"]): { w: number; h: number } {
  switch (type) {
    case "poll": return { w: 500, h: 180 };
    case "questions": return { w: 500, h: 140 };
    case "emoji": return { w: 150, h: 150 };
    case "emoji_slider": return { w: 500, h: 120 };
    case "add_yours": return { w: 500, h: 140 };
    case "music": return { w: 500, h: 100 };
    case "gif": return { w: 300, h: 300 };
    case "frame": return { w: 400, h: 480 };
    case "notify": return { w: 340, h: 64 };
    case "cutout": return { w: 250, h: 250 };
    case "avatar": return { w: 200, h: 200 };
    case "food_order": return { w: 400, h: 80 };
    case "quiz": return { w: 500, h: 200 };
    case "countdown": return { w: 400, h: 120 };
    default: return { w: 300, h: 64 };
  }
}

export function ToolPanel({ onAddElement, onShowBackgrounds }: ToolPanelProps) {
  const handleAddText = () => {
    onAddElement("text", getDefaultTextProps(), { width: 600, height: 120, x: 240, y: 800 });
  };

  const handleAddSticker = (sticker: (typeof STICKER_TOOLS)[number]) => {
    const { w, h } = getStickerSize(sticker.type);
    onAddElement(
      "sticker",
      { kind: "sticker", stickerType: sticker.type, data: sticker.defaults },
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

  return (
    <div className="w-[72px] bg-card border-r flex flex-col items-center py-3 gap-1 overflow-y-auto">
      <TooltipProvider delayDuration={200}>
        {/* Text */}
        <ToolBtn icon={<Type className="h-5 w-5" />} label="Texto" onClick={handleAddText} />

        <div className="w-10 border-t my-1" />

        {/* Stickers */}
        <div className="px-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Stickers</span>
        </div>
        {STICKER_TOOLS.map((s) => (
          <ToolBtn key={s.type} icon={s.icon} label={s.label} onClick={() => handleAddSticker(s)} />
        ))}

        <div className="w-10 border-t my-1" />

        {/* Images */}
        <ToolBtn icon={<ImageIcon className="h-5 w-5" />} label="Imagen" onClick={handleImageUpload} />

        <div className="w-10 border-t my-1" />

        {/* Shapes */}
        <ToolBtn icon={<Square className="h-4 w-4" />} label="Rectángulo" onClick={() => handleAddShape("rect")} />
        <ToolBtn icon={<Circle className="h-4 w-4" />} label="Círculo" onClick={() => handleAddShape("circle")} />
        <ToolBtn icon={<Minus className="h-4 w-4" />} label="Línea" onClick={() => handleAddShape("line")} />

        <div className="w-10 border-t my-1" />

        {/* Background */}
        <ToolBtn icon={<Palette className="h-5 w-5" />} label="Fondo" onClick={onShowBackgrounds} />

        <div className="flex-1" />

        {/* Info */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber-500 transition-colors">
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px] whitespace-normal">
            <p className="text-xs">Los stickers interactivos se publican como imagen estática. Para stickers nativos, usa la app de Instagram.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function ToolBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick} className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title={label}>
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
