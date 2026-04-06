import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extract text from a PDF buffer using pdf-parse library.
 * Falls back to Claude Vision if pdf-parse yields no usable text.
 */
export async function extractTextFromPDF(
  buffer: Buffer,
  fileName?: string
): Promise<{ text: string; method: "pdf_parse" | "ocr_vision"; confidence: number }> {
  // Try pdf-parse first (fast, text-based PDFs)
  try {
    // Dynamic import so the package is optional at build time
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
    const result = await pdfParse(buffer);

    const text = (result.text || "").trim();
    if (text.length > 50) {
      return { text, method: "pdf_parse", confidence: 0.9 };
    }
    // If text is too short, it's probably a scanned PDF → use Vision
  } catch (err) {
    console.warn("[file-extraction] pdf-parse failed, falling back to Vision:", err);
  }

  // Fallback: send PDF as base64 image to Claude Vision
  return extractWithClaudeVision(buffer, "application/pdf", fileName);
}

/**
 * Extract text/brand info from an image using Claude Vision API.
 */
export async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string,
  fileName?: string
): Promise<{ text: string; method: "ocr_vision"; confidence: number }> {
  return extractWithClaudeVision(buffer, mimeType, fileName);
}

/**
 * Core Claude Vision extraction – works for both images and PDFs.
 */
async function extractWithClaudeVision(
  buffer: Buffer,
  mimeType: string,
  fileName?: string
): Promise<{ text: string; method: "ocr_vision"; confidence: number }> {
  const base64 = buffer.toString("base64");
  const mediaType = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  // For PDFs we convert to a general prompt; for images we use the vision block
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  // Videos cannot be processed by Claude Vision API
  if (isVideo) {
    return {
      text: "Archivo de video detectado. La Vision AI solo puede analizar imagenes. Para analizar el contenido del video, extrae un fotograma como imagen.",
      method: "ocr_vision" as const,
      confidence: 0,
    };
  }

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: isImage
        ? [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Extract ALL text and brand-related information from this image.
Focus on:
- Company/brand name
- Colors mentioned or visible (describe hex codes if possible)
- Typography/fonts visible
- Mission statements, taglines, slogans
- Target audience descriptions
- Brand values
- Tone of voice guidelines
- Logo descriptions
- Any "Do" and "Don't" guidelines

Return the extracted text as plain text, organized by category where applicable.
If you see colors, describe them with approximate hex codes.
If you see fonts, identify them if possible.
Be thorough – extract everything you can see.`,
            },
          ]
        : [
            {
              type: "text",
              text: `I have a PDF document${fileName ? ` named "${fileName}"` : ""} that contains brand information.
The raw content is encoded in base64. Please analyze any brand-related content you can find.

Base64 content (first 5000 chars): ${base64.substring(0, 5000)}

Extract ALL brand-related information including:
- Company/brand name
- Colors (with hex codes if available)
- Typography/fonts
- Mission statements, taglines, slogans
- Target audience
- Brand values
- Tone of voice
- Logo descriptions
- Do and Don't guidelines

Return the extracted text as plain text, organized by category.`,
            },
          ],
    },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages,
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude Vision");
  }

  return {
    text: content.text,
    method: "ocr_vision",
    confidence: 0.75,
  };
}

/**
 * Validates whether extracted text looks like brand-related content.
 * Returns a score 0-1 indicating how "brand-like" the content is.
 */
export function validateBrandContent(text: string): {
  isValid: boolean;
  score: number;
  reason: string;
} {
  if (!text || text.trim().length < 20) {
    return { isValid: false, score: 0, reason: "Texto demasiado corto" };
  }

  const brandKeywords = [
    "marca", "brand", "logo", "color", "tipografia", "typography", "font",
    "mision", "mission", "vision", "valores", "values", "tono", "tone",
    "audiencia", "audience", "eslogan", "slogan", "tagline", "identidad",
    "identity", "paleta", "palette", "estilo", "style", "empresa", "company",
  ];

  const lowerText = text.toLowerCase();
  const matchCount = brandKeywords.filter((kw) => lowerText.includes(kw)).length;
  const score = Math.min(matchCount / 5, 1); // 5+ keywords = 1.0

  return {
    isValid: score >= 0.2,
    score,
    reason:
      score >= 0.6
        ? "Contenido de marca detectado"
        : score >= 0.2
          ? "Algo de contenido de marca detectado"
          : "No parece contener información de marca",
  };
}
