// ─── Text Overlay ──────────────────────────────────────────────────────────

export interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  bold: boolean;
  startTime: number; // seconds
  endTime: number; // seconds (0 = full duration)
  // v2 additions
  templateId?: string;
  shadow?: string; // CSS text-shadow for neon glow, e.g. "0 0 20px #00ff88"
  strokeColor?: string;
  strokeWidth?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
}

export function createTextOverlay(duration: number, template?: Partial<TextOverlay>): TextOverlay {
  return {
    id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    text: "Texto aquí",
    x: 50,
    y: 50,
    fontSize: 32,
    fontFamily: "Montserrat",
    color: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.5)",
    bold: true,
    startTime: 0,
    endTime: duration || 0,
    ...template,
  };
}

// ─── Trim ──────────────────────────────────────────────────────────────────

export interface TrimRange {
  start: number;
  end: number;
}

// ─── Video Filter ──────────────────────────────────────────────────────────

export interface VideoFilter {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  saturation: number; // 0-200, default 100
  grayscale: number;  // 0-100, default 0
  sepia: number;      // 0-100, default 0
  blur: number;       // 0-10, default 0
  hueRotate: number;  // 0-360, default 0
}

export interface FilterPreset {
  id: string;
  name: string;
  emoji: string;
  filter: VideoFilter;
}

// ─── Sticker Overlay ───────────────────────────────────────────────────────

export interface StickerOverlay {
  id: string;
  url: string;
  title: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage of canvas width (5-80)
  startTime: number;
  endTime: number; // 0 = full duration
}

export function createStickerOverlay(url: string, title: string, duration: number): StickerOverlay {
  return {
    id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    url,
    title,
    x: 50,
    y: 50,
    width: 25,
    startTime: 0,
    endTime: duration || 0,
  };
}

// ─── Audio Track ───────────────────────────────────────────────────────────

export interface AudioTrack {
  id: string;
  name: string;
  url: string; // object URL
  volume: number; // 0-1
  muted: boolean;
}

// ─── Text Template ─────────────────────────────────────────────────────────

export interface TextTemplate {
  id: string;
  name: string;
  preview: string; // display text for the card
  style: Partial<TextOverlay>;
}

// ─── Active Tool ───────────────────────────────────────────────────────────

export type ActiveTool = "trim" | "text" | "filter" | "sticker" | "audio";

// ─── Export Data ───────────────────────────────────────────────────────────

export interface VideoEditorExportData {
  videoUrl: string;
  trim: TrimRange;
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  filter: VideoFilter;
  audioTrack: AudioTrack | null;
  duration: number;
}

// ─── Legacy (kept for compat) ──────────────────────────────────────────────

export interface VideoEditorState {
  videoUrl: string;
  duration: number;
  trim: TrimRange;
  textOverlays: TextOverlay[];
  currentTime: number;
  isPlaying: boolean;
}
