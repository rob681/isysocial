"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Play,
  Pause,
  Scissors,
  Type,
  Download,
  RotateCcw,
  Plus,
  X,
  GripVertical,
  Move,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number;
  color: string;
  fontWeight: "normal" | "bold";
  bgColor: string; // background color (empty = transparent)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

function VideoEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const videoUrl = searchParams.get("videoUrl") || "";
  const fileName = searchParams.get("fileName") || "video.mp4";
  const postId = searchParams.get("postId");

  // Video refs & state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Text overlays
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trim" | "text">("trim");

  // Export state
  const [exporting, setExporting] = useState(false);

  // Dragging state
  const [dragging, setDragging] = useState<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setTrimEnd(video.duration);
  }, []);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Stop at trim end
    if (video.currentTime >= trimEnd) {
      video.pause();
      setIsPlaying(false);
    }
  }, [trimEnd]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // Start from trimStart if before it
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const addTextOverlay = () => {
    const newOverlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: "Tu texto aqui",
      x: 50,
      y: 50,
      fontSize: 24,
      color: "#FFFFFF",
      fontWeight: "bold",
      bgColor: "rgba(0,0,0,0.5)",
    };
    setTextOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlay(newOverlay.id);
  };

  const updateOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const removeOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedOverlay === id) setSelectedOverlay(null);
  };

  // Handle drag on video preview
  const handleOverlayMouseDown = (e: React.MouseEvent, overlayId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(overlayId);
    setSelectedOverlay(overlayId);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = videoContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      updateOverlay(dragging, {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
      });
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  const trimmedDuration = trimEnd - trimStart;

  // Timeline click handler
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = pct * duration;
    seekTo(Math.max(0, Math.min(duration, time)));
  };

  // Reset trim
  const resetTrim = () => {
    setTrimStart(0);
    setTrimEnd(duration);
  };

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No se encontro video para editar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xl">🎬</span>
          <h1 className="text-xl font-bold">Isycine Studio</h1>
        </div>
        <span className="text-sm text-muted-foreground ml-2">{fileName}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Left: Video Preview ───────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Video with text overlays */}
          <div
            ref={videoContainerRef}
            className="relative bg-black rounded-xl overflow-hidden"
            style={{ aspectRatio: "9/16", maxHeight: "70vh", margin: "0 auto" }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              playsInline
            />

            {/* Text overlays rendered on top of video */}
            {textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className={cn(
                  "absolute cursor-move select-none transition-shadow",
                  selectedOverlay === overlay.id && "ring-2 ring-violet-400 ring-offset-1"
                )}
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: `${overlay.fontSize}px`,
                  color: overlay.color,
                  fontWeight: overlay.fontWeight,
                  backgroundColor: overlay.bgColor || "transparent",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                }}
                onMouseDown={(e) => handleOverlayMouseDown(e, overlay.id)}
                onClick={() => setSelectedOverlay(overlay.id)}
              >
                {overlay.text}
              </div>
            ))}

            {/* Play/Pause overlay button */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-7 w-7 text-black ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* Timeline & Controls */}
          <div className="mt-4 space-y-3">
            {/* Playback controls */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <span className="text-sm font-mono text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Timeline bar */}
            <div className="relative px-1">
              <div
                className="relative h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer overflow-hidden"
                onClick={handleTimelineClick}
              >
                {/* Trim region highlight */}
                <div
                  className="absolute top-0 bottom-0 bg-violet-500/30"
                  style={{
                    left: `${(trimStart / duration) * 100}%`,
                    width: `${((trimEnd - trimStart) / duration) * 100}%`,
                  }}
                />

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-violet-500" />
                </div>

                {/* Trim handles */}
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-violet-500 cursor-ew-resize z-20 rounded-l"
                  style={{ left: `${(trimStart / duration) * 100}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const bar = e.currentTarget.parentElement!;
                    const onMove = (ev: MouseEvent) => {
                      const rect = bar.getBoundingClientRect();
                      const pct = Math.max(0, Math.min((ev.clientX - rect.left) / rect.width, (trimEnd - 0.5) / duration));
                      setTrimStart(pct * duration);
                    };
                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-violet-500 cursor-ew-resize z-20 rounded-r"
                  style={{ left: `${(trimEnd / duration) * 100}%`, transform: "translateX(-100%)" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const bar = e.currentTarget.parentElement!;
                    const onMove = (ev: MouseEvent) => {
                      const rect = bar.getBoundingClientRect();
                      const pct = Math.min(1, Math.max((ev.clientX - rect.left) / rect.width, (trimStart + 0.5) / duration));
                      setTrimEnd(pct * duration);
                    };
                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                />
              </div>
            </div>

            {/* Trim info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Inicio: {formatTime(trimStart)}</span>
              <span className="font-medium text-violet-500">
                Duracion: {formatTime(trimmedDuration)}
              </span>
              <span>Fin: {formatTime(trimEnd)}</span>
            </div>
          </div>
        </div>

        {/* ─── Right: Tools Panel ────────────────────────────────────── */}
        <div className="lg:w-[320px] flex-shrink-0 space-y-4">
          {/* Tab switcher */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                activeTab === "trim"
                  ? "bg-violet-600 text-white"
                  : "bg-card hover:bg-accent/50"
              )}
              onClick={() => setActiveTab("trim")}
            >
              <Scissors className="h-4 w-4" />
              Recortar
            </button>
            <button
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                activeTab === "text"
                  ? "bg-violet-600 text-white"
                  : "bg-card hover:bg-accent/50"
              )}
              onClick={() => setActiveTab("text")}
            >
              <Type className="h-4 w-4" />
              Texto
            </button>
          </div>

          {/* Trim Tab */}
          {activeTab === "trim" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Inicio del corte</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step={0.1}
                        min={0}
                        max={trimEnd - 0.5}
                        value={trimStart.toFixed(1)}
                        onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setTrimStart(currentTime)}
                      >
                        Marcar aqui
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Fin del corte</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step={0.1}
                        min={trimStart + 0.5}
                        max={duration}
                        value={trimEnd.toFixed(1)}
                        onChange={(e) => setTrimEnd(parseFloat(e.target.value) || duration)}
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setTrimEnd(currentTime)}
                      >
                        Marcar aqui
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Duracion final</p>
                    <p className="text-lg font-bold text-violet-500">{formatTime(trimmedDuration)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetTrim}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => seekTo(trimStart)}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Previsualizar corte
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Text Tab */}
          {activeTab === "text" && (
            <div className="space-y-3">
              <Button onClick={addTextOverlay} className="w-full gap-2 bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4" />
                Agregar texto
              </Button>

              {textOverlays.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Type className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Agrega texto a tu video</p>
                  <p className="text-xs mt-1">Arrastra para posicionar</p>
                </div>
              )}

              {textOverlays.map((overlay) => (
                <Card
                  key={overlay.id}
                  className={cn(
                    "transition-colors cursor-pointer",
                    selectedOverlay === overlay.id && "ring-2 ring-violet-400"
                  )}
                  onClick={() => setSelectedOverlay(overlay.id)}
                >
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Texto</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOverlay(overlay.id);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Input
                      value={overlay.text}
                      onChange={(e) => updateOverlay(overlay.id, { text: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="Escribe tu texto..."
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Tamano</Label>
                        <Input
                          type="number"
                          min={12}
                          max={72}
                          value={overlay.fontSize}
                          onChange={(e) => updateOverlay(overlay.id, { fontSize: parseInt(e.target.value) || 24 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Peso</Label>
                        <select
                          value={overlay.fontWeight}
                          onChange={(e) => updateOverlay(overlay.id, { fontWeight: e.target.value as any })}
                          className="h-7 w-full rounded-md border bg-background px-2 text-xs"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Color texto</Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={overlay.color}
                            onChange={(e) => updateOverlay(overlay.id, { color: e.target.value })}
                            className="w-7 h-7 rounded cursor-pointer border"
                          />
                          <span className="text-[10px] text-muted-foreground">{overlay.color}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Fondo</Label>
                        <select
                          value={overlay.bgColor}
                          onChange={(e) => updateOverlay(overlay.id, { bgColor: e.target.value })}
                          className="h-7 w-full rounded-md border bg-background px-2 text-xs"
                        >
                          <option value="rgba(0,0,0,0.5)">Negro semi</option>
                          <option value="rgba(0,0,0,0.8)">Negro fuerte</option>
                          <option value="rgba(255,255,255,0.8)">Blanco</option>
                          <option value="">Transparente</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Move className="h-3 w-3" />
                      Arrastra el texto en el video para moverlo
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Export actions */}
          <div className="space-y-2 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              La edicion se aplicara al guardar la publicacion
            </p>
            <Button
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  // Store edit data in session storage so it can be retrieved on the post page
                  const editData = {
                    trimStart,
                    trimEnd,
                    textOverlays,
                    timestamp: Date.now(),
                  };
                  sessionStorage.setItem(`video-edit-${postId}`, JSON.stringify(editData));
                  
                  toast({
                    title: "Edicion guardada",
                    description: `Corte: ${formatTime(trimStart)} - ${formatTime(trimEnd)}${textOverlays.length > 0 ? ` + ${textOverlays.length} texto(s)` : ""}`,
                  });
                  
                  // Navigate directly to the post instead of going back
                  if (postId) {
                    router.push(`/admin/contenido/${postId}`);
                  } else {
                    router.back();
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "No se pudo guardar la edicion",
                    variant: "destructive",
                  });
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {exporting ? "Guardando..." : "Guardar y volver"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VideoEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VideoEditorContent />
    </Suspense>
  );
}
