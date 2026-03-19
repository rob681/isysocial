// ─── Story Editor Types ─────────────────────────────────────────────────────

export interface StoryData {
  version: 1;
  width: 1080;
  height: 1920;
  background: BackgroundConfig;
  elements: StoryElement[];
}

export interface BackgroundConfig {
  type: "color" | "gradient" | "image";
  value: string; // hex, CSS gradient, or image URL
}

export interface StoryElement {
  id: string;
  type: "text" | "sticker" | "image" | "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  props: TextProps | StickerProps | ImageProps | ShapeProps;
}

export interface TextProps {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  fill: string;
  stroke: string;
  strokeWidth: number;
  align: "left" | "center" | "right";
  lineHeight: number;
  textDecoration: "" | "underline" | "line-through";
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export type StickerType =
  | "mention"
  | "hashtag"
  | "location"
  | "poll"
  | "questions"
  | "quiz"
  | "countdown"
  | "link"
  | "emoji"
  | "emoji_slider"
  | "add_yours"
  | "music"
  | "gif"
  | "frame"
  | "notify"
  | "cutout"
  | "avatar"
  | "food_order";

export interface StickerProps {
  kind: "sticker";
  stickerType: StickerType;
  data: Record<string, string>;
}

export interface ImageProps {
  kind: "image";
  src: string;
  brightness: number;
  contrast: number;
}

export interface ShapeProps {
  kind: "shape";
  shapeType: "rect" | "circle" | "line";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

// ─── Editor State ───────────────────────────────────────────────────────────

export interface EditorState {
  storyData: StoryData;
  selectedElementId: string | null;
  history: StoryData[];
  historyIndex: number;
  isDirty: boolean;
}

export type EditorAction =
  | { type: "ADD_ELEMENT"; element: StoryElement }
  | { type: "UPDATE_ELEMENT"; id: string; changes: Partial<StoryElement> }
  | { type: "DELETE_ELEMENT"; id: string }
  | { type: "SELECT_ELEMENT"; id: string | null }
  | { type: "SET_BACKGROUND"; background: BackgroundConfig }
  | { type: "REORDER_ELEMENT"; id: string; direction: "up" | "down" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD"; storyData: StoryData }
  | { type: "MARK_CLEAN" };

// ─── Defaults ───────────────────────────────────────────────────────────────

export function getDefaultStoryData(): StoryData {
  return {
    version: 1,
    width: 1080,
    height: 1920,
    background: { type: "gradient", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    elements: [],
  };
}

export function getDefaultTextProps(): TextProps {
  return {
    kind: "text",
    text: "Texto aquí",
    fontFamily: "Montserrat",
    fontSize: 64,
    fontWeight: 700,
    fontStyle: "normal",
    fill: "#ffffff",
    stroke: "",
    strokeWidth: 0,
    align: "center",
    lineHeight: 1.2,
    textDecoration: "",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowBlur: 10,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
  };
}

export function createStoryElement(
  type: StoryElement["type"],
  props: StoryElement["props"],
  overrides?: Partial<StoryElement>
): StoryElement {
  return {
    id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    x: 540 - 200,
    y: 960 - 100,
    width: 400,
    height: 200,
    rotation: 0,
    opacity: 1,
    props,
    ...overrides,
  };
}
