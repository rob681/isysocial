"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  X,
  Loader2,
  Check,
  Target,
  Heart,
  Megaphone,
  ListChecks,
  Flag,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BrandField =
  | "missionStatement"
  | "targetAudience"
  | "brandValues"
  | "styleNotes"
  | "doAndDonts"
  | "tagline";

const FIELD_OPTIONS: {
  value: BrandField;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "missionStatement",
    label: "Misión",
    icon: Flag,
    description: "Declaración de misión de tu empresa",
  },
  {
    value: "targetAudience",
    label: "Audiencia",
    icon: Target,
    description: "Descripción de tu público objetivo",
  },
  {
    value: "brandValues",
    label: "Valores",
    icon: Heart,
    description: "Los valores que guían tu marca",
  },
  {
    value: "styleNotes",
    label: "Estilo",
    icon: Megaphone,
    description: "Guías de comunicación en redes",
  },
  {
    value: "doAndDonts",
    label: "Do's & Don'ts",
    icon: ListChecks,
    description: "Qué hacer y no hacer con tu marca",
  },
  {
    value: "tagline",
    label: "Tagline",
    icon: Zap,
    description: "Slogan corto y memorable",
  },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Profesional" },
  { value: "friendly", label: "Amigable" },
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "playful", label: "Divertido" },
  { value: "conversational", label: "Conversacional" },
];

interface AIBrandAssistantProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
  existingValues: Record<string, string>;
  onInsert: (field: BrandField, value: string) => void;
}

export function AIBrandAssistant({
  open,
  onClose,
  companyName,
  existingValues,
  onInsert,
}: AIBrandAssistantProps) {
  const { toast } = useToast();
  const [selectedField, setSelectedField] = useState<BrandField>("missionStatement");
  const [brandDescription, setBrandDescription] = useState("");
  const [tone, setTone] = useState("professional");
  const [results, setResults] = useState<string[]>([]);

  const generateSuggestion = trpc.ai.generateBrandSuggestion.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
    },
    onError: (err) => {
      toast({
        title: "Error al generar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generateSuggestion.mutate({
      field: selectedField,
      brandDescription,
      companyName,
      tone,
      existingValues,
      versions: 3,
    });
  };

  const handleInsert = (text: string) => {
    onInsert(selectedField, text);
    toast({ title: "Texto insertado en el formulario" });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-card border-l shadow-2xl z-50 flex flex-col print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h2 className="font-semibold text-base">Asistente de Marca IA</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Brand description input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Describe tu marca brevemente
          </label>
          <Textarea
            value={brandDescription}
            onChange={(e) => setBrandDescription(e.target.value)}
            placeholder="Ej: Somos una agencia de marketing digital enfocada en restaurantes y cafeterías..."
            rows={3}
            className="resize-none text-sm"
          />
        </div>

        {/* Field selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            ¿Qué quieres generar?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_OPTIONS.map((field) => {
              const Icon = field.icon;
              const isSelected = selectedField === field.value;
              return (
                <button
                  key={field.value}
                  onClick={() => {
                    setSelectedField(field.value);
                    setResults([]);
                  }}
                  className={`
                    flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all
                    ${
                      isSelected
                        ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 shadow-sm"
                        : "border-muted hover:border-purple-200 hover:bg-muted/50"
                    }
                  `}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? "text-purple-600" : "text-muted-foreground"}`} />
                  <span className="font-medium">{field.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {FIELD_OPTIONS.find((f) => f.value === selectedField)?.description}
          </p>
        </div>

        {/* Tone selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tono</label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={generateSuggestion.isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
        >
          {generateSuggestion.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generateSuggestion.isLoading ? "Generando..." : "Generar sugerencias"}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {results.length} sugerencia(s) generada(s):
            </p>
            {results.map((result, index) => (
              <div
                key={index}
                className="p-3.5 border rounded-xl bg-muted/20 space-y-2.5 hover:border-purple-200 transition-colors"
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{result}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 gap-1"
                  onClick={() => handleInsert(result)}
                >
                  <Check className="h-3 w-3" />
                  Usar esta
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Generado con IA · Las sugerencias son un punto de partida
        </p>
      </div>
    </div>
  );
}
