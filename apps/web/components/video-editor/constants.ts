import type { FilterPreset, TextTemplate, VideoFilter } from "./types";

// ─── GIPHY ─────────────────────────────────────────────────────────────────

export const GIPHY_KEY = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65";

// ─── Default Filter ────────────────────────────────────────────────────────

export const DEFAULT_FILTER: VideoFilter = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  hueRotate: 0,
};

// ─── Filter Presets ────────────────────────────────────────────────────────

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "normal",
    name: "Normal",
    emoji: "☀️",
    filter: { ...DEFAULT_FILTER },
  },
  {
    id: "vivid",
    name: "Vivido",
    emoji: "🌈",
    filter: { ...DEFAULT_FILTER, contrast: 120, saturation: 140 },
  },
  {
    id: "bw",
    name: "B&N",
    emoji: "🖤",
    filter: { ...DEFAULT_FILTER, grayscale: 100 },
  },
  {
    id: "warm",
    name: "Cálido",
    emoji: "🔥",
    filter: { ...DEFAULT_FILTER, sepia: 30, brightness: 105 },
  },
  {
    id: "cool",
    name: "Frío",
    emoji: "❄️",
    filter: { ...DEFAULT_FILTER, hueRotate: 190, brightness: 95 },
  },
];

// ─── Text Templates ────────────────────────────────────────────────────────

export const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: "titulo",
    name: "Título",
    preview: "TÍTULO",
    style: {
      fontSize: 48,
      color: "#ffffff",
      bold: true,
      textTransform: "uppercase",
      letterSpacing: 4,
      backgroundColor: "transparent",
    },
  },
  {
    id: "subtitulo",
    name: "Subtítulo",
    preview: "Subtítulo",
    style: {
      fontSize: 28,
      color: "#ffffff",
      bold: true,
      backgroundColor: "rgba(0,0,0,0.6)",
    },
  },
  {
    id: "caption",
    name: "Caption",
    preview: "Caption text",
    style: {
      fontSize: 20,
      color: "#ffffff",
      bold: false,
      y: 85,
      backgroundColor: "rgba(0,0,0,0.75)",
    },
  },
  {
    id: "neon",
    name: "Neon",
    preview: "NEON",
    style: {
      fontSize: 40,
      color: "#00ff88",
      bold: true,
      backgroundColor: "transparent",
      shadow: "0 0 20px #00ff88, 0 0 40px #00ff88",
      textTransform: "uppercase",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    preview: "minimal",
    style: {
      fontSize: 24,
      color: "#ffffff",
      bold: false,
      backgroundColor: "transparent",
      textTransform: "lowercase",
      letterSpacing: 6,
    },
  },
  {
    id: "impacto",
    name: "Impacto",
    preview: "IMPACTO",
    style: {
      fontSize: 56,
      color: "#FFD700",
      bold: true,
      backgroundColor: "transparent",
      strokeColor: "#000000",
      strokeWidth: 3,
      textTransform: "uppercase",
    },
  },
];
