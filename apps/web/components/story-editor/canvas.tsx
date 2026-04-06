"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Circle, Line, Transformer } from "react-konva";
import Konva from "konva";
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
  const angle = parseInt(match[1]!) * (Math.PI / 180);
  const colorStops: (number | string)[] = [];
  const parts = match[2]!.split(",").map((s) => s.trim());
  parts.forEach((part) => {
    const m = part.match(/(#[a-fA-F0-9]+|rgba?\([^)]+\))\s*(\d+)?%?/);
    if (m) {
      const stop = m[2] ? parseInt(m[2]) / 100 : colorStops.length === 0 ? 0 : 1;
      colorStops.push(stop, m[1]!);
    }
  });
  // Calculate gradient direction based on angle
  const cx = 540, cy = 960;
  const len = 1200;
  return {
    fillLinearGradientStartPoint: { x: cx - Math.sin(angle) * len, y: cy - Math.cos(angle) * len },
    fillLinearGradientEndPoint: { x: cx + Math.sin(angle) * len, y: cy + Math.cos(angle) * len },
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

// ─── GIF Image sub-component (loads GIPHY still into Konva) ──────────────────

function GifImage({ src, width, height }: { src: string; width: number; height: number }) {
  const img = useLoadedImage(src);
  if (!img) return <Text text="Cargando..." x={0} y={height / 2 - 10} width={width} fontSize={16} fill="rgba(255,255,255,0.5)" align="center" />;
  // Cover-fit the image inside the sticker bounds
  const imgRatio = img.width / img.height;
  const boxRatio = width / height;
  let drawW = width, drawH = height, drawX = 0, drawY = 0;
  if (imgRatio > boxRatio) {
    drawH = height;
    drawW = height * imgRatio;
    drawX = (width - drawW) / 2;
  } else {
    drawW = width;
    drawH = width / imgRatio;
    drawY = (height - drawH) / 2;
  }
  return <KonvaImage image={img} x={drawX} y={drawY} width={drawW} height={drawH} cornerRadius={20} />;
}

// ─── Frame Photo sub-component (loads uploaded photo into frame) ────────────

function FramePhoto({ src, x, y, width, height, cornerRadius }: { src: string; x: number; y: number; width: number; height: number; cornerRadius: number }) {
  const img = useLoadedImage(src);
  if (!img) return <Text text="Cargando..." x={x} y={y + height / 2 - 10} width={width} fontSize={14} fill="#9CA3AF" align="center" />;
  // Cover-fit the image
  const imgRatio = img.width / img.height;
  const boxRatio = width / height;
  let drawW = width, drawH = height, drawX = x, drawY = y;
  if (imgRatio > boxRatio) {
    drawH = height;
    drawW = height * imgRatio;
    drawX = x + (width - drawW) / 2;
  } else {
    drawW = width;
    drawH = width / imgRatio;
    drawY = y + (height - drawH) / 2;
  }
  return (
    <Group clipX={x} clipY={y} clipWidth={width} clipHeight={height}>
      <KonvaImage image={img} x={drawX} y={drawY} width={drawW} height={drawH} />
    </Group>
  );
}

// ─── Sticker Renderer ────────────────────────────────────────────────────────

const STICKER_COLORS: Record<string, { bg: string; text: string }> = {
  mention: { bg: "#E1306C", text: "#fff" },
  hashtag: { bg: "#833AB4", text: "#fff" },
  location: { bg: "#7C3AED", text: "#fff" },
  emoji: { bg: "transparent", text: "#000" },
  music: { bg: "rgba(0,0,0,0.6)", text: "#fff" },
  gif: { bg: "#00E5FF", text: "#000" },
  frame: { bg: "#ffffff", text: "#000" },
  cutout: { bg: "transparent", text: "#fff" },
  avatar: { bg: "#E8DEF8", text: "#4A148C" },
};

function StickerContent({ props, width, height }: { props: StickerProps; width: number; height: number }) {
  const colors = STICKER_COLORS[props.stickerType] ?? { bg: "#fff", text: "#000" };

  // ─── Emoji (simple)
  if (props.stickerType === "emoji") {
    return (
      <Text text={props.data.emoji || "😍"} fontSize={Math.min(width, height) * 0.7} x={0} y={0} width={width} height={height} align="center" verticalAlign="middle" />
    );
  }

  // ─── Music
  if (props.stickerType === "music") {
    return (
      <Group>
        <Rect width={width} height={height} fill={colors.bg} cornerRadius={20} shadowColor="rgba(0,0,0,0.3)" shadowBlur={12} shadowOffsetY={4} />
        {/* Album art placeholder */}
        <Rect x={12} y={12} width={height - 24} height={height - 24} fill="#333" cornerRadius={10} />
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

  // ─── GIF (shows selected GIPHY image or placeholder)
  if (props.stickerType === "gif") {
    return (
      <Group>
        <Rect width={width} height={height} fill="#1a1a1a" cornerRadius={20} shadowColor="rgba(0,0,0,0.2)" shadowBlur={10} shadowOffsetY={4} />
        {props.data.gifUrl ? (
          <GifImage src={props.data.gifUrl} width={width} height={height} />
        ) : (
          <>
            <Rect x={width / 2 - 55} y={height / 2 - 32} width={110} height={64} fill="#00E5FF" cornerRadius={10} />
            <Text text="GIF" x={width / 2 - 55} y={height / 2 - 32} width={110} height={64} fontSize={40} fontStyle="bold" fill="#000" align="center" verticalAlign="middle" />
            <Text text="Selecciona un GIF" x={0} y={height - 36} width={width} fontSize={14} fill="rgba(255,255,255,0.4)" align="center" />
          </>
        )}
      </Group>
    );
  }

  // ─── Frame (Marcos)
  if (props.stickerType === "frame") {
    const style = props.data.frameStyle || "polaroid";
    const padding = style === "polaroid" ? 24 : 16;
    const bottomPad = style === "polaroid" ? 80 : 16;
    const photoW = width - padding * 2;
    const photoH = height - padding - bottomPad;
    return (
      <Group>
        {/* Frame border */}
        <Rect width={width} height={height} fill={style === "vintage" ? "#F5F0E8" : "#fff"} cornerRadius={style === "polaroid" ? 6 : 20} shadowColor="rgba(0,0,0,0.2)" shadowBlur={16} shadowOffsetY={6} />
        {style === "vintage" && (
          <Rect x={4} y={4} width={width - 8} height={height - 8} fill="transparent" stroke="#C9B99A" strokeWidth={3} cornerRadius={18} />
        )}
        {/* Photo area */}
        <Rect x={padding} y={padding} width={photoW} height={photoH} fill="#E5E7EB" cornerRadius={style === "polaroid" ? 2 : 10} />
        {props.data.photoUrl ? (
          <FramePhoto src={props.data.photoUrl} x={padding} y={padding} width={photoW} height={photoH} cornerRadius={style === "polaroid" ? 2 : 10} />
        ) : (
          <>
            <Text text="📸" fontSize={48} x={width / 2 - 24} y={(height - bottomPad) / 2 - 10} />
            <Text text="Sube una foto" fontSize={18} fill="#9CA3AF" x={0} y={(height - bottomPad) / 2 + 44} width={width} align="center" />
          </>
        )}
        {/* Caption area for polaroid */}
        {style === "polaroid" && (
          <Text text={props.data.caption || "Escribe aquí..."} x={padding} y={height - bottomPad + 16} fontSize={20} fill="#666" width={width - padding * 2} fontFamily="'Caveat', cursive" />
        )}
      </Group>
    );
  }

  // ─── Cutout (Recortes)
  if (props.stickerType === "cutout") {
    return (
      <Group>
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
        <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) / 2} fill={colors.bg} shadowColor="rgba(0,0,0,0.15)" shadowBlur={12} shadowOffsetY={4} />
        <Text text="🧑" fontSize={Math.min(width, height) * 0.5} x={0} y={0} width={width} height={height} align="center" verticalAlign="middle" />
        <Text text="Avatar" fontSize={16} fill={colors.text} x={0} y={height * 0.72} width={width} align="center" />
      </Group>
    );
  }

  // ─── Default (mention, hashtag, location)
  const label = {
    mention: `@${props.data.username || "usuario"}`,
    hashtag: `#${props.data.tag || "hashtag"}`,
    location: `📍 ${props.data.location || "Ubicación"}`,
  }[props.stickerType] ?? props.stickerType;

  return (
    <Group>
      <Rect width={width} height={height} fill={colors.bg} cornerRadius={height / 2} shadowColor="rgba(0,0,0,0.15)" shadowBlur={10} shadowOffsetY={3} />
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
    const ip = element.props as ImageProps;
    const filters: any[] = [];
    if (ip.brightness) filters.push(Konva.Filters.Brighten);
    if (ip.contrast) filters.push(Konva.Filters.Contrast);
    return (
      <KonvaImage
        image={loadedImg}
        width={element.width}
        height={element.height}
        filters={filters.length > 0 ? filters : undefined}
        brightness={ip.brightness || 0}
        contrast={ip.contrast || 0}
        ref={(node: any) => { if (node && filters.length > 0) node.cache(); }}
      />
    );
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

// ─── Phone Mockup ────────────────────────────────────────────────────────────
//
// Replicates the exact pattern from instagram-story.tsx mockup:
//   - Outer: black div with p-3 (12px bezel), rounded-[40px]
//   - Inner: screen area, rounded-[35px], overflow-hidden
//   - Dynamic Island: centered, small pill
//   - Home indicator: bottom bar
//
// This is a simple, proven layout — no complex calculations.

function PhoneMockup({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width, height }}
    >
      {/* Device body — black with 12px padding as bezel */}
      <div
        className="absolute inset-0 bg-black shadow-2xl overflow-hidden"
        style={{ borderRadius: 40, padding: 12 }}
      >
        {/* Inner screen */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{ borderRadius: 28 }}
        >
          {children}
        </div>
      </div>

      {/* Dynamic Island — small centered pill */}
      <div
        className="absolute z-20 left-1/2 -translate-x-1/2 pointer-events-none bg-black"
        style={{
          top: 14,
          width: Math.round(width * 0.3),
          height: 20,
          borderRadius: 99,
        }}
      />

      {/* Home indicator */}
      <div
        className="absolute z-20 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          bottom: 16,
          width: Math.round(width * 0.35),
          height: 4,
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: 99,
        }}
      />
    </div>
  );
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────

export function StoryCanvas({ storyData, selectedElementId, stageRef, onSelectElement, onUpdateElement }: CanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mockupSize, setMockupSize] = useState({ w: 280, h: 580 });
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const bgImage = useLoadedImage(storyData.background.type === "image" ? storyData.background.value : undefined);

  // The screen inside the mockup must be exactly 9:16 (matching the 1080×1920 canvas).
  // Mockup = screen + 12px bezel on each side.
  // We compute the largest screen that fits, then derive the mockup size.
  const BEZEL = 12;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width: cw, height: ch } = entries[0]!.contentRect;
      const pad = 24;
      const availW = cw - pad * 2 - BEZEL * 2; // available for screen
      const availH = ch - pad * 2 - BEZEL * 2;

      // Screen must be 9:16
      let sw = availW;
      let sh = Math.round(sw * (16 / 9));
      if (sh > availH) {
        sh = availH;
        sw = Math.round(sh * (9 / 16));
      }

      sw = Math.max(180, Math.min(sw, 400));
      sh = Math.round(sw * (16 / 9));

      setMockupSize({ w: sw + BEZEL * 2, h: sh + BEZEL * 2 });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Screen = mockup minus bezel
  const screenW = mockupSize.w - BEZEL * 2;
  const screenH = mockupSize.h - BEZEL * 2;

  // Scale: maps 1080×1920 design coords → screen display pixels
  const scale = screenW / 1080;

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

  // Snap threshold in canvas units
  const SNAP_THRESHOLD = 12;
  const CANVAS_CX = 540; // 1080 / 2
  const CANVAS_CY = 960; // 1920 / 2

  const handleDragMove = useCallback(
    (el: StoryElement, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const x = node.x();
      const y = node.y();
      const cx = x + el.width / 2;
      const cy = y + el.height / 2;
      const newGuides: { x?: number; y?: number } = {};

      // Snap to horizontal center
      if (Math.abs(cx - CANVAS_CX) < SNAP_THRESHOLD) {
        node.x(CANVAS_CX - el.width / 2);
        newGuides.x = CANVAS_CX;
      }
      // Snap to vertical center
      if (Math.abs(cy - CANVAS_CY) < SNAP_THRESHOLD) {
        node.y(CANVAS_CY - el.height / 2);
        newGuides.y = CANVAS_CY;
      }
      setGuides(newGuides);
    },
    []
  );

  const handleDragEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
      setGuides({});
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
    <div ref={containerRef} className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/60 overflow-hidden">
      <PhoneMockup width={mockupSize.w} height={mockupSize.h}>
        <Stage
          ref={stageRef}
          width={screenW}
          height={screenH}
          scaleX={scale}
          scaleY={scale}
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
                onDragMove={(e) => handleDragMove(el, e)}
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
              anchorSize={10}
              anchorCornerRadius={5}
              borderStroke="#3B82F6"
              borderStrokeWidth={1.5}
              borderDash={[4, 4]}
              rotateAnchorOffset={25}
              enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return oldBox;
                return newBox;
              }}
            />
            {/* Snap guide lines */}
            {guides.x !== undefined && (
              <Line points={[guides.x, 0, guides.x, 1920]} stroke="#3B82F6" strokeWidth={1.5} dash={[8, 6]} opacity={0.7} />
            )}
            {guides.y !== undefined && (
              <Line points={[0, guides.y, 1080, guides.y]} stroke="#3B82F6" strokeWidth={1.5} dash={[8, 6]} opacity={0.7} />
            )}
          </Layer>
        </Stage>
      </PhoneMockup>
    </div>
  );
}
