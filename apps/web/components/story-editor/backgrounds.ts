export interface GradientPreset {
  name: string;
  value: string;
  colors: [string, string];
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: "Púrpura", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", colors: ["#667eea", "#764ba2"] },
  { name: "Atardecer", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", colors: ["#f093fb", "#f5576c"] },
  { name: "Océano", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", colors: ["#4facfe", "#00f2fe"] },
  { name: "Bosque", value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", colors: ["#43e97b", "#38f9d7"] },
  { name: "Fuego", value: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)", colors: ["#f83600", "#f9d423"] },
  { name: "Medianoche", value: "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 100%)", colors: ["#0c0c1d", "#1a1a3e"] },
  { name: "Rosa", value: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", colors: ["#ff9a9e", "#fecfef"] },
  { name: "Coral", value: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)", colors: ["#ff6b6b", "#ee5a24"] },
  { name: "Aurora", value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", colors: ["#a8edea", "#fed6e3"] },
  { name: "Noche", value: "linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)", colors: ["#2c3e50", "#4ca1af"] },
  { name: "Lavanda", value: "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)", colors: ["#c471f5", "#fa71cd"] },
  { name: "Limón", value: "linear-gradient(135deg, #f7ff00 0%, #db36a4 100%)", colors: ["#f7ff00", "#db36a4"] },
  { name: "Elegante", value: "linear-gradient(135deg, #2b2b2b 0%, #1a1a2e 100%)", colors: ["#2b2b2b", "#1a1a2e"] },
  { name: "Instagram", value: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)", colors: ["#833ab4", "#fcb045"] },
  { name: "Cielo", value: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)", colors: ["#89f7fe", "#66a6ff"] },
];

export const COLOR_PRESETS = [
  "#ffffff", "#000000", "#f44336", "#e91e63", "#9c27b0",
  "#673ab7", "#3f51b5", "#2196f3", "#00bcd4", "#009688",
  "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ff9800",
  "#ff5722", "#795548", "#607d8b", "#1a1a2e", "#16213e",
];
