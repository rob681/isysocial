export interface FontDef {
  family: string;
  category: "display" | "handwriting" | "sans" | "serif";
  weights: number[];
}

export const STORY_FONTS: FontDef[] = [
  { family: "Montserrat", category: "sans", weights: [400, 600, 700, 900] },
  { family: "Playfair Display", category: "serif", weights: [400, 700, 900] },
  { family: "Pacifico", category: "handwriting", weights: [400] },
  { family: "Oswald", category: "display", weights: [400, 500, 700] },
  { family: "Lobster", category: "handwriting", weights: [400] },
  { family: "Raleway", category: "sans", weights: [400, 600, 700] },
  { family: "Dancing Script", category: "handwriting", weights: [400, 700] },
  { family: "Bebas Neue", category: "display", weights: [400] },
  { family: "Poppins", category: "sans", weights: [400, 600, 700, 800] },
  { family: "Lato", category: "sans", weights: [400, 700, 900] },
  { family: "Roboto Condensed", category: "sans", weights: [400, 700] },
  { family: "Permanent Marker", category: "handwriting", weights: [400] },
  { family: "Abril Fatface", category: "display", weights: [400] },
  { family: "Shadows Into Light", category: "handwriting", weights: [400] },
  { family: "Anton", category: "display", weights: [400] },
  { family: "Righteous", category: "display", weights: [400] },
  { family: "Comfortaa", category: "sans", weights: [400, 700] },
  { family: "Josefin Sans", category: "sans", weights: [400, 600, 700] },
  { family: "Sacramento", category: "handwriting", weights: [400] },
  { family: "Bangers", category: "display", weights: [400] },
];

const loadedFonts = new Set<string>();

export function loadFont(family: string) {
  if (loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function loadAllFonts() {
  STORY_FONTS.forEach((f) => loadFont(f.family));
}
