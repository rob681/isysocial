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
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-semibold">{question.question}</Label>
        {question.hint && (
          <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
        )}
      </div>

      {question.inputType === "textarea" && (
        <Textarea
          placeholder="Escribe tu respuesta aquí..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="resize-none"
        />
      )}

      {question.inputType === "text" && (
        <Input
          placeholder="Escribe tu respuesta aquí..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="text"
        />
      )}

      {question.inputType === "select" && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
        >
          <option value="">Selecciona una opción...</option>
          {/* Options should be provided via question data */}
        </select>
      )}
    </div>
  );
}
