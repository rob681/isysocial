import Anthropic from "@anthropic-ai/sdk";

// Claude Haiku 4.5 — modelo rápido y económico para copywriting y generación de texto
// ~8x más barato que GPT-4o-mini en output, mejor calidad de escritura en español
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateCopyParams {
  prompt: string;
  versions: number;
  maxChars: number;
  includeHashtags: boolean;
  includeEmojis: boolean;
  tone: string;
  network?: string;
  brandContext?: string;
}

interface GenerateBrandTextParams {
  field: string;
  brandDescription: string;
  companyName: string;
  tone: string;
  existingValues: Record<string, string>;
  versions: number;
}

// ─── Social Copy Generation ───────────────────────────────────────────────────

const toneMap: Record<string, string> = {
  formal: "formal y profesional",
  informal: "informal y cercano",
  playful: "divertido y creativo",
  professional: "profesional y corporativo",
  friendly: "amigable y accesible",
  authoritative: "autoritario y experto",
  conversational: "conversacional y natural",
};

const networkHints: Record<string, string> = {
  FACEBOOK: "Facebook (permite textos más largos, ideal para storytelling)",
  INSTAGRAM: "Instagram (texto visual, hashtags importantes, emojis bienvenidos)",
  LINKEDIN: "LinkedIn (profesional, networking, thought leadership)",
  TIKTOK: "TikTok (informal, trending, generación joven)",
  X: "X/Twitter (conciso, impactante, máximo 280 caracteres)",
};

/**
 * Genera copy para redes sociales usando Claude Haiku 4.5.
 * Reemplaza la implementación anterior basada en GPT-4o-mini.
 */
export async function generateSocialCopy(params: GenerateCopyParams): Promise<string[]> {
  const toneDesc = toneMap[params.tone] || params.tone || "natural y atractivo";
  const networkHint = params.network
    ? networkHints[params.network] || params.network
    : "redes sociales en general";

  let systemPrompt = `Eres un experto copywriter de redes sociales para el mercado hispano. Generas textos atractivos, creativos y optimizados para engagement.

Reglas:
- Escribe en español
- Tono: ${toneDesc}
- Red social: ${networkHint}
- Máximo ${params.maxChars} caracteres por versión
- ${params.includeEmojis ? "Incluye emojis relevantes" : "NO uses emojis"}
- ${params.includeHashtags ? "Incluye 3-5 hashtags relevantes al final" : "NO incluyas hashtags"}
- Genera exactamente ${params.versions} versión(es) diferente(s)
- Cada versión debe ser única en enfoque y estilo
- Separa cada versión con el delimitador: ---VERSION---
- NO incluyas etiquetas, encabezados ni títulos como "Versión 1:", "Versión 2: Tono cercano", "Opción 1:", "Variante X:" ni ningún meta-comentario antes del copy
- Cada versión debe empezar DIRECTAMENTE con el texto del copy, sin introducción, sin numeración y sin describir el tono
- NO uses markdown como **negritas** para titular las versiones`;

  if (params.brandContext) {
    systemPrompt += `\n\nContexto de la marca:\n${params.brandContext}`;
  }

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: params.versions * 300,
    system: systemPrompt,
    messages: [{ role: "user", content: params.prompt }],
  });

  const content = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const versions = content
    .split("---VERSION---")
    .map((v) => stripVersionHeader(v.trim()))
    .filter((v) => v.length > 0);

  if (versions.length === 0) return [stripVersionHeader(content.trim())];
  return versions.slice(0, params.versions);
}

/**
 * Defensive strip: removes leading "Versión N:", "Opción N:", "Variante N:",
 * etc. headers that the model may still emit despite the system prompt rules.
 * Also removes markdown wrappers around those headers.
 */
function stripVersionHeader(text: string): string {
  if (!text) return text;
  // Remove up to 2 leading header lines (e.g. "**Versión 2**\nTono casual\n...")
  let out = text;
  for (let i = 0; i < 2; i++) {
    const stripped = out.replace(
      /^\s*(?:[*_#>\-]+\s*)*(?:versi[oó]n|opci[oó]n|variante|version|option)\s*\d*\s*[:.\-–—]?[^\n]*\n+/i,
      "",
    );
    if (stripped === out) break;
    out = stripped;
  }
  // Also strip a standalone "Tono X" style subtitle if it remained on its own line at the start
  out = out.replace(/^\s*(?:[*_#>\-]+\s*)*tono[^\n]*\n+/i, "");
  return out.trim();
}

// ─── Brand Text Generation ────────────────────────────────────────────────────

const BRAND_FIELD_PROMPTS: Record<string, { instruction: string; maxChars: number }> = {
  missionStatement: {
    instruction:
      "Genera una declaración de misión empresarial concisa y poderosa (1-2 oraciones). Debe comunicar el propósito y la razón de ser de la empresa.",
    maxChars: 300,
  },
  targetAudience: {
    instruction:
      "Describe el público objetivo ideal para esta marca. Incluye demografía (edad, género, ubicación), intereses, comportamiento de compra y motivaciones. Formato: párrafo descriptivo.",
    maxChars: 400,
  },
  brandValues: {
    instruction:
      "Genera una lista de 4-6 valores de marca relevantes. Cada valor debe ir acompañado de una breve descripción (1 línea). Formato: 'Valor — Descripción'.",
    maxChars: 500,
  },
  styleNotes: {
    instruction:
      "Genera guías de estilo de comunicación para redes sociales. Incluye: tipo de emojis a usar, hashtags recomendados, frecuencia de publicación, tipo de CTAs, y tips de engagement. Formato: lista de bullets.",
    maxChars: 500,
  },
  doAndDonts: {
    instruction:
      "Genera una lista de 'Sí' (cosas que la marca debe hacer) y 'No' (cosas que debe evitar) en su comunicación. Al menos 4 de cada uno. Formato:\nSí:\n- ...\n\nNo:\n- ...",
    maxChars: 600,
  },
  tagline: {
    instruction:
      "Genera un tagline/slogan corto, memorable y poderoso para la marca (máximo 10 palabras). Debe ser pegajoso y fácil de recordar.",
    maxChars: 100,
  },
};

/**
 * Genera sugerencias de texto para campos del brand kit usando Claude Haiku 4.5.
 * Reemplaza la implementación anterior basada en GPT-4o-mini.
 */
export async function generateBrandText(params: GenerateBrandTextParams): Promise<string[]> {
  const fieldConfig = BRAND_FIELD_PROMPTS[params.field];
  if (!fieldConfig) throw new Error(`Unknown brand field: ${params.field}`);

  const toneDesc = toneMap[params.tone] || params.tone || "profesional y cercano";

  const contextParts: string[] = [];
  if (params.companyName) contextParts.push(`Empresa: ${params.companyName}`);
  if (params.brandDescription) contextParts.push(`Descripción: ${params.brandDescription}`);
  if (params.existingValues.missionStatement)
    contextParts.push(`Misión: ${params.existingValues.missionStatement}`);
  if (params.existingValues.targetAudience)
    contextParts.push(`Audiencia: ${params.existingValues.targetAudience}`);
  if (params.existingValues.brandValues)
    contextParts.push(`Valores: ${params.existingValues.brandValues}`);
  if (params.existingValues.toneOfVoice)
    contextParts.push(`Tono: ${params.existingValues.toneOfVoice}`);

  const systemPrompt = `Eres un experto en branding y estrategia de marca para el mercado hispano. Ayudas a empresas a definir su identidad de marca.

Reglas:
- Escribe en español
- Tono general: ${toneDesc}
- Máximo ${fieldConfig.maxChars} caracteres por versión
- Genera exactamente ${params.versions} versión(es) diferente(s)
- Cada versión debe ser única en enfoque
- Separa cada versión con: ---VERSION---
- NO incluyas etiquetas como "Versión 1:" ni numeración

${fieldConfig.instruction}

${contextParts.length > 0 ? `Contexto de la marca:\n${contextParts.join("\n")}` : ""}`;

  const userPrompt = params.brandDescription
    ? `Genera contenido para esta marca: ${params.brandDescription}`
    : `Genera contenido para la marca "${params.companyName || "mi empresa"}"`;

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: params.versions * 400,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const versions = content
    .split("---VERSION---")
    .map((v) => stripVersionHeader(v.trim()))
    .filter((v) => v.length > 0);

  if (versions.length === 0) return [stripVersionHeader(content.trim())];
  return versions.slice(0, params.versions);
}
