import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, getAgencyId } from "../trpc";
import { generateSocialCopy, generateBrandText } from "../lib/haiku";
import Anthropic from "@anthropic-ai/sdk";

// ─── Centralized Brand Context Builder ────────────────────────────────────
// Fetches ALL brand data (brandKit + completed brochure fields) for a client.
// Always filters by agencyId + clientId for strict isolation.

async function buildFullBrandContext(
  db: any,
  clientId: string,
  agencyId: string
): Promise<string> {
  const client = await db.clientProfile.findFirst({
    where: { id: clientId, agencyId },
    select: {
      companyName: true,
      brandKit: true,
      brandBrochureSessions: {
        where: { status: "COMPLETED" },
        select: {
          fields: {
            select: {
              fieldId: true,
              label: true,
              clientValue: true,
              suggestedValue: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!client) return "";

  const bk = (client.brandKit as any) || {};
  const parts: string[] = [];

  // Core brand identity from brandKit
  if (client.companyName) parts.push(`Empresa: ${client.companyName}`);
  if (bk.toneOfVoice) parts.push(`Tono de voz: ${bk.toneOfVoice}`);
  if (bk.targetAudience) parts.push(`Audiencia objetivo: ${bk.targetAudience}`);
  if (bk.brandValues) parts.push(`Valores de marca: ${bk.brandValues}`);
  if (bk.missionStatement) parts.push(`Misión: ${bk.missionStatement}`);
  if (bk.styleNotes) parts.push(`Notas de estilo: ${bk.styleNotes}`);
  if (bk.doAndDonts) parts.push(`Lineamientos (do/don't): ${bk.doAndDonts}`);

  // Additional fields from completed brochure
  const session = client.brandBrochureSessions?.[0];
  if (session?.fields?.length) {
    const extraFields = session.fields
      .filter((f: any) => f.clientValue || f.suggestedValue)
      .map((f: any) => `${f.label}: ${f.clientValue || f.suggestedValue}`)
      .join("\n");
    if (extraFields) {
      parts.push(`\nDatos adicionales del brochure del cliente:\n${extraFields}`);
    }
  }

  return parts.join("\n");
}

// ─── Centralized Credit Check ──────────────────────────────────────────────
// Checks and resets AI credits for the agency. Throws if exhausted.

async function checkAndDeductCredit(db: any, agencyId: string): Promise<{ used: number; limit: number }> {
  const agency = await db.agency.findUnique({
    where: { id: agencyId },
    select: { aiCreditsUsed: true, aiCreditsLimit: true, aiCreditResetAt: true },
  });

  if (!agency) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Agencia no encontrada" });
  }

  // Monthly reset
  const now = new Date();
  const resetAt = agency.aiCreditResetAt ? new Date(agency.aiCreditResetAt) : null;
  if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    await db.agency.update({
      where: { id: agencyId },
      data: { aiCreditsUsed: 0, aiCreditResetAt: now },
    });
    agency.aiCreditsUsed = 0;
  }

  if (agency.aiCreditsUsed >= agency.aiCreditsLimit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Has alcanzado el límite de ${agency.aiCreditsLimit} créditos de IA este mes`,
    });
  }

  // Deduct credit
  await db.agency.update({
    where: { id: agencyId },
    data: { aiCreditsUsed: { increment: 1 } },
  });

  return { used: agency.aiCreditsUsed + 1, limit: agency.aiCreditsLimit };
}

export const aiRouter = router({
  // ─── Generate Copy (from text prompt) ──────────────────────────────────
  generateCopy: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1, "Escribe una solicitud").max(1000),
        versions: z.number().int().min(1).max(3).default(1),
        maxChars: z.number().int().min(50).max(2000).default(500),
        includeHashtags: z.boolean().default(true),
        includeEmojis: z.boolean().default(true),
        tone: z.string().default(""),
        network: z.string().optional(),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const credits = await checkAndDeductCredit(ctx.db, agencyId);

      // Get full brand context (brandKit + brochure)
      let brandContext: string | undefined;
      if (input.clientId) {
        brandContext = await buildFullBrandContext(ctx.db, input.clientId, agencyId);
      }

      const results = await generateSocialCopy({
        prompt: input.prompt,
        versions: input.versions,
        maxChars: input.maxChars,
        includeHashtags: input.includeHashtags,
        includeEmojis: input.includeEmojis,
        tone: input.tone,
        network: input.network,
        brandContext,
      });

      return { results, creditsUsed: credits.used, creditsLimit: credits.limit };
    }),

  // ─── Generate Brand Suggestion ─────────────────────────────────────────
  generateBrandSuggestion: protectedProcedure
    .input(
      z.object({
        field: z.enum(["missionStatement", "targetAudience", "brandValues", "styleNotes", "doAndDonts", "tagline"]),
        brandDescription: z.string().max(500).default(""),
        companyName: z.string().max(100).default(""),
        tone: z.string().default(""),
        existingValues: z.record(z.string()).default({}),
        versions: z.number().int().min(1).max(3).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const credits = await checkAndDeductCredit(ctx.db, agencyId);

      const results = await generateBrandText({
        field: input.field,
        brandDescription: input.brandDescription,
        companyName: input.companyName,
        tone: input.tone,
        existingValues: input.existingValues,
        versions: input.versions,
      });

      return { results, creditsUsed: credits.used, creditsLimit: credits.limit };
    }),

  // ─── Suggest Best Times (Enhanced with history + connected networks) ────
  suggestBestTimes: protectedProcedure
    .input(z.object({ network: z.string(), clientId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Get full brand context for audience-aware suggestions
      let brandContext = "";
      if (input.clientId) {
        brandContext = await buildFullBrandContext(ctx.db, input.clientId, agencyId);
      }

      // Get historical published posts (expanded to 50)
      const recentPosts = await ctx.db.post.findMany({
        where: {
          agencyId,
          ...(input.clientId ? { clientId: input.clientId } : {}),
          network: input.network as any,
          status: "PUBLISHED",
          scheduledAt: { not: null },
        },
        select: { scheduledAt: true },
        orderBy: { scheduledAt: "desc" },
        take: 50,
      });

      const history = recentPosts
        .filter((p: any) => p.scheduledAt)
        .map((p: any) => {
          const d = new Date(p.scheduledAt!);
          return `${d.toLocaleDateString("es", { weekday: "short" })} ${d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
        })
        .join(", ");

      // Check which networks the client has connected
      let connectedNetworksInfo = "";
      if (input.clientId) {
        try {
          const connected = await ctx.db.clientSocialNetwork.findMany({
            where: { clientId: input.clientId, isActive: true, accessToken: { not: null } },
            select: { network: true, accountName: true },
          });
          if (connected.length > 0) {
            connectedNetworksInfo = `Redes conectadas: ${connected.map((n: any) => `${n.network} (${n.accountName})`).join(", ")}`;
          }
        } catch {
          // ClientSocialNetwork may not exist in all schemas
        }
      }

      const results = await generateSocialCopy({
        prompt: `Sugiere los 3 mejores horarios para publicar en ${input.network}.
${brandContext ? `\nContexto de marca:\n${brandContext}` : ""}
${connectedNetworksInfo ? `\n${connectedNetworksInfo}` : ""}
${history ? `\nHistorial de publicaciones: ${history}` : "\nNo hay historial de publicaciones aún. Basa tu sugerencia en mejores prácticas generales."}

Para cada horario incluye:
1. Día y hora específica
2. Razón breve
3. Nivel de engagement esperado (alto/medio)

Responde conciso en español. Formato:
🥇 [Día] [Hora] — [razón]
🥈 [Día] [Hora] — [razón]
🥉 [Día] [Hora] — [razón]`,
        versions: 1,
        maxChars: 800,
        includeHashtags: false,
        includeEmojis: false,
        tone: "",
        network: input.network,
      });

      return { suggestions: results[0] || "" };
    }),

  // ─── Format Recommendations (comprehensive specs) ──────────────────────
  suggestFormat: protectedProcedure
    .input(z.object({ network: z.string(), postType: z.string() }))
    .query(({ input }) => {
      const formats: Record<string, Record<string, { dimensions: string; maxDuration?: string; captionLimit?: number; maxItems?: number; tips: string[] }>> = {
        INSTAGRAM: {
          IMAGE: { dimensions: "1080×1350px (4:5)", captionLimit: 2200, tips: ["Vertical 4:5 ocupa más feed", "JPG/PNG alta calidad", "Máx 30MB"] },
          CAROUSEL: { dimensions: "1080×1350px (4:5)", maxItems: 20, captionLimit: 2200, tips: ["Hasta 20 slides", "Primera = hook", "Última = CTA", "Mezcla imagen+video"] },
          STORY: { dimensions: "1080×1920px (9:16)", maxDuration: "60s", tips: ["Vertical obligatorio", "Stickers interactivos", "Zona segura: 250px arriba/340px abajo"] },
          REEL: { dimensions: "1080×1920px (9:16)", maxDuration: "3 min", captionLimit: 2200, tips: ["3 primeros segundos clave", "Audio trending", "Subtítulos", "30fps"] },
          VIDEO: { dimensions: "1080×1920px (9:16)", maxDuration: "60 min", captionLimit: 2200, tips: ["Vertical o cuadrado", "Thumbnail atractivo"] },
        },
        TIKTOK: {
          VIDEO: { dimensions: "1080×1920px (9:16)", maxDuration: "10 min", captionLimit: 4000, tips: ["Hook en 2s", "15-60s óptimo", "Tendencias virales", "Hashtags en caption"] },
          CAROUSEL: { dimensions: "1080×1920px (9:16)", maxItems: 35, captionLimit: 4000, tips: ["4-35 imágenes", "Óptimo 5-10", "Vertical recomendado"] },
          IMAGE: { dimensions: "1080×1920px (9:16)", captionLimit: 4000, tips: ["Foto vertical", "También acepta 1:1"] },
        },
        FACEBOOK: {
          IMAGE: { dimensions: "1080×1350px (4:5)", tips: ["<20% texto en imagen", "Colores vibrantes"] },
          CAROUSEL: { dimensions: "1080×1080px (1:1)", maxItems: 10, tips: ["Máx 10 slides", "Cuadrado 1:1"] },
          VIDEO: { dimensions: "1280×720px (16:9)", maxDuration: "240 min", tips: ["Subtítulos auto", "3s sin sonido", "Thumbnail atractivo"] },
          STORY: { dimensions: "1080×1920px (9:16)", maxDuration: "60s", tips: ["Vertical 9:16", "Zona segura importante"] },
          REEL: { dimensions: "1080×1920px (9:16)", maxDuration: "3 min", tips: ["Igual que IG Reels", "Cross-post funciona"] },
        },
        LINKEDIN: {
          IMAGE: { dimensions: "1200×627px (1.91:1)", captionLimit: 3000, tips: ["Profesional", "Infografías alto engagement", "Máx 8MB"] },
          CAROUSEL: { dimensions: "1080×1080px (1:1) o PDF", maxItems: 20, captionLimit: 3000, tips: ["PDF = mayor engagement", "1 idea/slide", "5-10 slides óptimo"] },
          VIDEO: { dimensions: "1920×1080px (16:9)", maxDuration: "10 min", captionLimit: 3000, tips: ["<60s óptimo", "Solo MP4", "1:1 o 4:5 también"] },
          TEXT: { dimensions: "Solo texto", captionLimit: 3000, tips: ["3,000 chars máx", "Preguntas generan comentarios"] },
        },
        X: {
          IMAGE: { dimensions: "1200×675px (16:9)", maxItems: 4, captionLimit: 280, tips: ["Imagen+texto = más engagement", "GIFs funcionan", "Máx 4 imágenes"] },
          VIDEO: { dimensions: "1280×720px (16:9)", maxDuration: "2:20", captionLimit: 280, tips: ["Máx 140s", "512MB", "Solo MP4/MOV"] },
          TEXT: { dimensions: "Solo texto", captionLimit: 280, tips: ["280 chars", "Threads para largo", "Links = 23 chars"] },
        },
      };
      return formats[input.network]?.[input.postType] || { dimensions: "Consulta guías oficiales", tips: ["Revisa recomendaciones de la plataforma"] };
    }),

  // ─── Analyze Media with Vision (Claude Sonnet 4) ───────────────────────
  analyzeMedia: protectedProcedure
    .input(
      z.object({
        imageUrls: z.array(z.string().url()).min(1).max(4),
        network: z.string().optional(),
        clientId: z.string().optional(),
        tone: z.string().default(""),
        includeHashtags: z.boolean().default(true),
        includeEmojis: z.boolean().default(true),
        versions: z.number().int().min(1).max(3).default(2),
        language: z.string().default("es"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      const credits = await checkAndDeductCredit(ctx.db, agencyId);

      // Get FULL brand context (brandKit + brochure fields)
      let brandContext = "";
      if (input.clientId) {
        brandContext = await buildFullBrandContext(ctx.db, input.clientId, agencyId);
      }

      // Network hints
      const networkHints: Record<string, string> = {
        INSTAGRAM: "Instagram (visual, emojis, hashtags, engagement)",
        FACEBOOK: "Facebook (conversacional, compartible, comunidad)",
        LINKEDIN: "LinkedIn (profesional, liderazgo, networking)",
        TIKTOK: "TikTok (trendy, informal, viral, corto)",
        X: "X/Twitter (conciso, opinión, actualidad, max 280 chars)",
      };
      const networkName = input.network ? (networkHints[input.network] || input.network) : "redes sociales";

      // Build image content blocks for Claude Vision
      const imageContent: Anthropic.ImageBlockParam[] = input.imageUrls.map((url) => ({
        type: "image" as const,
        source: { type: "url" as const, url },
      }));

      const toneInstruction = input.tone ? `Usa un tono ${input.tone}.` : "";
      const emojiInstruction = input.includeEmojis ? "Incluye emojis relevantes." : "No uses emojis.";
      const hashtagInstruction = input.includeHashtags ? "Incluye 3-5 hashtags relevantes al final." : "No incluyas hashtags.";

      const systemPrompt = `Eres un experto en social media y copywriting para ${networkName}. Generas copy atractivo y listo para publicar basado en el contenido visual de imágenes.

${brandContext ? `CONTEXTO DE MARCA (IMPORTANTE — respeta el tono y valores de esta marca):\n${brandContext}\n` : ""}
REGLAS ESTRICTAS:
- Genera EXACTAMENTE ${input.versions} versiones diferentes de copy listo para publicar
- NO incluyas análisis ni descripción de la imagen
- NO incluyas encabezados como "ANÁLISIS" o "VERSIÓN 1"
- Cada versión debe ser copy directo, como si lo fueras a publicar tal cual
- Cada versión debe tener un enfoque y estilo diferente
- ${toneInstruction}
- ${emojiInstruction}
- ${hashtagInstruction}
- Máximo 300 caracteres por versión (sin contar hashtags)
- Responde en español
- Separa cada versión ÚNICAMENTE con la línea: ---VERSION---
- La primera línea de tu respuesta debe ser directamente el primer copy, SIN introducciones`;

      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              ...imageContent,
              {
                type: "text",
                text: `Genera ${input.versions} versiones de copy listo para publicar en ${networkName} basándote en ${input.imageUrls.length > 1 ? "estas imágenes" : "esta imagen"}. Solo copy directo, sin análisis.`,
              },
            ],
          },
        ],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      const results = text
        .split("---VERSION---")
        .map((v) => v.trim())
        .filter(Boolean)
        .filter((v) => {
          const lower = v.toLowerCase();
          return !(
            lower.startsWith("**análisis") ||
            lower.startsWith("análisis") ||
            lower.startsWith("**analysis") ||
            lower.startsWith("veo un") ||
            lower.startsWith("la imagen muestra") ||
            lower.startsWith("en la imagen") ||
            lower.startsWith("se observa") ||
            (lower.includes("análisis de la imagen") && v.length > 200)
          );
        });

      return {
        results: results.length > 0 ? results : [text],
        creditsUsed: credits.used,
        creditsLimit: credits.limit,
      };
    }),

  // ─── Get AI Credits ─────────────────────────────────────────────────────
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    const agency = await ctx.db.agency.findUnique({
      where: { id: agencyId },
      select: { aiCreditsUsed: true, aiCreditsLimit: true, aiCreditResetAt: true },
    });

    if (!agency) return { used: 0, limit: 1000 };

    const now = new Date();
    const resetAt = agency.aiCreditResetAt ? new Date(agency.aiCreditResetAt) : null;
    if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
      return { used: 0, limit: agency.aiCreditsLimit };
    }

    return { used: agency.aiCreditsUsed, limit: agency.aiCreditsLimit };
  }),

  // ─── AI Curation: Refine Copy ──────────────────────────────────────────
  refineCopy: protectedProcedure
    .input(
      z.object({
        copy: z.string().min(10),
        clientId: z.string().optional(),
        tone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      await checkAndDeductCredit(ctx.db, agencyId);

      // Full brand context from brochure
      let brandContext = "";
      if (input.clientId) {
        brandContext = await buildFullBrandContext(ctx.db, input.clientId, agencyId);
      }

      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `Eres experto en copywriting social media. Tu tarea es refinar copy genérico transformándolo en anécdotas o preguntas provocativas que mantengan autenticidad.
${brandContext ? `\nCONTEXTO DE MARCA (respeta tono y valores):\n${brandContext}` : ""}

REGLAS:
- NO cambies el significado principal
- Reemplaza frases genéricas (ej: "nuestros productos son excelentes") con anécdotas específicas o preguntas que inviten al engagement
- Mantén emojis si existían
- Mantén hashtags si existían
- Respuesta ÚNICA, no incluyas análisis
- Máximo 300 caracteres`,
        messages: [{ role: "user", content: `Refina este copy:\n"${input.copy}"` }],
      });

      const refinedCopy = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

      return { refined: refinedCopy };
    }),

  // ─── AI Curation: SEO Social Enrichment ────────────────────────────────
  enrichWithSEO: protectedProcedure
    .input(
      z.object({
        copy: z.string().min(10),
        hashtags: z.string().optional(),
        theme: z.string(),
        network: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      await checkAndDeductCredit(ctx.db, agencyId);

      const KEYWORDS_BY_THEME: Record<string, string[]> = {
        "producto ecológico": ["sostenible", "eco-friendly", "compostable", "biodegradable", "carbono neutro"],
        "tech startup": ["innovación", "disrupción", "automatización", "ia", "futuro"],
        bienestar: ["salud", "balance", "bienestar", "energía", "mindfulness"],
        moda: ["estilo", "tendencia", "diseño", "exclusivo", "colección"],
        comida: ["sabor", "fresco", "artesanal", "ingredientes", "receta"],
        viajes: ["aventura", "destino", "experiencia", "viajero", "exploración"],
        fitness: ["entrenamiento", "salud", "músculo", "energía", "transformación"],
        educación: ["aprendizaje", "conocimiento", "crecimiento", "desarrollo", "habilidades"],
        belleza: ["skincare", "natural", "glow", "rutina", "cuidado"],
        inmobiliaria: ["hogar", "inversión", "ubicación", "diseño", "plusvalía"],
      };

      const keywords = KEYWORDS_BY_THEME[input.theme.toLowerCase()] || [];

      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: `Eres SEO copywriter para ${input.network}. Tu tarea es enriquecer copy insertando keywords de forma orgánica.

PALABRAS CLAVE: ${keywords.length > 0 ? keywords.join(", ") : `relacionadas con "${input.theme}"`}

REGLAS:
- Inserta 2-3 palabras clave naturalmente en el copy
- Sugiere hashtags que contengan keywords
- NO fuerces palabras, mantén fluidez
- Responde SOLO en JSON válido:
{
  "enrichedCopy": "texto mejorado",
  "enrichedHashtags": "#keyword1 #keyword2",
  "seoAnalysis": {
    "keywordsFound": ["palabra1"],
    "placementScore": 0.85,
    "notes": "descripción breve"
  }
}`,
        messages: [
          { role: "user", content: `Copy actual:\n"${input.copy}"\n\nHashtags actuales: ${input.hashtags || "ninguno"}` },
        ],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

      let parsed: any = { enrichedCopy: input.copy, enrichedHashtags: input.hashtags || "", seoAnalysis: { keywordsFound: [], placementScore: 0.5 } };
      try {
        parsed = JSON.parse(text);
      } catch {
        // Fallback
      }

      return parsed;
    }),

  // ─── AI Curation: Authenticity Check (vs Brand Kit + Brochure) ─────────
  checkAuthenticity: protectedProcedure
    .input(
      z.object({
        copy: z.string().min(10),
        clientId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      await checkAndDeductCredit(ctx.db, agencyId);

      // Get FULL brand context including brochure data
      const brandContext = await buildFullBrandContext(ctx.db, input.clientId, agencyId);

      if (!brandContext) {
        return {
          matchScore: 0,
          detectedTone: "desconocido",
          analysis: "No se encontró información de marca para este cliente. Completa el Kit de Marca o el Brochure Guiado primero.",
          suggestions: ["Completar el Kit de Marca del cliente", "Llenar el Brochure Guiado para más contexto"],
        };
      }

      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: `Eres experto en brand voice consistency. Compara el tono de un copy contra toda la información de marca del cliente.

INFORMACIÓN COMPLETA DE LA MARCA:
${brandContext}

Analiza el copy y devuelve SOLO JSON válido:
{
  "matchScore": número entre 0-100,
  "detectedTone": "descripción del tono detectado",
  "analysis": "párrafo de 2-3 líneas explicando alineación",
  "suggestions": ["sugerencia 1", "sugerencia 2", "sugerencia 3"]
}`,
        messages: [{ role: "user", content: `Analiza este copy contra la marca:\n"${input.copy}"` }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

      let result: any = { matchScore: 75, detectedTone: "desconocido", analysis: "No se pudo analizar", suggestions: [] };
      try {
        result = JSON.parse(text);
      } catch {
        // Fallback
      }

      return result;
    }),

  // ─── Suggest Hashtags (kept for backward compat, uses same pattern) ────
  suggestHashtags: protectedProcedure
    .input(z.object({
      copy: z.string().max(2000).default(""),
      network: z.string().optional(),
      clientId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      let brandContext = "";
      if (input.clientId) {
        brandContext = await buildFullBrandContext(ctx.db, input.clientId, agencyId);
      }
      const results = await generateSocialCopy({
        prompt: `Genera 20 hashtags relevantes para ${input.network || "Instagram"}.\n${input.copy ? `Texto: "${input.copy}"` : "Genera hashtags populares y de nicho."}\n${brandContext ? `Marca:\n${brandContext}` : ""}\n\nOrganiza en 3 grupos: Populares, De nicho, De marca. Responde SOLO hashtags con #, uno por línea.`,
        versions: 1, maxChars: 1000, includeHashtags: true, includeEmojis: false, tone: "", network: input.network,
      });
      return { hashtags: results[0] || "" };
    }),
});
