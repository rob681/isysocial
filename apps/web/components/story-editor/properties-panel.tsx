"use client";

import { useState, useEffect, useCallback } from "react";
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
  Search,
  Loader2,
} from "lucide-react";
import type { StoryElement, TextProps, StickerProps, ShapeProps, ImageProps } from "./types";
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

      {/* Image properties (brightness, contrast) */}
      {el.type === "image" && <ImageProperties props={el.props as ImageProps} updateProps={updateProps} />}

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
      {props.stickerType === "emoji" && (
        <div>
          <Label className="text-xs">Emoji</Label>
          <Input value={props.data.emoji || ""} onChange={(e) => updateData("emoji", e.target.value)} className="text-2xl" />
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
        <GiphySearch
          query={props.data.query || ""}
          selectedUrl={props.data.gifUrl || ""}
          onQueryChange={(q) => updateData("query", q)}
          onSelectGif={(url) => updateData("gifUrl", url)}
        />
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
            <Label className="text-xs">Foto del marco</Label>
            {props.data.photoUrl ? (
              <div className="space-y-1.5">
                <img src={props.data.photoUrl} alt="Foto" className="w-full h-24 object-cover rounded-md border" />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => updateData("photoUrl", "")}
                >
                  Quitar foto
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
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
                    try {
                      const res = await fetch("/api/upload", { method: "POST", body: formData });
                      const data = await res.json();
                      if (data.url) updateData("photoUrl", data.url);
                    } catch { /* silent */ }
                  };
                  input.click();
                }}
              >
                📸 Subir foto
              </Button>
            )}
          </div>
          <div>
            <Label className="text-xs">Texto (Polaroid)</Label>
            <Input value={props.data.caption || ""} onChange={(e) => updateData("caption", e.target.value)} placeholder="Escribe aquí..." />
          </div>
        </>
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
    </>
  );
}

// ─── Image Properties ────────────────────────────────────────────────────────

function ImageProperties({ props, updateProps }: { props: ImageProps; updateProps: (c: Record<string, any>) => void }) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Brillo</Label>
          <span className="text-[10px] text-muted-foreground">{Math.round((props.brightness || 0) * 100)}%</span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={props.brightness || 0}
          onChange={(e) => updateProps({ brightness: parseFloat(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Contraste</Label>
          <span className="text-[10px] text-muted-foreground">{Math.round((props.contrast || 0) * 100)}%</span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          step={5}
          value={props.contrast || 0}
          onChange={(e) => updateProps({ contrast: parseInt(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>
      {/* Quick filter presets */}
      <div>
        <Label className="text-xs mb-1.5 block">Filtros rápidos</Label>
        <div className="flex gap-1.5">
          <button
            onClick={() => updateProps({ brightness: 0, contrast: 0 })}
            className="flex-1 py-1.5 text-[10px] rounded-md border hover:bg-accent transition-colors"
          >
            Normal
          </button>
          <button
            onClick={() => updateProps({ brightness: 0.1, contrast: 20 })}
            className="flex-1 py-1.5 text-[10px] rounded-md border hover:bg-accent transition-colors"
          >
            Vivid
          </button>
          <button
            onClick={() => updateProps({ brightness: -0.15, contrast: 30 })}
            className="flex-1 py-1.5 text-[10px] rounded-md border hover:bg-accent transition-colors"
          >
            Drama
          </button>
          <button
            onClick={() => updateProps({ brightness: 0.2, contrast: -20 })}
            className="flex-1 py-1.5 text-[10px] rounded-md border hover:bg-accent transition-colors"
          >
            Suave
          </button>
        </div>
      </div>
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

// ─── GIPHY Search ────────────────────────────────────────────────────────────

const GIPHY_KEY = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65"; // Public beta key (free tier — 42M+ library)

interface GiphyResult {
  id: string;
  previewUrl: string;
  stillUrl: string;
  title: string;
}

function GiphySearch({
  query,
  selectedUrl,
  onQueryChange,
  onSelectGif,
}: {
  query: string;
  selectedUrl: string;
  onQueryChange: (q: string) => void;
  onSelectGif: (url: string) => void;
}) {
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [stickersOnly, setStickersOnly] = useState(false);

  const fetchGifs = useCallback(async (q: string, transparentFilter = false) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const searchQuery = transparentFilter ? `${q} sticker transparent` : q;
      const endpoint = q === "trending" && !transparentFilter
        ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=18&rating=g`
        : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(searchQuery)}&limit=18&rating=g`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setResults(
        (data.data || []).map((gif: any) => ({
          id: gif.id,
          previewUrl: gif.images?.fixed_width?.url || "",
          stillUrl: gif.images?.fixed_width_still?.url || gif.images?.original_still?.url || "",
          title: gif.title || "",
        }))
      );
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on mount
  useEffect(() => {
    if (!searched && results.length === 0) {
      fetchGifs("trending", false);
    }
  }, []);

  const handleSearch = () => {
    if (query.trim()) fetchGifs(query, stickersOnly);
  };

  const handleToggleStickers = () => {
    const newValue = !stickersOnly;
    setStickersOnly(newValue);
    const q = query.trim() || "trending";
    fetchGifs(q, newValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Buscar GIF</Label>
      <div className="flex gap-1">
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="love, happy, dance..."
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </Button>
      </div>

      {/* Stickers toggle */}
      <button
        onClick={handleToggleStickers}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
          stickersOnly
            ? "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300"
            : "hover:bg-muted/50"
        }`}
      >
        <span className="text-sm">{stickersOnly ? "✓" : "○"}</span>
        Solo stickers transparentes
      </button>

      {/* Quick search chips */}
      <div className="flex flex-wrap gap-1">
        {["trending", "love", "happy", "wow", "dance", "fire"].map((tag) => (
          <button
            key={tag}
            onClick={() => { onQueryChange(tag); fetchGifs(tag, stickersOnly); }}
            className="px-2 py-0.5 text-[10px] rounded-full border hover:bg-accent transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-1 max-h-[240px] overflow-y-auto rounded-lg">
          {results.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelectGif(gif.stillUrl || gif.previewUrl)}
              className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:opacity-90 ${
                selectedUrl === (gif.stillUrl || gif.previewUrl)
                  ? "border-primary ring-1 ring-primary"
                  : "border-transparent"
              }`}
            >
              <img
                src={gif.previewUrl}
                alt={gif.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <p className="text-[10px] text-muted-foreground text-center py-2">No se encontraron GIFs</p>
      )}

      {selectedUrl && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <span className="text-xs">📸</span>
          <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
            Se exporta como imagen estática
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        Powered by GIPHY
      </p>
    </div>
  );
}
