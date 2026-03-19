"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Circle, Line, Transformer } from "react-konva";
import type Konva from "konva";
import type { StoryData, StoryElement, TextProps, StickerProps, ImageProps, ShapeProps } from "./types";

interface CanvasProps {
  storyData: StoryData;
  selectedElementId: string | null;
  stageRef: React.MutableRefObject<any>;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, changes: Partial<StoryElement>) => void;
}

// Parse gradient CSS to Konva-compatible fill
function parseGradientToFills(value: string): { fillLinearGradientStartPoint: any; fillLinearGradientEndPoint: any; fillLinearGradientColorStops: any } | null {
  const match = value.match(/linear-gradient\((\d+)deg,\s*(.*)\)/);
  if (!match) return null;
  const colorStops: (number | string)[] = [];
  const parts = match[2]!.split(",").map((s) => s.trim());
  parts.forEach((part) => {
    const m = part.match(/(#[a-fA-F0-9]+|rgba?\([^)]+\))\s*(\d+)?%?/);
    if (m) {
      const stop = m[2] ? parseInt(m[2]) / 100 : colorStops.length === 0 ? 0 : 1;
      colorStops.push(stop, m[1]!);
    }
  });
  return {
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 1080, y: 1920 },
    fillLinearGradientColorStops: colorStops,
  };
}

function useLoadedImage(src: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);
  return image;
}

// ─── Sticker Renderer ────────────────────────────────────────────────────────

const STICKER_COLORS: Record<string, { bg: string; text: string }> = {
  mention: { bg: "#E1306C", text: "#fff" },
  hashtag: { bg: "#833AB4", text: "#fff" },
  location: { bg: "#7C3AED", text: "#fff" },
  poll: { bg: "#ffffff", text: "#000" },
  questions: { bg: "#ffffff", text: "#000" },
  quiz: { bg: "#6366F1", text: "#fff" },
  countdown: { bg: "#EC4899", text: "#fff" },
  link: { bg: "#3B82F6", text: "#fff" },
  emoji: { bg: "transparent", text: "#000" },
  emoji_slider: { bg: "#ffffff", text: "#000" },
  add_yours: { bg: "#ffffff", text: "#000" },
  music: { bg: "rgba(0,0,0,0.6)", text: "#fff" },
  gif: { bg: "#00E5FF", text: "#000" },
  frame: { bg: "#ffffff", text: "#000" },
  notify: { bg: "#ffffff", text: "#000" },
  cutout: { bg: "transparent", text: "#fff" },
  avatar: { bg: "#E8DEF8", text: "#4A148C" },
  food_order: { bg: "#FF3D00", text: "#fff" },
};

function StickerContent({ props, width, height }: { props: StickerProps; width: number; height: number }) {
  const colors = STICKER_COLORS[props.stickerType] ?? { bg: "#fff", text: "#000" };

  // ─── Emoji (simple)
  if (props.stickerType === "emoji") {
    return (
      <Text text={props.data.emoji || "😍"} fontSize={Math.min(width, height) * 0.7} x={0} y={0} width={width} height={height} align="center" verticalAlign="middle" />
    );
  }

  // ─── Emoji Slider (reaction with slider bar)
  if (props.stickerType === "emoji_slider") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={16} shadowColor="rgba(0,0,0,0.15)" shadowBlur={8} shadowOffsetY={4} />
        <Text text={props.data.question || "¿Cuánto te gusta?"} x={16} y={14} fontSize={22} fontStyle="bold" fill="#000" width={width - 32} />
        {/* Slider track */}
        <Rect x={16} y={60} width={width - 80} height={12} fill="#E5E7EB" cornerRadius={6} />
        {/* Slider filled */}
        <Rect x={16} y={60} width={(width - 80) * 0.65} height={12} fill="#F59E0B" cornerRadius={6} />
        {/* Emoji on slider */}
        <Text text={props.data.emoji || "😍"} fontSize={36} x={(width - 80) * 0.65 - 2} y={46} />
      </Group>
    );
  }

  // ─── Add Yours / Tu turno
  if (props.stickerType === "add_yours") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={16} shadowColor="rgba(0,0,0,0.15)" shadowBlur={8} shadowOffsetY={4} />
        {/* Rainbow top border - 5 color segments */}
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect key={i} x={i * (width / 5)} y={0} width={width / 5 + 1} height={6}
            fill={["#FF3366", "#FF6633", "#FFCC33", "#33CC66", "#3366FF"][i]}
            cornerRadius={i === 0 ? 16 : i === 4 ? 16 : 0}
          />
        ))}
        <Text text="Tu turno" x={16} y={20} fontSize={18} fill="#9CA3AF" />
        <Text text={props.data.prompt || "Comparte tu foto"} x={16} y={46} fontSize={26} fontStyle="bold" fill="#000" width={width - 100} />
        {/* Camera icon placeholder */}
        <Rect x={width - 72} y={30} width={56} height={56} fill="#F3F4F6" cornerRadius={12} />
        <Text text="📷" fontSize={28} x={width - 58} y={44} />
      </Group>
    );
  }

  // ─── Music
  if (props.stickerType === "music") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={16} shadowColor="rgba(0,0,0,0.3)" shadowBlur={10} shadowOffsetY={4} />
        {/* Album art placeholder */}
        <Rect x={12} y={12} width={height - 24} height={height - 24} fill="#333" cornerRadius={8} />
        <Text text="🎵" fontSize={36} x={24} y={24} />
        {/* Song info */}
        <Text text={props.data.songName || "Canción"} x={height + 4} y={20} fontSize={22} fontStyle="bold" fill="#fff" width={width - height - 16} />
        <Text text={props.data.artist || "Artista"} x={height + 4} y={50} fontSize={18} fill="rgba(255,255,255,0.7)" width={width - height - 16} />
        {/* Sound wave bars */}
        {([16, 24, 20, 28, 18]).map((h, i) => (
          <Rect key={i} x={width - 70 + i * 12} y={height - 20 - h} width={6} height={h} fill="rgba(255,255,255,0.5)" cornerRadius={3} />
        ))}
      </Group>
    );
  }

  // ─── GIF
  if (props.stickerType === "gif") {
    return (
      <Group>
        <Rect width={width} height={height} fill="#1a1a1a" cornerRadius={16} shadowColor="rgba(0,0,0,0.2)" shadowBlur={8} shadowOffsetY={4} />
        {/* GIF badge */}
        <Rect x={width / 2 - 50} y={height / 2 - 30} width={100} height={60} fill="#00E5FF" cornerRadius={8} />
        <Text text="GIF" x={width / 2 - 50} y={height / 2 - 30} width={100} height={60} fontSize={36} fontStyle="bold" fill="#000" align="center" verticalAlign="middle" />
        {/* GIPHY attribution */}
        <Text text="Powered by GIPHY" x={0} y={height - 30} width={width} fontSize={14} fill="rgba(255,255,255,0.4)" align="center" />
      </Group>
    );
  }

  // ─── Frame (Marcos)
  if (props.stickerType === "frame") {
    const style = props.data.frameStyle || "polaroid";
    const padding = style === "polaroid" ? 24 : 16;
    const bottomPad = style === "polaroid" ? 80 : 16;
    return (
      <Group>
        {/* Frame border */}
        <Rect width={width} height={height} fill="#fff" cornerRadius={style === "polaroid" ? 4 : 16} shadowColor="rgba(0,0,0,0.25)" shadowBlur={12} shadowOffsetY={6} />
        {/* Photo area */}
        <Rect x={padding} y={padding} width={width - padding * 2} height={height - padding - bottomPad} fill="#E5E7EB" cornerRadius={style === "polaroid" ? 0 : 8} />
        <Text text="📸" fontSize={48} x={width / 2 - 24} y={(height - bottomPad) / 2 - 10} />
        <Text text="Toca para añadir foto" fontSize={18} fill="#9CA3AF" x={0} y={(height - bottomPad) / 2 + 44} width={width} align="center" />
        {/* Caption area for polaroid */}
        {style === "polaroid" && (
          <Text text={props.data.caption || "Escribe aquí..."} x={padding} y={height - bottomPad + 16} fontSize={20} fill="#666" width={width - padding * 2} fontFamily="'Caveat', cursive" />
        )}
      </Group>
    );
  }

  // ─── Notify
  if (props.stickerType === "notify") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={32} shadowColor="rgba(0,0,0,0.15)" shadowBlur={8} shadowOffsetY={4} />
        <Text text="🔔" fontSize={28} x={16} y={height / 2 - 16} />
        <Text text={props.data.label || "Activar recordatorio"} x={52} y={0} height={height} fontSize={22} fontStyle="bold" fill="#000" verticalAlign="middle" width={width - 68} />
      </Group>
    );
  }

  // ─── Cutout (Recortes)
  if (props.stickerType === "cutout") {
    return (
      <Group>
        {/* Dashed circle border */}
        <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) / 2 - 4} fill="#F3F4F6" stroke="#9CA3AF" strokeWidth={3} dash={[10, 6]} />
        <Text text="✂️" fontSize={40} x={width / 2 - 20} y={height / 2 - 36} />
        <Text text="Recortar" fontSize={18} fill="#6B7280" x={0} y={height / 2 + 12} width={width} align="center" />
      </Group>
    );
  }

  // ─── Avatar
  if (props.stickerType === "avatar") {
    return (
      <Group>
        <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) / 2} fill={colors.bg} shadowColor="rgba(0,0,0,0.2)" shadowBlur={10} shadowOffsetY={4} />
        <Text text="🧑" fontSize={Math.min(width, height) * 0.5} x={0} y={0} width={width} height={height} align="center" verticalAlign="middle" />
        <Text text="Avatar" fontSize={16} fill={colors.text} x={0} y={height * 0.72} width={width} align="center" />
      </Group>
    );
  }

  // ─── Food Order
  if (props.stickerType === "food_order") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={40} shadowColor="rgba(0,0,0,0.2)" shadowBlur={8} shadowOffsetY={4} />
        <Text text="🍕" fontSize={32} x={16} y={height / 2 - 18} />
        <Text text={props.data.buttonText || "Pedir ahora"} x={56} y={0} height={height} fontSize={24} fontStyle="bold" fill="#fff" verticalAlign="middle" width={width - 72} />
      </Group>
    );
  }

  // ─── Poll
  if (props.stickerType === "poll") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={16} shadowColor="rgba(0,0,0,0.2)" shadowBlur={8} shadowOffsetY={4} />
        <Text text={props.data.question || "¿Qué prefieres?"} x={16} y={16} fontSize={24} fontStyle="bold" fill="#000" width={width - 32} />
        <Rect x={16} y={60} width={width - 32} height={44} fill="#E8E8E8" cornerRadius={22} />
        <Text text={props.data.optionA || "Opción A"} x={16} y={60} width={width - 32} height={44} fontSize={20} fill="#333" align="center" verticalAlign="middle" />
        <Rect x={16} y={114} width={width - 32} height={44} fill="#E8E8E8" cornerRadius={22} />
        <Text text={props.data.optionB || "Opción B"} x={16} y={114} width={width - 32} height={44} fontSize={20} fill="#333" align="center" verticalAlign="middle" />
      </Group>
    );
  }

  // ─── Questions
  if (props.stickerType === "questions") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={16} shadowColor="rgba(0,0,0,0.2)" shadowBlur={8} shadowOffsetY={4} />
        <Text text={props.data.question || "Hazme una pregunta"} x={16} y={16} fontSize={22} fontStyle="bold" fill={colors.text} width={width - 32} align="center" />
        <Rect x={16} y={66} width={width - 32} height={50} fill="#F3F4F6" cornerRadius={12} />
        <Text text="Escribe aquí..." x={28} y={66} height={50} fontSize={18} fill="#9CA3AF" verticalAlign="middle" />
      </Group>
    );
  }

  // ─── Quiz
  if (props.stickerType === "quiz") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={16} shadowColor="rgba(0,0,0,0.2)" shadowBlur={8} shadowOffsetY={4} />
        <Text text="CUESTIONARIO" x={16} y={12} fontSize={14} fill="rgba(255,255,255,0.7)" />
        <Text text={props.data.question || "¿Cuál es...?"} x={16} y={32} fontSize={24} fontStyle="bold" fill="#fff" width={width - 32} />
        {/* Options */}
        {["A", "B", "C", "D"].map((opt, i) => (
          <Group key={opt}>
            <Rect x={16} y={72 + i * 30} width={width - 32} height={26} fill="rgba(255,255,255,0.15)" cornerRadius={4} />
            <Text text={`${opt}. Opción ${opt}`} x={24} y={72 + i * 30} height={26} fontSize={16} fill="#fff" verticalAlign="middle" />
          </Group>
        ))}
      </Group>
    );
  }

  // ─── Countdown
  if (props.stickerType === "countdown") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={16} shadowColor="rgba(0,0,0,0.2)" shadowBlur={8} shadowOffsetY={4} />
        <Text text={props.data.label || "Evento"} x={0} y={12} width={width} fontSize={20} fontStyle="bold" fill="#fff" align="center" />
        {/* Timer display */}
        {(["Días", "Hrs", "Min", "Seg"] as const).map((label, i) => (
          <Group key={label}>
            <Rect x={24 + i * (width - 48) / 4} y={46} width={(width - 72) / 4} height={50} fill="rgba(255,255,255,0.2)" cornerRadius={8} />
            <Text text="00" x={24 + i * (width - 48) / 4} y={46} width={(width - 72) / 4} height={38} fontSize={28} fontStyle="bold" fill="#fff" align="center" verticalAlign="middle" />
            <Text text={label} x={24 + i * (width - 48) / 4} y={84} width={(width - 72) / 4} fontSize={10} fill="rgba(255,255,255,0.7)" align="center" />
          </Group>
        ))}
      </Group>
    );
  }

  // ─── Default (mention, hashtag, location, link)
  const label = {
    mention: `@${props.data.username || "usuario"}`,
    hashtag: `#${props.data.tag || "hashtag"}`,
    location: `📍 ${props.data.location || "Ubicación"}`,
    link: `🔗 ${props.data.label || "Ver más"}`,
  }[props.stickerType] ?? props.stickerType;

  return (
    <Group>
      <Rect width={width} height={height} fill={colors.bg} cornerRadius={16} shadowColor="rgba(0,0,0,0.2)" shadowBlur={8} shadowOffsetY={4} />
      <Text text={label} x={0} y={0} width={width} height={height} fontSize={props.stickerType === "hashtag" || props.stickerType === "mention" ? 28 : 22} fontStyle="bold" fill={colors.text} align="center" verticalAlign="middle" padding={12} />
    </Group>
  );
}

// ─── Element Renderer ────────────────────────────────────────────────────────

function ElementRenderer({ element }: { element: StoryElement }) {
  const imgSrc = element.type === "image" ? (element.props as ImageProps).src : undefined;
  const loadedImg = useLoadedImage(imgSrc);
  const tp = element.props as TextProps;
  const sp = element.props as ShapeProps;

  if (element.type === "text") {
    return (
      <Text
        text={tp.text}
        fontFamily={tp.fontFamily}
        fontSize={tp.fontSize}
        fontStyle={`${tp.fontWeight >= 700 ? "bold" : "normal"} ${tp.fontStyle}`}
        fill={tp.fill}
        stroke={tp.stroke || undefined}
        strokeWidth={tp.strokeWidth || 0}
        align={tp.align}
        lineHeight={tp.lineHeight}
        textDecoration={tp.textDecoration || undefined}
        shadowColor={tp.shadowColor || undefined}
        shadowBlur={tp.shadowBlur || 0}
        shadowOffsetX={tp.shadowOffsetX || 0}
        shadowOffsetY={tp.shadowOffsetY || 0}
        width={element.width}
        wrap="word"
      />
    );
  }

  if (element.type === "sticker") {
    return <StickerContent props={element.props as StickerProps} width={element.width} height={element.height} />;
  }

  if (element.type === "image" && loadedImg) {
    return <KonvaImage image={loadedImg} width={element.width} height={element.height} />;
  }

  if (element.type === "shape") {
    if (sp.shapeType === "circle") {
      return <Circle x={element.width / 2} y={element.height / 2} radius={Math.min(element.width, element.height) / 2} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.strokeWidth} />;
    }
    if (sp.shapeType === "line") {
      return <Line points={[0, element.height / 2, element.width, element.height / 2]} stroke={sp.stroke || sp.fill} strokeWidth={sp.strokeWidth || 4} />;
    }
    return <Rect width={element.width} height={element.height} fill={sp.fill} stroke={sp.stroke} strokeWidth={sp.strokeWidth} cornerRadius={sp.cornerRadius} />;
  }

  return null;
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────

function PhoneMockup({ scale, children }: { scale: number; children: React.ReactNode }) {
  const bezel = 6;
  const phoneW = 1080 * scale + bezel * 2;
  const phoneH = 1920 * scale + bezel * 2 + 16;
  const borderRadius = 44 * Math.max(scale, 0.3);

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: phoneW, height: phoneH }}
    >
      {/* Outer frame — titanium-style */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius,
          background: "linear-gradient(145deg, #2a2a2e 0%, #1c1c1e 50%, #2a2a2e 100%)",
          boxShadow: "0 25px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset, 4px 0 8px -2px rgba(0,0,0,0.3), -4px 0 8px -2px rgba(0,0,0,0.3)",
        }}
      />
      {/* Side button — right (power) */}
      <div className="absolute" style={{ right: -2, top: 90 * scale, width: 3, height: 40 * scale, backgroundColor: "#3a3a3c", borderRadius: "0 2px 2px 0" }} />
      {/* Side buttons — left (volume + action) */}
      <div className="absolute" style={{ left: -2, top: 70 * scale, width: 3, height: 20 * scale, backgroundColor: "#3a3a3c", borderRadius: "2px 0 0 2px" }} />
      <div className="absolute" style={{ left: -2, top: 100 * scale, width: 3, height: 35 * scale, backgroundColor: "#3a3a3c", borderRadius: "2px 0 0 2px" }} />
      <div className="absolute" style={{ left: -2, top: 142 * scale, width: 3, height: 35 * scale, backgroundColor: "#3a3a3c", borderRadius: "2px 0 0 2px" }} />
      {/* Screen content area */}
      <div
        className="absolute overflow-hidden bg-black"
        style={{
          top: bezel,
          left: bezel,
          right: bezel,
          bottom: bezel + 16,
          borderRadius: borderRadius - bezel,
        }}
      >
        {/* Dynamic Island */}
        <div
          className="absolute z-20"
          style={{
            top: 8 * Math.max(scale, 0.35),
            left: "50%",
            transform: "translateX(-50%)",
            width: 90 * Math.max(scale, 0.5),
            height: 22 * Math.max(scale, 0.5),
            backgroundColor: "#000",
            borderRadius: 11 * Math.max(scale, 0.5),
            boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
          }}
        />
        {/* Status bar */}
        <div
          className="absolute z-10 flex items-center justify-between text-white font-medium"
          style={{
            top: 4,
            left: 16,
            right: 16,
            fontSize: Math.max(9, 10 * scale),
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          <span style={{ opacity: 0.8 }}>9:41</span>
          <div className="flex items-center gap-1" style={{ opacity: 0.8 }}>
            <svg width={Math.max(12, 14 * scale)} height={Math.max(8, 10 * scale)} viewBox="0 0 16 12" fill="white">
              <rect x="0" y="8" width="3" height="4" rx="0.5" opacity="0.4" />
              <rect x="4.5" y="5" width="3" height="7" rx="0.5" opacity="0.6" />
              <rect x="9" y="2" width="3" height="10" rx="0.5" opacity="0.8" />
              <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
            </svg>
            <svg width={Math.max(10, 12 * scale)} height={Math.max(8, 10 * scale)} viewBox="0 0 14 10" fill="white">
              <path d="M7 2C4.5 2 2.3 3 0.7 4.7L2.1 6.1C3.3 4.9 5.1 4.1 7 4.1s3.7.8 4.9 2l1.4-1.4C11.7 3 9.5 2 7 2z" opacity="0.4" />
              <path d="M7 5.5c-1.5 0-2.8.6-3.8 1.6L4.6 8.5c.6-.6 1.5-1 2.4-1s1.8.4 2.4 1l1.4-1.4c-1-1-2.3-1.6-3.8-1.6z" opacity="0.7" />
              <circle cx="7" cy="10" r="1.2" />
            </svg>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: Math.max(16, 20 * scale), height: Math.max(8, 9 * scale), border: "1px solid rgba(255,255,255,0.5)", borderRadius: 2, padding: 1, position: "relative" }}>
                <div style={{ width: "75%", height: "100%", backgroundColor: "#34C759", borderRadius: 1 }} />
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
      {/* Home indicator */}
      <div
        className="absolute rounded-full"
        style={{
          bottom: 6,
          left: "50%",
          transform: "translateX(-50%)",
          width: Math.max(60, 100 * scale),
          height: 4,
          backgroundColor: "rgba(255,255,255,0.3)",
        }}
      />
    </div>
  );
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────

export function StoryCanvas({ storyData, selectedElementId, stageRef, onSelectElement, onUpdateElement }: CanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);
  const bgImage = useLoadedImage(storyData.background.type === "image" ? storyData.background.value : undefined);

  // Responsive scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0]!.contentRect;
      // Account for phone frame padding (24px width, 80px height)
      const s = Math.min((width - 64) / 1080, (height - 120) / 1920);
      setScale(Math.max(0.15, Math.min(s, 0.6)));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Attach transformer
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    const stage = stageRef.current as Konva.Stage;
    if (selectedElementId) {
      const node = stage.findOne(`#${selectedElementId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    transformerRef.current.nodes([]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedElementId, stageRef]);

  const handleStageClick = useCallback(
    (e: any) => {
      if (e.target === e.target.getStage()) {
        onSelectElement(null);
      }
    },
    [onSelectElement]
  );

  const handleDragEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
      onUpdateElement(id, { x: e.target.x(), y: e.target.y() });
    },
    [onUpdateElement]
  );

  const handleTransformEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onUpdateElement(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, node.width() * scaleX),
        height: Math.max(20, node.height() * scaleY),
        rotation: node.rotation(),
      });
    },
    [onUpdateElement]
  );

  // Background fill props
  const bgFill = storyData.background.type === "color" ? storyData.background.value : undefined;
  const gradientProps = storyData.background.type === "gradient" ? parseGradientToFills(storyData.background.value) : null;

  return (
    <div ref={containerRef} className="flex-1 flex items-center justify-center bg-zinc-900/50 overflow-hidden">
      <PhoneMockup scale={scale}>
        <Stage
          ref={stageRef}
          width={1080}
          height={1920}
          scaleX={scale}
          scaleY={scale}
          style={{ width: 1080 * scale, height: 1920 * scale }}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          {/* Background */}
          <Layer>
            {bgImage ? (
              <KonvaImage image={bgImage} width={1080} height={1920} />
            ) : (
              <Rect
                x={0}
                y={0}
                width={1080}
                height={1920}
                fill={bgFill}
                {...(gradientProps || {})}
              />
            )}
          </Layer>

          {/* Elements */}
          <Layer>
            {storyData.elements.map((el) => (
              <Group
                key={el.id}
                id={el.id}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                rotation={el.rotation}
                opacity={el.opacity}
                draggable
                onClick={() => onSelectElement(el.id)}
                onTap={() => onSelectElement(el.id)}
                onDragEnd={(e) => handleDragEnd(el.id, e)}
                onTransformEnd={(e) => handleTransformEnd(el.id, e)}
              >
                <ElementRenderer element={el} />
              </Group>
            ))}
          </Layer>

          {/* Transformer */}
          <Layer>
            <Transformer
              ref={transformerRef}
              anchorFill="#fff"
              anchorStroke="#3B82F6"
              anchorSize={12}
              borderStroke="#3B82F6"
              borderStrokeWidth={2}
              rotateAnchorOffset={30}
              enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </PhoneMockup>
    </div>
  );
}
