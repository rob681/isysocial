import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, getAgencyId } from "../trpc";
import { analyzeBrandResponses, generateDynamicBrandFields } from "../lib/claude";

export const brandBrochureRouter = router({
  // Start a new guided brochure session
  initiate: protectedProcedure.mutation(async ({ ctx }) => {
    const session = ctx.session.user;
    if (session.role !== "CLIENTE" || !session.clientProfileId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo clientes pueden iniciar brochure" });
    }

    const clientId = session.clientProfileId;

    // Check if session already exists
    const existing = await ctx.db.brandBrochureSession.findUnique({
      where: { clientId },
    });

    if (existing && existing.status === "IN_PROGRESS") {
      return { sessionId: existing.id, status: "IN_PROGRESS" };
    }

    // Create new session
    const newSession = await ctx.db.brandBrochureSession.create({
      data: { clientId, status: "INITIAL" },
    });

    // Create initial questions
    const initialQuestions = [
      {
        stepNumber: 1,
        questionId: "company_description",
        question: "¿Cuál es tu descripción de la empresa?",
        hint: "Cuéntanos qué hace tu empresa, qué servicios ofrece, etc.",
        inputType: "textarea",
        required: true,
      },
      {
        stepNumber: 2,
        questionId: "industry",
        question: "¿En qué industria o sector operas?",
        hint: "Por ejemplo: tecnología, retail, servicios profesionales, etc.",
        inputType: "text",
        required: true,
      },
      {
        stepNumber: 3,
        questionId: "founding_year",
        question: "¿Cuándo fue fundada tu empresa?",
        hint: "Año de fundación",
        inputType: "text",
        required: false,
      },
    ];

    await Promise.all(
      initialQuestions.map((q) =>
        ctx.db.brandBrochureQuestion.create({
          data: { sessionId: newSession.id, ...q },
        })
      )
    );

    return {
      sessionId: newSession.id,
      questions: initialQuestions,
      currentStep: 1,
    };
  }),

  // Submit answer and get next questions
  submitAnswer: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        questionId: z.string(),
        answer: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session.user;
      if (session.role !== "CLIENTE" || !session.clientProfileId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!brochureSession || brochureSession.clientId !== session.clientProfileId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sesión no encontrada" });
      }

      // Save answer
      await ctx.db.brandBrochureQuestion.update({
        where: { sessionId_questionId: { sessionId: input.sessionId, questionId: input.questionId } },
        data: { response: input.answer },
      });

      // Update session responses
      const updatedResponses = {
        ...(typeof brochureSession.responses === "object" ? brochureSession.responses : {}),
        [input.questionId]: input.answer,
      };

      await ctx.db.brandBrochureSession.update({
        where: { id: input.sessionId },
        data: { responses: updatedResponses, status: "IN_PROGRESS" },
      });

      // If we have enough responses (3+), analyze and generate next questions
      const responseCount = Object.keys(updatedResponses).length;

      if (responseCount >= 3 && responseCount % 3 === 0) {
        try {
          const analysis = await analyzeBrandResponses(updatedResponses as Record<string, string>);

          // Create next questions from AI analysis
          if (analysis.nextQuestions && Array.isArray(analysis.nextQuestions)) {
            const nextQuestions = analysis.nextQuestions.slice(0, 3); // Limit to 3 questions at a time

            await Promise.all(
              nextQuestions.map((q: any, idx: number) =>
                ctx.db.brandBrochureQuestion.upsert({
                  where: { sessionId_questionId: { sessionId: input.sessionId, questionId: q.questionId } },
                  update: { question: q.question, hint: q.hint },
                  create: {
                    sessionId: input.sessionId,
                    stepNumber: responseCount + idx + 1,
                    questionId: q.questionId,
                    question: q.question,
                    hint: q.hint,
                    inputType: q.inputType || "textarea",
                    aiGenerated: true,
                  },
                })
              )
            );

            return {
              nextQuestions: nextQuestions.map((q: any) => ({
                questionId: q.questionId,
                question: q.question,
                hint: q.hint,
                inputType: q.inputType,
              })),
              analysis: analysis.analysis,
              hasMore: true,
            };
          }
        } catch (err) {
          console.error("Error analyzing brand responses:", err);
          // Continue without AI analysis
        }
      }

      return { nextQuestions: [], hasMore: false };
    }),

  // Get AI-generated field suggestions
  getFieldSuggestions: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = ctx.session.user;
      if (session.role !== "CLIENTE" || !session.clientProfileId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
        include: { questions: true },
      });

      if (!brochureSession || brochureSession.clientId !== session.clientProfileId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Collect all responses
      const responses = brochureSession.questions.reduce(
        (acc, q) => {
          if (q.response) {
            acc[q.questionId] = q.response;
          }
          return acc;
        },
        {} as Record<string, string>
      );

      // Get existing brand kit
      const client = await ctx.db.clientProfile.findUnique({
        where: { id: session.clientProfileId },
        select: { brandKit: true },
      });

      try {
        // Generate field options
        const fieldOptions = await generateDynamicBrandFields(
          responses,
          client?.brandKit as any
        );

        // Store generated fields
        const fields = await Promise.all(
          Object.entries(fieldOptions).map(([fieldId, options]: [string, any]) =>
            ctx.db.brandBrochureField.upsert({
              where: { sessionId_fieldId: { sessionId: input.sessionId, fieldId } },
              update: {
                suggestedValue: Array.isArray(options) ? options[0] : options,
              },
              create: {
                sessionId: input.sessionId,
                fieldId,
                label: fieldId.replace(/_/g, " "),
                category: getCategoryForField(fieldId),
                suggestedValue: Array.isArray(options) ? options[0] : options,
                confidence: 0.85,
                relatedQuestions: Object.keys(responses),
              },
            })
          )
        );

        return {
          fields: fields.map((f) => ({
            fieldId: f.fieldId,
            label: f.label,
            suggestedValue: f.suggestedValue,
            confidence: f.confidence,
          })),
          fieldOptions,
        };
      } catch (err) {
        console.error("Error generating brand fields:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error generando sugerencias" });
      }
    }),

  // Approve/edit a field and prepare for saving
  approveField: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        fieldId: z.string(),
        value: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session.user;
      if (session.role !== "CLIENTE" || !session.clientProfileId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.brandBrochureField.update({
        where: { sessionId_fieldId: { sessionId: input.sessionId, fieldId: input.fieldId } },
        data: { clientValue: input.value },
      });

      return { success: true };
    }),

  // Complete session and merge into brand kit
  complete: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session.user;
      if (session.role !== "CLIENTE" || !session.clientProfileId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
        include: { fields: true },
      });

      if (!brochureSession || brochureSession.clientId !== session.clientProfileId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Build brand kit from approved fields
      const brandKitUpdate: Record<string, any> = {};
      brochureSession.fields.forEach((field) => {
        if (field.clientValue) {
          brandKitUpdate[field.fieldId] = field.clientValue;
        }
      });

      // Merge with existing brand kit
      const client = await ctx.db.clientProfile.findUnique({
        where: { id: session.clientProfileId },
        select: { brandKit: true },
      });

      const mergedBrandKit = {
        ...(typeof client?.brandKit === "object" ? client.brandKit : {}),
        ...brandKitUpdate,
      };

      // Update client brand kit
      await ctx.db.clientProfile.update({
        where: { id: session.clientProfileId },
        data: { brandKit: mergedBrandKit },
      });

      // Mark session as completed
      await ctx.db.brandBrochureSession.update({
        where: { id: input.sessionId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          finalBrandKit: mergedBrandKit,
        },
      });

      return {
        success: true,
        brandKit: mergedBrandKit,
      };
    }),
});

function getCategoryForField(fieldId: string): string {
  const categories: Record<string, string> = {
    missionStatement: "strategy",
    targetAudience: "strategy",
    brandValues: "strategy",
    doAndDonts: "strategy",
    tagline: "identity",
    toneOfVoice: "communication",
    brandColors: "identity",
    brandAssets: "assets",
  };
  return categories[fieldId] || "strategy";
}
