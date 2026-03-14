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

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: params.prompt },
    ],
    temperature: 0.8,
    max_tokens: params.versions * 300,
  });

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
