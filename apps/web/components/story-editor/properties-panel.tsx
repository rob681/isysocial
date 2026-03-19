"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  ChevronUp,
  ChevronDown,
  Underline,
} from "lucide-react";
import type { StoryElement, TextProps, StickerProps, ShapeProps } from "./types";
import { STORY_FONTS } from "./fonts";
import { GRADIENT_PRESETS, COLOR_PRESETS } from "./backgrounds";
import type { BackgroundConfig } from "./types";

interface PropertiesPanelProps {
  selectedElement: StoryElement | null;
  background: BackgroundConfig;
  showBackgrounds: boolean;
  onUpdateElement: (id: string, changes: Partial<StoryElement>) => void;
  onDeleteElement: (id: string) => void;
  onReorderElement: (id: string, direction: "up" | "down") => void;
  onSetBackground: (bg: BackgroundConfig) => void;
  onCloseBackgrounds: () => void;
}

export function PropertiesPanel({
  selectedElement,
  background,
  showBackgrounds,
  onUpdateElement,
  onDeleteElement,
  onReorderElement,
  onSetBackground,
  onCloseBackgrounds,
}: PropertiesPanelProps) {
  if (showBackgrounds) {
    return (
      <div className="w-[280px] bg-card border-l overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Fondo</h3>
          <Button variant="ghost" size="sm" onClick={onCloseBackgrounds}>
            Cerrar
          </Button>
        </div>

        {/* Solid colors */}
        <Label className="text-xs text-muted-foreground mb-2 block">Color sólido</Label>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => onSetBackground({ type: "color", value: c })}
              className="w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: background.type === "color" && background.value === c ? "#3B82F6" : "transparent" }}
            />
          ))}
        </div>
        <Input
          type="color"
          value={background.type === "color" ? background.value : "#667eea"}
          onChange={(e) => onSetBackground({ type: "color", value: e.target.value })}
          className="h-10 mb-4"
        />

        {/* Gradients */}
        <Label className="text-xs text-muted-foreground mb-2 block">Degradados</Label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {GRADIENT_PRESETS.map((g) => (
            <button
              key={g.name}
              onClick={() => onSetBackground({ type: "gradient", value: g.value })}
              className="h-12 rounded-lg border-2 transition-transform hover:scale-105"
              style={{ background: g.value, borderColor: background.value === g.value ? "#3B82F6" : "transparent" }}
            />
          ))}
        </div>

        {/* Image */}
        <Label className="text-xs text-muted-foreground mb-2 block">Imagen de fondo</Label>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              const formData = new FormData();
              formData.append("file", file);
              formData.append("folder", "stories");
              const res = await fetch("/api/upload", { method: "POST", body: formData });
              const data = await res.json();
              if (data.url) onSetBackground({ type: "image", value: data.url });
            };
            input.click();
          }}
        >
          Subir imagen
        </Button>
      </div>
    );
  }

  if (!selectedElement) {
    return (
      <div className="w-[280px] bg-card border-l p-4 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">Selecciona un elemento del canvas para editar sus propiedades</p>
      </div>
    );
  }

  const el = selectedElement;
  const updateProps = (changes: Record<string, any>) => {
    onUpdateElement(el.id, { props: { ...el.props, ...changes } });
  };

  return (
    <div className="w-[280px] bg-card border-l overflow-y-auto p-4 space-y-4">
      {/* Common controls */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm capitalize">
          {el.type === "text" ? "Texto" : el.type === "sticker" ? "Sticker" : el.type === "image" ? "Imagen" : "Forma"}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReorderElement(el.id, "up")}>
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReorderElement(el.id, "down")}>
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteElement(el.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <Label className="text-xs">Opacidad</Label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={el.opacity}
          onChange={(e) => onUpdateElement(el.id, { opacity: parseFloat(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Text properties */}
      {el.type === "text" && <TextProperties props={el.props as TextProps} updateProps={updateProps} />}

      {/* Sticker properties */}
      {el.type === "sticker" && <StickerProperties props={el.props as StickerProps} updateProps={updateProps} />}

      {/* Shape properties */}
      {el.type === "shape" && <ShapeProperties props={el.props as ShapeProps} updateProps={updateProps} />}
    </div>
  );
}

// ─── Text Properties ─────────────────────────────────────────────────────────

function TextProperties({ props, updateProps }: { props: TextProps; updateProps: (c: Record<string, any>) => void }) {
  return (
    <>
      <div>
        <Label className="text-xs">Contenido</Label>
        <textarea
          value={props.text}
          onChange={(e) => updateProps({ text: e.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
        />
      </div>

      <div>
        <Label className="text-xs">Fuente</Label>
        <select
          value={props.fontFamily}
          onChange={(e) => updateProps({ fontFamily: e.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {STORY_FONTS.map((f) => (
            <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
              {f.family}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Tamaño</Label>
          <Input type="number" value={props.fontSize} onChange={(e) => updateProps({ fontSize: +e.target.value })} min={12} max={200} />
        </div>
        <div>
          <Label className="text-xs">Peso</Label>
          <select
            value={props.fontWeight}
            onChange={(e) => updateProps({ fontWeight: +e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value={400}>Normal</option>
            <option value={600}>Semibold</option>
            <option value={700}>Bold</option>
            <option value={800}>Extra Bold</option>
            <option value={900}>Black</option>
          </select>
        </div>
      </div>

      <div className="flex gap-1">
        <Button variant={props.fontWeight >= 700 ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => updateProps({ fontWeight: props.fontWeight >= 700 ? 400 : 700 })}>
          <Bold className="h-3 w-3" />
        </Button>
        <Button variant={props.fontStyle === "italic" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => updateProps({ fontStyle: props.fontStyle === "italic" ? "normal" : "italic" })}>
          <Italic className="h-3 w-3" />
        </Button>
        <Button variant={props.textDecoration === "underline" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => updateProps({ textDecoration: props.textDecoration === "underline" ? "" : "underline" })}>
          <Underline className="h-3 w-3" />
        </Button>
        <div className="w-px bg-border mx-1" />
        <Button variant={props.align === "left" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => updateProps({ align: "left" })}>
          <AlignLeft className="h-3 w-3" />
        </Button>
        <Button variant={props.align === "center" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => updateProps({ align: "center" })}>
          <AlignCenter className="h-3 w-3" />
        </Button>
        <Button variant={props.align === "right" ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => updateProps({ align: "right" })}>
          <AlignRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Color</Label>
          <Input type="color" value={props.fill} onChange={(e) => updateProps({ fill: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Contorno</Label>
          <Input type="color" value={props.stroke || "#000000"} onChange={(e) => updateProps({ stroke: e.target.value, strokeWidth: props.strokeWidth || 2 })} className="h-9" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Sombra</Label>
        <input
          type="range"
          min={0}
          max={30}
          value={props.shadowBlur}
          onChange={(e) => updateProps({ shadowBlur: +e.target.value })}
          className="w-full accent-primary"
        />
      </div>
    </>
  );
}

// ─── Sticker Properties ──────────────────────────────────────────────────────

function StickerProperties({ props, updateProps }: { props: StickerProps; updateProps: (c: Record<string, any>) => void }) {
  const updateData = (key: string, value: string) => {
    updateProps({ data: { ...props.data, [key]: value } });
  };

  return (
    <>
      {props.stickerType === "mention" && (
        <div>
          <Label className="text-xs">Usuario</Label>
          <Input value={props.data.username || ""} onChange={(e) => updateData("username", e.target.value)} placeholder="@usuario" />
        </div>
      )}
      {props.stickerType === "hashtag" && (
        <div>
          <Label className="text-xs">Hashtag</Label>
          <Input value={props.data.tag || ""} onChange={(e) => updateData("tag", e.target.value)} placeholder="hashtag" />
        </div>
      )}
      {props.stickerType === "location" && (
        <div>
          <Label className="text-xs">Ubicación</Label>
          <Input value={props.data.location || ""} onChange={(e) => updateData("location", e.target.value)} placeholder="Ciudad, País" />
        </div>
      )}
      {props.stickerType === "poll" && (
        <>
          <div>
            <Label className="text-xs">Pregunta</Label>
            <Input value={props.data.question || ""} onChange={(e) => updateData("question", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Opción A</Label>
              <Input value={props.data.optionA || ""} onChange={(e) => updateData("optionA", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Opción B</Label>
              <Input value={props.data.optionB || ""} onChange={(e) => updateData("optionB", e.target.value)} />
            </div>
          </div>
        </>
      )}
      {props.stickerType === "questions" && (
        <div>
          <Label className="text-xs">Pregunta</Label>
          <Input value={props.data.question || ""} onChange={(e) => updateData("question", e.target.value)} />
        </div>
      )}
      {props.stickerType === "countdown" && (
        <>
          <div>
            <Label className="text-xs">Nombre del evento</Label>
            <Input value={props.data.label || ""} onChange={(e) => updateData("label", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fecha</Label>
            <Input type="datetime-local" value={props.data.date || ""} onChange={(e) => updateData("date", e.target.value)} />
          </div>
        </>
      )}
      {props.stickerType === "link" && (
        <>
          <div>
            <Label className="text-xs">Texto del enlace</Label>
            <Input value={props.data.label || ""} onChange={(e) => updateData("label", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">URL</Label>
            <Input value={props.data.url || ""} onChange={(e) => updateData("url", e.target.value)} placeholder="https://..." />
          </div>
        </>
      )}
      {props.stickerType === "emoji" && (
        <div>
          <Label className="text-xs">Emoji</Label>
          <Input value={props.data.emoji || ""} onChange={(e) => updateData("emoji", e.target.value)} className="text-2xl" />
        </div>
      )}
      {props.stickerType === "emoji_slider" && (
        <>
          <div>
            <Label className="text-xs">Pregunta</Label>
            <Input value={props.data.question || ""} onChange={(e) => updateData("question", e.target.value)} placeholder="¿Cuánto te gusta?" />
          </div>
          <div>
            <Label className="text-xs">Emoji</Label>
            <Input value={props.data.emoji || ""} onChange={(e) => updateData("emoji", e.target.value)} className="text-2xl" />
          </div>
        </>
      )}
      {props.stickerType === "add_yours" && (
        <div>
          <Label className="text-xs">Mensaje</Label>
          <Input value={props.data.prompt || ""} onChange={(e) => updateData("prompt", e.target.value)} placeholder="Comparte tu foto" />
        </div>
      )}
      {props.stickerType === "music" && (
        <>
          <div>
            <Label className="text-xs">Canción</Label>
            <Input value={props.data.songName || ""} onChange={(e) => updateData("songName", e.target.value)} placeholder="Nombre de la canción" />
          </div>
          <div>
            <Label className="text-xs">Artista</Label>
            <Input value={props.data.artist || ""} onChange={(e) => updateData("artist", e.target.value)} placeholder="Nombre del artista" />
          </div>
        </>
      )}
      {props.stickerType === "gif" && (
        <div>
          <Label className="text-xs">Búsqueda GIF</Label>
          <Input value={props.data.query || ""} onChange={(e) => updateData("query", e.target.value)} placeholder="trending, love, happy..." />
          <p className="text-[10px] text-muted-foreground mt-1">Se renderiza como placeholder visual. Integración GIPHY próximamente.</p>
        </div>
      )}
      {props.stickerType === "frame" && (
        <>
          <div>
            <Label className="text-xs">Estilo de marco</Label>
            <select
              value={props.data.frameStyle || "polaroid"}
              onChange={(e) => updateData("frameStyle", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="polaroid">Polaroid</option>
              <option value="rounded">Redondeado</option>
              <option value="vintage">Vintage</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Texto (Polaroid)</Label>
            <Input value={props.data.caption || ""} onChange={(e) => updateData("caption", e.target.value)} placeholder="Escribe aquí..." />
          </div>
        </>
      )}
      {props.stickerType === "notify" && (
        <div>
          <Label className="text-xs">Texto del recordatorio</Label>
          <Input value={props.data.label || ""} onChange={(e) => updateData("label", e.target.value)} placeholder="Activar recordatorio" />
        </div>
      )}
      {props.stickerType === "cutout" && (
        <div>
          <Label className="text-xs">Forma del recorte</Label>
          <select
            value={props.data.shape || "circle"}
            onChange={(e) => updateData("shape", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="circle">Círculo</option>
            <option value="star">Estrella</option>
            <option value="heart">Corazón</option>
          </select>
        </div>
      )}
      {props.stickerType === "avatar" && (
        <div>
          <Label className="text-xs">Estilo de avatar</Label>
          <select
            value={props.data.style || "default"}
            onChange={(e) => updateData("style", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="default">Por defecto</option>
            <option value="happy">Feliz</option>
            <option value="wave">Saludo</option>
          </select>
        </div>
      )}
      {props.stickerType === "food_order" && (
        <>
          <div>
            <Label className="text-xs">Nombre del negocio</Label>
            <Input value={props.data.businessName || ""} onChange={(e) => updateData("businessName", e.target.value)} placeholder="Mi restaurante" />
          </div>
          <div>
            <Label className="text-xs">Texto del botón</Label>
            <Input value={props.data.buttonText || ""} onChange={(e) => updateData("buttonText", e.target.value)} placeholder="Pedir ahora" />
          </div>
        </>
      )}
    </>
  );
}

// ─── Shape Properties ────────────────────────────────────────────────────────

function ShapeProperties({ props, updateProps }: { props: ShapeProps; updateProps: (c: Record<string, any>) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Relleno</Label>
          <Input type="color" value={props.fill || "#ffffff"} onChange={(e) => updateProps({ fill: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Borde</Label>
          <Input type="color" value={props.stroke || "#000000"} onChange={(e) => updateProps({ stroke: e.target.value })} className="h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Grosor del borde</Label>
        <Input type="number" value={props.strokeWidth} onChange={(e) => updateProps({ strokeWidth: +e.target.value })} min={0} max={20} />
      </div>
      {props.shapeType === "rect" && (
        <div>
          <Label className="text-xs">Radio de esquina</Label>
          <Input type="number" value={props.cornerRadius} onChange={(e) => updateProps({ cornerRadius: +e.target.value })} min={0} max={100} />
        </div>
      )}
    </>
  );
}
