import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, getAgencyId } from "../trpc";
import { generateSocialCopy, generateBrandText } from "../lib/openai";

export const aiRouter = router({
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

      // Check credits
      const agency = await ctx.db.agency.findUnique({
        where: { id: agencyId },
        select: {
          aiCreditsUsed: true,
          aiCreditsLimit: true,
          aiCreditResetAt: true,
        },
      });

      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agencia no encontrada" });
      }

      // Reset credits if a new month
      const now = new Date();
      const resetAt = agency.aiCreditResetAt ? new Date(agency.aiCreditResetAt) : null;
      if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
        await ctx.db.agency.update({
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

      // Get brand context if clientId provided
      let brandContext: string | undefined;
      if (input.clientId) {
        const client = await ctx.db.clientProfile.findFirst({
          where: { id: input.clientId, agencyId },
          select: { companyName: true, brandKit: true },
        });
        if (client) {
          const bk = (client.brandKit as any) || {};
          const parts: string[] = [`Empresa: ${client.companyName}`];
          if (bk.toneOfVoice) parts.push(`Tono de la marca: ${bk.toneOfVoice}`);
          if (bk.targetAudience) parts.push(`Audiencia: ${bk.targetAudience}`);
          if (bk.brandValues) parts.push(`Valores: ${bk.brandValues}`);
          if (bk.missionStatement) parts.push(`Misión: ${bk.missionStatement}`);
          if (bk.styleNotes) parts.push(`Notas de estilo: ${bk.styleNotes}`);
          brandContext = parts.join("\n");
        }
      }

      // Generate
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

      // Increment credit usage
      await ctx.db.agency.update({
        where: { id: agencyId },
        data: { aiCreditsUsed: { increment: 1 } },
      });

      return {
        results,
        creditsUsed: agency.aiCreditsUsed + 1,
        creditsLimit: agency.aiCreditsLimit,
      };
    }),

  // ─── Generate Brand Suggestion ─────────────────────────────────────────
  generateBrandSuggestion: protectedProcedure
    .input(
      z.object({
        field: z.enum([
          "missionStatement",
          "targetAudience",
          "brandValues",
          "styleNotes",
          "doAndDonts",
          "tagline",
        ]),
        brandDescription: z.string().max(500).default(""),
        companyName: z.string().max(100).default(""),
        tone: z.string().default(""),
        existingValues: z.record(z.string()).default({}),
        versions: z.number().int().min(1).max(3).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);

      // Check credits (same logic as generateCopy)
      const agency = await ctx.db.agency.findUnique({
        where: { id: agencyId },
        select: { aiCreditsUsed: true, aiCreditsLimit: true, aiCreditResetAt: true },
      });
      if (!agency) throw new TRPCError({ code: "NOT_FOUND", message: "Agencia no encontrada" });

      const now = new Date();
      const resetAt = agency.aiCreditResetAt ? new Date(agency.aiCreditResetAt) : null;
      if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
        await ctx.db.agency.update({
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

      const results = await generateBrandText({
        field: input.field,
        brandDescription: input.brandDescription,
        companyName: input.companyName,
        tone: input.tone,
        existingValues: input.existingValues,
        versions: input.versions,
      });

      await ctx.db.agency.update({
        where: { id: agencyId },
        data: { aiCreditsUsed: { increment: 1 } },
      });

      return {
        results,
        creditsUsed: agency.aiCreditsUsed + 1,
        creditsLimit: agency.aiCreditsLimit,
      };
    }),

  // ─── Suggest Hashtags ────────────────────────────────────────────────
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
        const client = await ctx.db.clientProfile.findFirst({
          where: { id: input.clientId, agencyId },
          select: { companyName: true, brandKit: true },
        });
        if (client) {
          const bk = (client.brandKit as any) || {};
          brandContext = [`Empresa: ${client.companyName}`, bk.targetAudience ? `Audiencia: ${bk.targetAudience}` : "", bk.brandValues ? `Valores: ${bk.brandValues}` : ""].filter(Boolean).join("\n");
        }
      }
      const results = await generateSocialCopy({
        prompt: `Genera 20 hashtags relevantes para ${input.network || "Instagram"}.\n${input.copy ? `Texto: "${input.copy}"` : "Genera hashtags populares y de nicho."}\n${brandContext ? `Marca:\n${brandContext}` : ""}\n\nOrganiza en 3 grupos: Populares, De nicho, De marca. Responde SOLO hashtags con #, uno por línea.`,
        versions: 1, maxChars: 1000, includeHashtags: true, includeEmojis: false, tone: "", network: input.network,
      });
      return { hashtags: results[0] || "" };
    }),

  // ─── Suggest Best Times ────────────────────────────────────────────────
  suggestBestTimes: protectedProcedure
    .input(z.object({ network: z.string(), clientId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = getAgencyId(ctx);
      let brandContext = "";
      if (input.clientId) {
        const client = await ctx.db.clientProfile.findFirst({
          where: { id: input.clientId, agencyId },
          select: { companyName: true, brandKit: true },
        });
        if (client) {
          const bk = (client.brandKit as any) || {};
          brandContext = [`Empresa: ${client.companyName}`, bk.targetAudience ? `Audiencia: ${bk.targetAudience}` : ""].filter(Boolean).join("\n");
        }
      }
      const recentPosts = await ctx.db.post.findMany({
        where: { agencyId, ...(input.clientId ? { clientId: input.clientId } : {}), network: input.network as any, status: "PUBLISHED", scheduledAt: { not: null } },
        select: { scheduledAt: true }, orderBy: { scheduledAt: "desc" }, take: 20,
      });
      const history = recentPosts.filter(p => p.scheduledAt).map(p => { const d = new Date(p.scheduledAt!); return `${d.toLocaleDateString("es",{weekday:"short"})} ${d.toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}`; }).join(", ");

      const results = await generateSocialCopy({
        prompt: `Sugiere los 3 mejores horarios para publicar en ${input.network}.\n${brandContext ? `Marca:\n${brandContext}` : ""}\n${history ? `Historial: ${history}` : ""}\n\nPara cada horario incluye: día, hora, razón, nivel de engagement. Responde conciso en español.`,
        versions: 1, maxChars: 800, includeHashtags: false, includeEmojis: false, tone: "", network: input.network,
      });
      return { suggestions: results[0] || "" };
    }),

  // ─── Format Recommendations (static) ──────────────────────────────────
  suggestFormat: protectedProcedure
    .input(z.object({ network: z.string(), postType: z.string() }))
    .query(({ input }) => {
      const formats: Record<string, Record<string, { dimensions: string; maxDuration?: string; tips: string[] }>> = {
        INSTAGRAM: {
          IMAGE: { dimensions: "1080 x 1080px (1:1)", tips: ["Imágenes de alta calidad", "Texto mínimo en imagen", "Colores de marca"] },
          CAROUSEL: { dimensions: "1080 x 1080px (1:1)", tips: ["Máximo 10 slides", "Primera imagen = hook", "Última = CTA"] },
          STORY: { dimensions: "1080 x 1920px (9:16)", tips: ["Vertical", "15s máx/story", "Stickers interactivos"] },
          REEL: { dimensions: "1080 x 1920px (9:16)", maxDuration: "90s", tips: ["3 primeros segundos clave", "Audio trending", "Subtítulos"] },
        },
        FACEBOOK: {
          IMAGE: { dimensions: "1200 x 630px", tips: ["<20% texto", "Horizontal", "Colores vibrantes"] },
          VIDEO: { dimensions: "1280 x 720px", maxDuration: "240 min", tips: ["3s sin sonido", "Subtítulos auto", "Thumbnail atractivo"] },
        },
        LINKEDIN: {
          IMAGE: { dimensions: "1200 x 627px", tips: ["Profesional", "Infografías", "Datos/estadísticas"] },
          CAROUSEL: { dimensions: "1080 x 1080px o PDF", tips: ["PDF = alto engagement", "10 slides máx.", "1 idea/slide"] },
        },
        TIKTOK: { VIDEO: { dimensions: "1080 x 1920px (9:16)", maxDuration: "10 min", tips: ["2s hook", "Tendencias", "Hashtags"] } },
        X: {
          IMAGE: { dimensions: "1600 x 900px", tips: ["Imagen+texto = más engagement", "GIFs funcionan", "Máx 4 imágenes"] },
          TEXT: { dimensions: "N/A", tips: ["280 chars máx.", "Threads para largo", "Preguntas = engagement"] },
        },
      };
      return formats[input.network]?.[input.postType] || { dimensions: "Consulta guías oficiales", tips: ["Revisa recomendaciones de la plataforma"] };
    }),

  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const agencyId = getAgencyId(ctx);
    const agency = await ctx.db.agency.findUnique({
      where: { id: agencyId },
      select: { aiCreditsUsed: true, aiCreditsLimit: true, aiCreditResetAt: true },
    });

    if (!agency) return { used: 0, limit: 1000 };

    // Check monthly reset
    const now = new Date();
    const resetAt = agency.aiCreditResetAt ? new Date(agency.aiCreditResetAt) : null;
    if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
      return { used: 0, limit: agency.aiCreditsLimit };
    }

    return { used: agency.aiCreditsUsed, limit: agency.aiCreditsLimit };
  }),
});
