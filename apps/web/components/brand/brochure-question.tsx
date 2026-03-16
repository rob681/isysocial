"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Question {
  questionId: string;
  question: string;
  hint?: string;
  inputType: string;
  required: boolean;
  options?: string[];
}

interface BrochureQuestionProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function BrochureQuestion({
  question,
  value,
  onChange,
}: BrochureQuestionProps) {
  // For "select" type without explicit options, extract options from hint or fall back to textarea
  const selectOptions = question.options ?? extractOptionsFromHint(question.hint);
  const effectiveType =
    question.inputType === "select" && selectOptions.length === 0
      ? "textarea"
      : question.inputType;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-semibold">{question.question}</Label>
        {question.hint && (
          <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
        )}
      </div>

      {effectiveType === "textarea" && (
        <Textarea
          placeholder="Escribe tu respuesta aquí..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="resize-none"
        />
      )}

      {effectiveType === "text" && (
        <Input
          placeholder="Escribe tu respuesta aquí..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="text"
        />
      )}

      {effectiveType === "select" && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
        >
          <option value="">Selecciona una opción...</option>
          {selectOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/**
 * Try to extract select options from the hint text.
 * Looks for patterns like "premium, competitivo o económico"
 */
function extractOptionsFromHint(hint?: string): string[] {
  if (!hint) return [];
  // Try to find comma-separated options with "o" as conjunction
  const match = hint.match(
    /(?:como|ser|tipo|entre|opciones?:?)\s+(.+)/i
  );
  if (match) {
    const raw = match[1]
      .replace(/\.$/, "")
      .replace(/\s+o\s+/g, ", ")
      .replace(/\s+y\s+/g, ", ");
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
