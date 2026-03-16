import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyzes client's brand responses and generates dynamic fields needed
 * Returns suggestions for fields, next questions, and confidence levels
 */
export async function analyzeBrandResponses(responses: Record<string, string>) {
  const prompt = `
You are a brand strategy expert. Analyze the following client responses about their brand and provide:
1. Required brand fields that need completion
2. Next questions to ask the client
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
      "question": "What is...?",
      "hint": "helpful hint",
      "inputType": "textarea|text|select"
    }
  ],
  "analysis": "brief analysis summary"
}`;

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
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
    model: "claude-3-5-sonnet-20241022",
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
