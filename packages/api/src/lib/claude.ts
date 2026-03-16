import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FieldSchemaField {
  id: string;
  label: string;
  type: "text" | "textarea" | "color" | "multi-color" | "multi-typography" | "select" | "multi-select" | "file";
  category: "identity" | "communication" | "strategy" | "assets";
  required?: boolean;
  hint?: string;
  maxItems?: number;
  options?: string[];
  accepts?: string[];
  suggestedValue?: any;
  confidence?: number;
}

export interface FieldSchema {
  version: string;
  fields: FieldSchemaField[];
  metadata: {
    extractedFrom: "file" | "qa" | "hybrid";
    generatedBy: string;
    generatedAt: string;
  };
}

// ── Existing functions (kept for backward compat) ──────────────────────────────

/**
 * Analyzes client's brand responses and generates dynamic fields needed
 * Returns suggestions for fields, next questions, and confidence levels
 */
export async function analyzeBrandResponses(responses: Record<string, string>) {
  const prompt = `
You are a brand strategy expert. Analyze the following client responses about their brand and provide:
1. Required brand fields that need completion
2. Next questions to ask the client (in SPANISH)
3. Confidence level for each suggestion

Client Responses:
${Object.entries(responses)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "fields": [
    {
      "id": "fieldId",
      "label": "Field Label",
      "category": "communication|identity|strategy|assets",
      "suggestedValue": "suggested content or null",
      "reasoning": "why this field is needed",
      "confidence": 0.85
    }
  ],
  "nextQuestions": [
    {
      "questionId": "q_id",
      "question": "Pregunta en espanol...",
      "hint": "helpful hint in spanish",
      "inputType": "textarea|text|select"
    }
  ],
  "analysis": "brief analysis summary"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    return JSON.parse(content.text);
  } catch {
    console.error("Failed to parse Claude response:", content.text);
    throw new Error("Invalid JSON response from brand analysis");
  }
}

/**
 * Generates 3 options for each missing brand field
 */
export async function generateDynamicBrandFields(
  responses: Record<string, string>,
  existingBrandKit?: Record<string, any>
) {
  const existingFields = existingBrandKit
    ? Object.entries(existingBrandKit)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    : "No existing brand kit";

  const prompt = `
You are a brand copywriting expert. Based on these client responses, generate 3 options for each needed brand field.

Client Responses:
${Object.entries(responses)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

Existing Brand Info:
${existingFields}

Generate natural, professional content for these fields (use client's language/tone):
- missionStatement: 1-2 sentences max 300 chars, inspiring purpose statement
- targetAudience: demographics + behaviors, max 400 chars
- brandValues: 4-6 values with brief explanations, max 500 chars
- toneOfVoice: enum from [professional, friendly, formal, informal, playful, conversational]
- doAndDonts: "Do:" and "Don't:" sections, max 600 chars
- tagline: memorable phrase/slogan, max 100 chars

Return ONLY valid JSON (no markdown):
{
  "missionStatement": ["option1", "option2", "option3"],
  "targetAudience": ["option1", "option2", "option3"],
  "brandValues": ["option1", "option2", "option3"],
  "toneOfVoice": ["professional", "friendly", "conversational"],
  "doAndDonts": ["option1", "option2", "option3"],
  "tagline": ["option1", "option2", "option3"]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    return JSON.parse(content.text);
  } catch {
    console.error("Failed to parse Claude response:", content.text);
    throw new Error("Invalid JSON response from field generation");
  }
}

// ── NEW: Dynamic Schema Generation (Sprint 3) ─────────────────────────────────

/**
 * Generate a dynamic field schema from extracted document text.
 * Used when client uploads a PDF/image with brand information.
 */
export async function generateFieldSchemaFromExtraction(
  extractedText: string
): Promise<FieldSchema> {
  const prompt = `
You are a brand strategy expert. A client uploaded a brand document and we extracted the following text.
Analyze this text and create a dynamic form schema so the client can review, complete, and edit their brand profile.

EXTRACTED TEXT:
---
${extractedText.substring(0, 6000)}
---

Based on what you found, generate a JSON schema with fields the client needs to review or complete.
Include fields for information you DID find (with suggested values) AND fields that are MISSING.

RULES:
- Always include color fields if any colors are mentioned (use "color" or "multi-color" type)
- Always include typography fields if fonts are mentioned (use "multi-typography" type)
- Include file upload fields for logo/assets if not provided (use "file" type)
- Include text fields for mission, values, audience, tone (use "text" or "textarea" type)
- Labels should be in SPANISH
- suggestedValue should contain extracted info when available, null when missing
- confidence should reflect how certain you are about the extraction (0.0 to 1.0)

Return ONLY valid JSON (no markdown, no code blocks):
{
  "version": "1.0",
  "fields": [
    {
      "id": "brand_name",
      "label": "Nombre de la Marca",
      "type": "text",
      "category": "identity",
      "required": true,
      "hint": "El nombre oficial de tu marca",
      "suggestedValue": "extracted value or null",
      "confidence": 0.95
    },
    {
      "id": "colors",
      "label": "Colores de Marca",
      "type": "multi-color",
      "category": "identity",
      "required": true,
      "maxItems": 5,
      "hint": "Los colores principales de tu marca",
      "suggestedValue": [{"label": "Primario", "value": "#hex", "usage": "primary"}],
      "confidence": 0.8
    },
    {
      "id": "typography",
      "label": "Tipografias",
      "type": "multi-typography",
      "category": "identity",
      "required": false,
      "hint": "Las fuentes que usa tu marca",
      "suggestedValue": {"heading": {"family": "Font", "weights": [600], "size": "24px"}, "body": {"family": "Font", "weights": [400], "size": "16px"}},
      "confidence": 0.7
    }
  ],
  "metadata": {
    "extractedFrom": "file",
    "generatedBy": "claude-sonnet-4",
    "generatedAt": "${new Date().toISOString()}"
  }
}

Include at least these field categories:
- identity: brand_name, colors, typography, logo
- communication: tone_of_voice, tagline
- strategy: mission, target_audience, brand_values, do_and_donts`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    return JSON.parse(content.text) as FieldSchema;
  } catch {
    console.error("Failed to parse schema response:", content.text);
    throw new Error("Invalid JSON response from schema generation");
  }
}

/**
 * Generate a dynamic field schema from Q&A responses.
 * Used when client answers questions instead of uploading a document.
 */
export async function generateFieldSchemaFromQA(
  responses: Record<string, string>
): Promise<FieldSchema> {
  const prompt = `
You are a brand strategy expert. A client answered the following questions about their brand.
Based on their responses, create a dynamic form schema for them to complete their full brand profile.

CLIENT RESPONSES:
${Object.entries(responses)
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

Generate a JSON schema with fields the client needs to fill out.
Pre-fill suggestedValue for fields you can infer from responses.
Leave suggestedValue as null for fields you need the client to fill.

RULES:
- Always include: colors (multi-color), typography (multi-typography), mission (textarea),
  target_audience (textarea), brand_values (textarea), tone_of_voice (select), tagline (text)
- Include logo (file) field if not mentioned
- Include do_and_donts (textarea) field
- Labels must be in SPANISH
- Be creative with suggested values based on what the client told you
- Confidence should reflect how sure you are about the suggestion

Return ONLY valid JSON (no markdown):
{
  "version": "1.0",
  "fields": [
    {
      "id": "field_id",
      "label": "Label en Espanol",
      "type": "text|textarea|color|multi-color|multi-typography|select|file",
      "category": "identity|communication|strategy|assets",
      "required": true|false,
      "hint": "Helpful hint in spanish",
      "options": ["only for select type"],
      "maxItems": 5,
      "accepts": ["image/png"],
      "suggestedValue": "value or null",
      "confidence": 0.85
    }
  ],
  "metadata": {
    "extractedFrom": "qa",
    "generatedBy": "claude-sonnet-4",
    "generatedAt": "${new Date().toISOString()}"
  }
}

For tone_of_voice, use options: ["profesional", "amigable", "formal", "informal", "divertido", "conversacional"]
For multi-color suggestedValue use: [{"label": "Primario", "value": "#hex", "usage": "primary"}]
For multi-typography suggestedValue use: {"heading": {"family": "Font", "weights": [600], "size": "24px"}, "body": {"family": "Font", "weights": [400], "size": "16px"}}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    return JSON.parse(content.text) as FieldSchema;
  } catch {
    console.error("Failed to parse schema response:", content.text);
    throw new Error("Invalid JSON response from Q&A schema generation");
  }
}

/**
 * Convert a FieldSchema + client-provided values into the final brandKit JSON
 * that gets stored in ClientProfile.brandKit.
 */
export function renderBrandKitFromSchema(
  schema: FieldSchema,
  fieldValues: Record<string, any>
): Record<string, any> {
  const brandKit: Record<string, any> = {};

  for (const field of schema.fields) {
    const value = fieldValues[field.id];
    if (value === undefined || value === null || value === "") continue;

    // Map field IDs to brandKit structure
    switch (field.type) {
      case "multi-color":
        // Store as colors array: [{ label, value, usage }]
        brandKit.colors = Array.isArray(value) ? value : [];
        break;

      case "multi-typography":
        // Store as typography object: { heading: {...}, body: {...}, accent: {...} }
        brandKit.typography = typeof value === "object" ? value : {};
        break;

      case "color":
        // Single color → store under field id
        brandKit[field.id] = value;
        break;

      case "select":
        brandKit[field.id] = value;
        break;

      case "file":
        // Store file URL
        brandKit[field.id] = value;
        break;

      default:
        // text, textarea → store directly
        brandKit[field.id] = value;
        break;
    }
  }

  return brandKit;
}
