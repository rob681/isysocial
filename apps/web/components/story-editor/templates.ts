import type { StoryData } from "./types";

export interface StoryTemplate {
  id: string;
  name: string;
  category: "marketing" | "engagement" | "informativo" | "creativo";
  previewGradient: string; // CSS gradient for thumbnail
  storyData: StoryData;
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  // 1. Anuncio — Bold text + vibrant gradient
  {
    id: "anuncio",
    name: "Anuncio",
    category: "marketing",
    previewGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
      elements: [
        {
          id: "t_title", type: "text", x: 90, y: 680, width: 900, height: 200, rotation: 0, opacity: 1,
          props: { kind: "text", text: "NUEVO\nANUNCIO", fontFamily: "Montserrat", fontSize: 96, fontWeight: 900, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.1, textDecoration: "", shadowColor: "rgba(0,0,0,0.3)", shadowBlur: 20, shadowOffsetX: 0, shadowOffsetY: 4 },
        },
        {
          id: "t_sub", type: "text", x: 140, y: 920, width: 800, height: 80, rotation: 0, opacity: 0.85,
          props: { kind: "text", text: "Descubre lo que tenemos para ti", fontFamily: "Montserrat", fontSize: 32, fontWeight: 400, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.3, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_cta", type: "shape", x: 340, y: 1060, width: 400, height: 70, rotation: 0, opacity: 1,
          props: { kind: "shape", shapeType: "rect", fill: "#ffffff", stroke: "", strokeWidth: 0, cornerRadius: 35 },
        },
        {
          id: "t_cta_text", type: "text", x: 340, y: 1060, width: 400, height: 70, rotation: 0, opacity: 1,
          props: { kind: "text", text: "Ver ahora", fontFamily: "Montserrat", fontSize: 28, fontWeight: 700, fontStyle: "normal", fill: "#667eea", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
      ],
    },
  },

  // 2. Promoción — Price tag + CTA
  {
    id: "promocion",
    name: "Promo",
    category: "marketing",
    previewGradient: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)" },
      elements: [
        {
          id: "t_badge", type: "shape", x: 340, y: 420, width: 400, height: 400, rotation: -5, opacity: 1,
          props: { kind: "shape", shapeType: "circle", fill: "#ffffff", stroke: "", strokeWidth: 0, cornerRadius: 0 },
        },
        {
          id: "t_pct", type: "text", x: 340, y: 500, width: 400, height: 200, rotation: -5, opacity: 1,
          props: { kind: "text", text: "50%\nOFF", fontFamily: "Montserrat", fontSize: 80, fontWeight: 900, fontStyle: "normal", fill: "#f83600", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_desc", type: "text", x: 90, y: 900, width: 900, height: 120, rotation: 0, opacity: 1,
          props: { kind: "text", text: "En todos los productos\nseleccionados", fontFamily: "Montserrat", fontSize: 36, fontWeight: 600, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.3, textDecoration: "", shadowColor: "rgba(0,0,0,0.2)", shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 2 },
        },
        {
          id: "t_cta2", type: "shape", x: 340, y: 1080, width: 400, height: 70, rotation: 0, opacity: 1,
          props: { kind: "shape", shapeType: "rect", fill: "#ffffff", stroke: "", strokeWidth: 0, cornerRadius: 35 },
        },
        {
          id: "t_cta2_text", type: "text", x: 340, y: 1080, width: 400, height: 70, rotation: 0, opacity: 1,
          props: { kind: "text", text: "Comprar ahora", fontFamily: "Montserrat", fontSize: 26, fontWeight: 700, fontStyle: "normal", fill: "#f83600", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
      ],
    },
  },

  // 3. Pregunta del día (solo diseño, sin sticker interactivo)
  {
    id: "pregunta",
    name: "Pregunta",
    category: "engagement",
    previewGradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)" },
      elements: [
        {
          id: "t_emoji", type: "sticker", x: 465, y: 550, width: 150, height: 150, rotation: 0, opacity: 1,
          props: { kind: "sticker", stickerType: "emoji", data: { emoji: "🤔" } },
        },
        {
          id: "t_title", type: "text", x: 90, y: 730, width: 900, height: 100, rotation: 0, opacity: 1,
          props: { kind: "text", text: "Pregunta del día", fontFamily: "Playfair Display", fontSize: 56, fontWeight: 700, fontStyle: "normal", fill: "#1a1a2e", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.2, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_q_box", type: "shape", x: 140, y: 880, width: 800, height: 140, rotation: 0, opacity: 1,
          props: { kind: "shape", shapeType: "rect", fill: "#ffffff", stroke: "", strokeWidth: 0, cornerRadius: 20 },
        },
        {
          id: "t_q_text", type: "text", x: 160, y: 910, width: 760, height: 80, rotation: 0, opacity: 1,
          props: { kind: "text", text: "¿Cuál es tu favorito?", fontFamily: "Montserrat", fontSize: 34, fontWeight: 600, fontStyle: "normal", fill: "#1a1a2e", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.3, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
      ],
    },
  },

  // 4. Mención de marca (replaces Encuesta)
  {
    id: "mencion",
    name: "Mención",
    category: "engagement",
    previewGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
      elements: [
        {
          id: "t_title", type: "text", x: 90, y: 600, width: 900, height: 100, rotation: 0, opacity: 1,
          props: { kind: "text", text: "¡Gracias por elegirnos!", fontFamily: "Montserrat", fontSize: 44, fontWeight: 800, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.2, textDecoration: "", shadowColor: "rgba(0,0,0,0.2)", shadowBlur: 15, shadowOffsetX: 0, shadowOffsetY: 4 },
        },
        {
          id: "t_mention", type: "sticker", x: 340, y: 780, width: 300, height: 64, rotation: 0, opacity: 1,
          props: { kind: "sticker", stickerType: "mention", data: { username: "tumarca" } },
        },
        {
          id: "t_hashtag", type: "sticker", x: 340, y: 870, width: 300, height: 64, rotation: 0, opacity: 1,
          props: { kind: "sticker", stickerType: "hashtag", data: { tag: "tumarca" } },
        },
        {
          id: "t_location", type: "sticker", x: 340, y: 960, width: 300, height: 64, rotation: 0, opacity: 1,
          props: { kind: "sticker", stickerType: "location", data: { location: "Tu ciudad" } },
        },
      ],
    },
  },

  // 5. Oferta especial (replaces Countdown)
  {
    id: "oferta",
    name: "Oferta",
    category: "marketing",
    previewGradient: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)" },
      elements: [
        {
          id: "t_title", type: "text", x: 90, y: 580, width: 900, height: 120, rotation: 0, opacity: 1,
          props: { kind: "text", text: "OFERTA\nESPECIAL", fontFamily: "Montserrat", fontSize: 72, fontWeight: 900, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.1, textDecoration: "", shadowColor: "rgba(0,0,0,0.25)", shadowBlur: 20, shadowOffsetX: 0, shadowOffsetY: 4 },
        },
        {
          id: "t_date", type: "text", x: 240, y: 760, width: 600, height: 50, rotation: 0, opacity: 0.9,
          props: { kind: "text", text: "Solo por tiempo limitado", fontFamily: "Montserrat", fontSize: 26, fontWeight: 400, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.3, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_price_badge", type: "shape", x: 340, y: 870, width: 400, height: 120, rotation: 0, opacity: 1,
          props: { kind: "shape", shapeType: "rect", fill: "#ffffff", stroke: "", strokeWidth: 0, cornerRadius: 20 },
        },
        {
          id: "t_price", type: "text", x: 340, y: 870, width: 400, height: 120, rotation: 0, opacity: 1,
          props: { kind: "text", text: "2x1", fontFamily: "Montserrat", fontSize: 64, fontWeight: 900, fontStyle: "normal", fill: "#EC4899", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
      ],
    },
  },

  // 6. Cita inspiradora
  {
    id: "cita",
    name: "Cita",
    category: "creativo",
    previewGradient: "linear-gradient(135deg, #2b2b2b 0%, #1a1a2e 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #2b2b2b 0%, #1a1a2e 100%)" },
      elements: [
        {
          id: "t_quote_mark", type: "text", x: 90, y: 620, width: 200, height: 150, rotation: 0, opacity: 0.15,
          props: { kind: "text", text: "\u201C", fontFamily: "Playfair Display", fontSize: 200, fontWeight: 700, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "left", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_quote", type: "text", x: 120, y: 760, width: 840, height: 200, rotation: 0, opacity: 1,
          props: { kind: "text", text: "El éxito es la suma\nde pequeños esfuerzos\nrepetidos día tras día.", fontFamily: "Playfair Display", fontSize: 42, fontWeight: 400, fontStyle: "italic", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.5, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_line", type: "shape", x: 440, y: 1020, width: 200, height: 3, rotation: 0, opacity: 0.4,
          props: { kind: "shape", shapeType: "line", fill: "transparent", stroke: "#ffffff", strokeWidth: 2, cornerRadius: 0 },
        },
        {
          id: "t_author", type: "text", x: 140, y: 1050, width: 800, height: 50, rotation: 0, opacity: 0.7,
          props: { kind: "text", text: "— Robert Collier", fontFamily: "Montserrat", fontSize: 22, fontWeight: 400, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.3, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
      ],
    },
  },

  // 7. Nuevo producto (with frame sticker)
  {
    id: "producto",
    name: "Producto",
    category: "marketing",
    previewGradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
      elements: [
        {
          id: "t_badge", type: "text", x: 340, y: 480, width: 400, height: 50, rotation: 0, opacity: 1,
          props: { kind: "text", text: "NUEVO", fontFamily: "Montserrat", fontSize: 20, fontWeight: 800, fontStyle: "normal", fill: "#065F46", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_frame", type: "sticker", x: 340, y: 540, width: 400, height: 480, rotation: 0, opacity: 1,
          props: { kind: "sticker", stickerType: "frame", data: { frameStyle: "polaroid", photoUrl: "", caption: "Producto destacado" } },
        },
        {
          id: "t_desc", type: "text", x: 90, y: 1080, width: 900, height: 120, rotation: 0, opacity: 1,
          props: { kind: "text", text: "Nombre del producto\n$299 MXN", fontFamily: "Montserrat", fontSize: 36, fontWeight: 700, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.3, textDecoration: "", shadowColor: "rgba(0,0,0,0.15)", shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 2 },
        },
      ],
    },
  },

  // 8. Detrás de cámaras (without add_yours sticker)
  {
    id: "bts",
    name: "BTS",
    category: "creativo",
    previewGradient: "linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)" },
      elements: [
        {
          id: "t_badge", type: "shape", x: 280, y: 640, width: 520, height: 50, rotation: 0, opacity: 1,
          props: { kind: "shape", shapeType: "rect", fill: "#ffffff22", stroke: "#ffffff55", strokeWidth: 1, cornerRadius: 25 },
        },
        {
          id: "t_label", type: "text", x: 280, y: 640, width: 520, height: 50, rotation: 0, opacity: 1,
          props: { kind: "text", text: "📸 DETRÁS DE CÁMARAS", fontFamily: "Montserrat", fontSize: 20, fontWeight: 700, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_title", type: "text", x: 90, y: 730, width: 900, height: 120, rotation: 0, opacity: 1,
          props: { kind: "text", text: "Un vistazo a nuestro\nproceso creativo", fontFamily: "Montserrat", fontSize: 44, fontWeight: 700, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.3, textDecoration: "", shadowColor: "rgba(0,0,0,0.3)", shadowBlur: 15, shadowOffsetX: 0, shadowOffsetY: 4 },
        },
        {
          id: "t_sub", type: "text", x: 140, y: 900, width: 800, height: 60, rotation: 0, opacity: 0.7,
          props: { kind: "text", text: "Swipe para ver más ↑", fontFamily: "Montserrat", fontSize: 24, fontWeight: 400, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.3, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
      ],
    },
  },

  // 9. Tutorial / Tips (without emoji_slider)
  {
    id: "tips",
    name: "Tips",
    category: "informativo",
    previewGradient: "linear-gradient(135deg, #f7ff00 0%, #db36a4 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "gradient", value: "linear-gradient(135deg, #f7ff00 0%, #db36a4 100%)" },
      elements: [
        {
          id: "t_title", type: "text", x: 90, y: 520, width: 900, height: 80, rotation: 0, opacity: 1,
          props: { kind: "text", text: "3 Tips que necesitas saber", fontFamily: "Montserrat", fontSize: 40, fontWeight: 800, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1.2, textDecoration: "", shadowColor: "rgba(0,0,0,0.3)", shadowBlur: 15, shadowOffsetX: 0, shadowOffsetY: 4 },
        },
        {
          id: "t_tip1", type: "text", x: 120, y: 680, width: 840, height: 70, rotation: 0, opacity: 1,
          props: { kind: "text", text: "1. Primer consejo importante", fontFamily: "Montserrat", fontSize: 30, fontWeight: 600, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "left", lineHeight: 1.3, textDecoration: "", shadowColor: "rgba(0,0,0,0.2)", shadowBlur: 8, shadowOffsetX: 0, shadowOffsetY: 2 },
        },
        {
          id: "t_tip2", type: "text", x: 120, y: 780, width: 840, height: 70, rotation: 0, opacity: 1,
          props: { kind: "text", text: "2. Segundo tip esencial", fontFamily: "Montserrat", fontSize: 30, fontWeight: 600, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "left", lineHeight: 1.3, textDecoration: "", shadowColor: "rgba(0,0,0,0.2)", shadowBlur: 8, shadowOffsetX: 0, shadowOffsetY: 2 },
        },
        {
          id: "t_tip3", type: "text", x: 120, y: 880, width: 840, height: 70, rotation: 0, opacity: 1,
          props: { kind: "text", text: "3. Tercer dato clave", fontFamily: "Montserrat", fontSize: 30, fontWeight: 600, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "left", lineHeight: 1.3, textDecoration: "", shadowColor: "rgba(0,0,0,0.2)", shadowBlur: 8, shadowOffsetX: 0, shadowOffsetY: 2 },
        },
        {
          id: "t_emoji_fire", type: "sticker", x: 465, y: 1000, width: 150, height: 150, rotation: 0, opacity: 1,
          props: { kind: "sticker", stickerType: "emoji", data: { emoji: "🔥" } },
        },
      ],
    },
  },

  // 10. Antes y después
  {
    id: "antes-despues",
    name: "Antes/Después",
    category: "creativo",
    previewGradient: "linear-gradient(90deg, #0c0c1d 0%, #0c0c1d 50%, #ffffff 50%, #ffffff 100%)",
    storyData: {
      version: 1, width: 1080, height: 1920,
      background: { type: "color", value: "#0c0c1d" },
      elements: [
        {
          id: "t_antes_bg", type: "shape", x: 0, y: 0, width: 540, height: 1920, rotation: 0, opacity: 1,
          props: { kind: "shape", shapeType: "rect", fill: "#1a1a2e", stroke: "", strokeWidth: 0, cornerRadius: 0 },
        },
        {
          id: "t_despues_bg", type: "shape", x: 540, y: 0, width: 540, height: 1920, rotation: 0, opacity: 1,
          props: { kind: "shape", shapeType: "rect", fill: "#f8f9fa", stroke: "", strokeWidth: 0, cornerRadius: 0 },
        },
        {
          id: "t_antes_label", type: "text", x: 30, y: 840, width: 480, height: 60, rotation: 0, opacity: 1,
          props: { kind: "text", text: "ANTES", fontFamily: "Montserrat", fontSize: 48, fontWeight: 900, fontStyle: "normal", fill: "#ffffff", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_despues_label", type: "text", x: 570, y: 840, width: 480, height: 60, rotation: 0, opacity: 1,
          props: { kind: "text", text: "DESPUÉS", fontFamily: "Montserrat", fontSize: 48, fontWeight: 900, fontStyle: "normal", fill: "#1a1a2e", stroke: "", strokeWidth: 0, align: "center", lineHeight: 1, textDecoration: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
        },
        {
          id: "t_divider", type: "shape", x: 536, y: 200, width: 8, height: 1520, rotation: 0, opacity: 0.3,
          props: { kind: "shape", shapeType: "rect", fill: "#6366F1", stroke: "", strokeWidth: 0, cornerRadius: 4 },
        },
      ],
    },
  },
];
