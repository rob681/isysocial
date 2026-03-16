import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

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

export async function generateSocialCopy(params: GenerateCopyParams): Promise<string[]> {
  const openai = getOpenAIClient();

  const toneMap: Record<string, string> = {
    formal: "formal y profesional",
    informal: "informal y cercano",
    playful: "divertido y creativo",
    professional: "profesional y corporativo",
    friendly: "amigable y accesible",
    authoritative: "autoritario y experto",
    conversational: "conversacional y natural",
  };

  const toneDesc = toneMap[params.tone] || params.tone || "natural y atractivo";

  const networkHints: Record<string, string> = {
    FACEBOOK: "Facebook (permite textos más largos, ideal para storytelling)",
    INSTAGRAM: "Instagram (texto visual, hashtags importantes, emojis bienvenidos)",
    LINKEDIN: "LinkedIn (profesional, networking, thought leadership)",
    TIKTOK: "TikTok (informal, trending, generación joven)",
    X: "X/Twitter (conciso, impactante, máximo 280 caracteres)",
  };

  const networkHint = params.network ? networkHints[params.network] || params.network : "redes sociales en general";

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
- Separa cada versión con el delimitador: ---VERSION---`;

  if (params.brandContext) {
    systemPrompt += `\n\nContexto de la marca:\n${params.brandContext}`;
  }

  let response;
  try {
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.prompt },
      ],
      temperature: 0.8,
      max_tokens: params.versions * 300,
    });
  } catch (error: any) {
    if (error?.status === 429) {
      throw new Error("Se agotó el crédito de IA. Por favor contacta al administrador para recargar la cuenta en platform.openai.com.");
    }
    if (error?.status === 401) {
      throw new Error("La clave de OpenAI no es válida. Por favor verifica la configuración.");
    }
    throw error;
  }

  const content = response.choices[0]?.message?.content || "";

  // Parse versions
  const versions = content
    .split("---VERSION---")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  // If splitting didn't work, return the whole response as one version
  if (versions.length === 0) return [content.trim()];

  return versions.slice(0, params.versions);
}

// ─── Brand Text Generation ──────────────────────────────────────────────────

interface GenerateBrandTextParams {
  field: string;
  brandDescription: string;
  companyName: string;
  tone: string;
  existingValues: Record<string, string>;
  versions: number;
}

const BRAND_FIELD_PROMPTS: Record<string, { instruction: string; maxChars: number }> = {
  missionStatement: {
    instruction: "Genera una declaración de misión empresarial concisa y poderosa (1-2 oraciones). Debe comunicar el propósito y la razón de ser de la empresa.",
    maxChars: 300,
  },
  targetAudience: {
    instruction: "Describe el público objetivo ideal para esta marca. Incluye demografía (edad, género, ubicación), intereses, comportamiento de compra y motivaciones. Formato: párrafo descriptivo.",
    maxChars: 400,
  },
  brandValues: {
    instruction: "Genera una lista de 4-6 valores de marca relevantes. Cada valor debe ir acompañado de una breve descripción (1 línea). Formato: 'Valor — Descripción'.",
    maxChars: 500,
  },
  styleNotes: {
    instruction: "Genera guías de estilo de comunicación para redes sociales. Incluye: tipo de emojis a usar, hashtags recomendados, frecuencia de publicación, tipo de CTAs, y tips de engagement. Formato: lista de bullets.",
    maxChars: 500,
  },
  doAndDonts: {
    instruction: "Genera una lista de 'Sí' (cosas que la marca debe hacer) y 'No' (cosas que debe evitar) en su comunicación. Al menos 4 de cada uno. Formato:\nSí:\n- ...\n\nNo:\n- ...",
    maxChars: 600,
  },
  tagline: {
    instruction: "Genera un tagline/slogan corto, memorable y poderoso para la marca (máximo 10 palabras). Debe ser pegajoso y fácil de recordar.",
    maxChars: 100,
  },
};

export async function generateBrandText(params: GenerateBrandTextParams): Promise<string[]> {
  const openai = getOpenAIClient();

  const fieldConfig = BRAND_FIELD_PROMPTS[params.field];
  if (!fieldConfig) throw new Error(`Unknown brand field: ${params.field}`);

  const toneMap: Record<string, string> = {
    formal: "formal y profesional",
    informal: "informal y cercano",
    playful: "divertido y creativo",
    professional: "profesional y corporativo",
    friendly: "amigable y accesible",
    authoritative: "autoritario y experto",
    conversational: "conversacional y natural",
  };
  const toneDesc = toneMap[params.tone] || params.tone || "profesional y cercano";

  // Build context from existing brand info
  const contextParts: string[] = [];
  if (params.companyName) contextParts.push(`Empresa: ${params.companyName}`);
  if (params.brandDescription) contextParts.push(`Descripción: ${params.brandDescription}`);
  if (params.existingValues.missionStatement) contextParts.push(`Misión: ${params.existingValues.missionStatement}`);
  if (params.existingValues.targetAudience) contextParts.push(`Audiencia: ${params.existingValues.targetAudience}`);
  if (params.existingValues.brandValues) contextParts.push(`Valores: ${params.existingValues.brandValues}`);
  if (params.existingValues.toneOfVoice) contextParts.push(`Tono: ${params.existingValues.toneOfVoice}`);

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

  let response;
  try {
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: params.versions * 400,
    });
  } catch (error: any) {
    if (error?.status === 429) {
      throw new Error("Se agotó el crédito de IA. Por favor contacta al administrador.");
    }
    if (error?.status === 401) {
      throw new Error("La clave de OpenAI no es válida.");
    }
    throw error;
  }

  const content = response.choices[0]?.message?.content || "";
  const versions = content
    .split("---VERSION---")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  if (versions.length === 0) return [content.trim()];
  return versions.slice(0, params.versions);
}
