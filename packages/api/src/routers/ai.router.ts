import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, getAgencyId } from "../trpc";
import { generateSocialCopy } from "../lib/openai";

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
