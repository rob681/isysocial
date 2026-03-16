import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, getAgencyId } from "../trpc";
import {
  analyzeBrandResponses,
  generateDynamicBrandFields,
  generateFieldSchemaFromExtraction,
  generateFieldSchemaFromQA,
  renderBrandKitFromSchema,
  type FieldSchema,
} from "../lib/claude";
import { uploadFile } from "../lib/supabase-storage";
import {
  extractTextFromPDF,
  extractTextFromImage,
  validateBrandContent,
} from "../lib/file-extraction";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryForField(fieldId: string): string {
  const categories: Record<string, string> = {
    missionStatement: "strategy",
    mission: "strategy",
    targetAudience: "strategy",
    target_audience: "strategy",
    brandValues: "strategy",
    brand_values: "strategy",
    doAndDonts: "strategy",
    do_and_donts: "strategy",
    tagline: "communication",
    toneOfVoice: "communication",
    tone_of_voice: "communication",
    colors: "identity",
    typography: "identity",
    brand_name: "identity",
    logo: "assets",
  };
  return categories[fieldId] || "strategy";
}

function assertCliente(session: any): string {
  if (session.role !== "CLIENTE" || !session.clientProfileId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo clientes pueden usar brochure" });
  }
  return session.clientProfileId;
}

// ── Router ───────────────────────────────────────────────────────────────────

export const brandBrochureRouter = router({
  /**
   * Start a new guided brochure session.
   * Cleans up any previous session for the same client.
   */
  initiate: protectedProcedure.mutation(async ({ ctx }) => {
    const clientId = assertCliente(ctx.session.user);

    // Try to find existing session first
    const existing = await ctx.db.brandBrochureSession.findUnique({
      where: { clientId },
      include: { questions: true },
    });

    if (existing) {
      // Return existing session instead of creating new one
      const questions = existing.questions
        .filter((q) => q.stepNumber <= 3)
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .map((q) => ({
          stepNumber: q.stepNumber,
          questionId: q.questionId,
          question: q.question,
          hint: q.hint,
          inputType: q.inputType,
          required: q.required,
        }));

      return {
        sessionId: existing.id,
        questions,
        currentStep: existing.currentStep,
      };
    }

    // Create new session (use upsert to handle race conditions from React StrictMode)
    const newSession = await ctx.db.brandBrochureSession.upsert({
      where: { clientId },
      update: {},
      create: { clientId, status: "INITIAL" },
    });

    // Create initial questions (used for Q&A path)
    const initialQuestions = [
      {
        stepNumber: 1,
        questionId: "company_description",
        question: "Describe tu empresa en pocas palabras",
        hint: "Que hace tu empresa, que servicios ofrece, a quien le vende, etc.",
        inputType: "textarea",
        required: true,
      },
      {
        stepNumber: 2,
        questionId: "industry",
        question: "En que industria o sector operas?",
        hint: "Por ejemplo: tecnologia, retail, servicios profesionales, etc.",
        inputType: "text",
        required: true,
      },
      {
        stepNumber: 3,
        questionId: "brand_personality",
        question: "Si tu marca fuera una persona, como la describirias?",
        hint: "Piensa en adjetivos: moderna, elegante, divertida, seria, etc.",
        inputType: "textarea",
        required: true,
      },
    ];

    await Promise.all(
      initialQuestions.map((q) =>
        ctx.db.brandBrochureQuestion.upsert({
          where: {
            sessionId_questionId: {
              sessionId: newSession.id,
              questionId: q.questionId,
            },
          },
          update: {},
          create: { sessionId: newSession.id, ...q },
        })
      )
    );

    return {
      sessionId: newSession.id,
      questions: initialQuestions,
      currentStep: 1,
    };
  }),

  /**
   * Upload a brand document (PDF or image) for AI extraction.
   * Returns the extracted text for client review.
   */
  uploadBrochureFile: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        fileUrl: z.string(),
        storagePath: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      // Verify session ownership
      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sesion no encontrada" });
      }

      // Download file from Supabase to extract text
      let extractedText = "";
      let method = "manual";
      let confidence = 0;

      try {
        const res = await fetch(input.fileUrl);
        const buffer = Buffer.from(await res.arrayBuffer());

        if (input.mimeType === "application/pdf") {
          const result = await extractTextFromPDF(buffer, input.fileName);
          extractedText = result.text;
          method = result.method;
          confidence = result.confidence;
        } else if (input.mimeType.startsWith("image/")) {
          const result = await extractTextFromImage(buffer, input.mimeType, input.fileName);
          extractedText = result.text;
          method = result.method;
          confidence = result.confidence;
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tipo de archivo no soportado" });
        }
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
        console.error("Error extracting text:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al extraer texto del archivo",
        });
      }

      // Save upload record
      const upload = await ctx.db.brandBrochureUpload.create({
        data: {
          sessionId: input.sessionId,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          extractedText,
          extractionMethod: method,
          confidence,
        },
      });

      // Validate brand content
      const validation = validateBrandContent(extractedText);

      // Update session status
      await ctx.db.brandBrochureSession.update({
        where: { id: input.sessionId },
        data: { status: "IN_PROGRESS" },
      });

      return {
        uploadId: upload.id,
        extractedText,
        method,
        confidence,
        validation,
      };
    }),

  /**
   * Confirm extracted text (optionally edited) and generate dynamic field schema.
   * This is called after uploadBrochureFile when client reviews the extracted text.
   */
  confirmExtraction: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        extractedText: z.string().min(10, "El texto debe tener al menos 10 caracteres"),
        corrections: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sesion no encontrada" });
      }

      const finalText = input.corrections || input.extractedText;

      // Generate dynamic field schema from extraction
      const schema = await generateFieldSchemaFromExtraction(finalText);

      // Store generated schema in session
      await ctx.db.brandBrochureSession.update({
        where: { id: input.sessionId },
        data: {
          generatedFieldSchema: schema as any,
          responses: { _extractedText: finalText } as any,
          status: "IN_PROGRESS",
        },
      });

      // Create BrandBrochureField entries from schema
      await Promise.all(
        schema.fields.map((field) =>
          ctx.db.brandBrochureField.upsert({
            where: { sessionId_fieldId: { sessionId: input.sessionId, fieldId: field.id } },
            update: {
              label: field.label,
              suggestedValue: field.suggestedValue != null ? JSON.stringify(field.suggestedValue) : null,
              confidence: field.confidence ?? null,
              category: field.category,
            },
            create: {
              sessionId: input.sessionId,
              fieldId: field.id,
              label: field.label,
              category: field.category,
              suggestedValue: field.suggestedValue != null ? JSON.stringify(field.suggestedValue) : null,
              confidence: field.confidence ?? null,
              relatedQuestions: ["_extractedText"],
            },
          })
        )
      );

      return { schema, fieldCount: schema.fields.length };
    }),

  /**
   * Submit answer to a question and get next questions (Q&A path).
   * After enough answers, generates the dynamic field schema.
   */
  submitAnswer: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        questionId: z.string(),
        answer: z.string(),
        answerJson: z.any().optional(), // For complex inputs (colors, typography)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sesion no encontrada" });
      }

      // Save answer
      await ctx.db.brandBrochureQuestion.update({
        where: {
          sessionId_questionId: {
            sessionId: input.sessionId,
            questionId: input.questionId,
          },
        },
        data: {
          response: input.answer,
          responseJson: input.answerJson ?? undefined,
        },
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

      const responseCount = Object.keys(updatedResponses).length;

      // After 3+ responses, every 3 answers try to get next questions from AI
      // Cap at 12 total questions to prevent infinite growth
      const totalQuestions = await ctx.db.brandBrochureQuestion.count({
        where: { sessionId: input.sessionId },
      });
      if (responseCount >= 3 && responseCount % 3 === 0 && totalQuestions < 12) {
        try {
          const analysis = await analyzeBrandResponses(
            updatedResponses as Record<string, string>
          );

          if (analysis.nextQuestions && Array.isArray(analysis.nextQuestions)) {
            const nextQuestions = analysis.nextQuestions.slice(0, 3);

            await Promise.all(
              nextQuestions.map((q: any, idx: number) =>
                ctx.db.brandBrochureQuestion.upsert({
                  where: {
                    sessionId_questionId: {
                      sessionId: input.sessionId,
                      questionId: q.questionId,
                    },
                  },
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
        }
      }

      return { nextQuestions: [], hasMore: false };
    }),

  /**
   * Generate the dynamic field schema from Q&A responses.
   * Called when client finishes answering questions.
   */
  generateSchema: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
        include: { questions: true },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Collect all responses
      const responses = brochureSession.questions.reduce((acc, q) => {
        if (q.response) acc[q.questionId] = q.response;
        return acc;
      }, {} as Record<string, string>);

      if (Object.keys(responses).length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Necesitas responder al menos 2 preguntas",
        });
      }

      // Generate schema from Q&A
      const schema = await generateFieldSchemaFromQA(responses);

      // Store schema in session
      await ctx.db.brandBrochureSession.update({
        where: { id: input.sessionId },
        data: { generatedFieldSchema: schema as any },
      });

      // Create BrandBrochureField entries from schema
      await Promise.all(
        schema.fields.map((field) =>
          ctx.db.brandBrochureField.upsert({
            where: { sessionId_fieldId: { sessionId: input.sessionId, fieldId: field.id } },
            update: {
              label: field.label,
              suggestedValue: field.suggestedValue != null ? JSON.stringify(field.suggestedValue) : null,
              confidence: field.confidence ?? null,
              category: field.category,
            },
            create: {
              sessionId: input.sessionId,
              fieldId: field.id,
              label: field.label,
              category: field.category,
              suggestedValue: field.suggestedValue != null ? JSON.stringify(field.suggestedValue) : null,
              confidence: field.confidence ?? null,
              relatedQuestions: Object.keys(responses),
            },
          })
        )
      );

      return { schema, fieldCount: schema.fields.length };
    }),

  /**
   * Get the generated field schema for this session.
   * Used to render the dynamic form.
   */
  getFieldSchema: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
        include: { fields: true },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const schema = brochureSession.generatedFieldSchema as FieldSchema | null;

      return {
        schema,
        fields: brochureSession.fields.map((f) => ({
          fieldId: f.fieldId,
          label: f.label,
          category: f.category,
          suggestedValue: f.suggestedValue,
          clientValue: f.clientValue,
          confidence: f.confidence,
        })),
      };
    }),

  /**
   * Get AI-generated field suggestions (legacy endpoint, kept for backward compat).
   */
  getFieldSuggestions: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
        include: { questions: true },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const responses = brochureSession.questions.reduce((acc, q) => {
        if (q.response) acc[q.questionId] = q.response;
        return acc;
      }, {} as Record<string, string>);

      const existingClient = await ctx.db.clientProfile.findUnique({
        where: { id: clientId },
        select: { brandKit: true },
      });

      try {
        const fieldOptions = await generateDynamicBrandFields(
          responses,
          existingClient?.brandKit as any
        );

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

  /**
   * Save a field value (approve or edit).
   */
  approveField: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        fieldId: z.string(),
        value: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      // Verify session ownership
      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
        select: { clientId: true },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.brandBrochureField.update({
        where: { sessionId_fieldId: { sessionId: input.sessionId, fieldId: input.fieldId } },
        data: { clientValue: input.value },
      });

      return { success: true };
    }),

  /**
   * Save all field values at once (batch approve).
   */
  saveAllFields: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        fields: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
        select: { clientId: true },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await Promise.all(
        Object.entries(input.fields).map(([fieldId, value]) =>
          ctx.db.brandBrochureField.upsert({
            where: { sessionId_fieldId: { sessionId: input.sessionId, fieldId } },
            update: { clientValue: value },
            create: {
              sessionId: input.sessionId,
              fieldId,
              label: fieldId.replace(/_/g, " "),
              category: getCategoryForField(fieldId),
              clientValue: value,
              relatedQuestions: [],
            },
          })
        )
      );

      return { success: true, savedCount: Object.keys(input.fields).length };
    }),

  /**
   * Complete the session and merge all fields into ClientProfile.brandKit.
   */
  complete: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const clientId = assertCliente(ctx.session.user);

      const brochureSession = await ctx.db.brandBrochureSession.findUnique({
        where: { id: input.sessionId },
        include: { fields: true },
      });
      if (!brochureSession || brochureSession.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const schema = brochureSession.generatedFieldSchema as FieldSchema | null;

      // Build brand kit from fields
      let brandKitUpdate: Record<string, any> = {};

      if (schema) {
        // New path: use schema-based rendering
        const fieldValues: Record<string, any> = {};
        for (const field of brochureSession.fields) {
          const rawValue = field.clientValue || field.suggestedValue;
          if (!rawValue) continue;

          // Try to parse JSON values (for complex types like colors, typography)
          try {
            fieldValues[field.fieldId] = JSON.parse(rawValue);
          } catch {
            fieldValues[field.fieldId] = rawValue;
          }
        }
        brandKitUpdate = renderBrandKitFromSchema(schema, fieldValues);
      } else {
        // Legacy path: simple field→key mapping
        for (const field of brochureSession.fields) {
          if (field.clientValue) {
            brandKitUpdate[field.fieldId] = field.clientValue;
          }
        }
      }

      // Merge with existing brand kit
      const existingClient = await ctx.db.clientProfile.findUnique({
        where: { id: clientId },
        select: { brandKit: true },
      });

      const mergedBrandKit = {
        ...(typeof existingClient?.brandKit === "object" ? existingClient.brandKit : {}),
        ...brandKitUpdate,
      };

      // Update client brand kit
      await ctx.db.clientProfile.update({
        where: { id: clientId },
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

      return { success: true, brandKit: mergedBrandKit };
    }),
});
