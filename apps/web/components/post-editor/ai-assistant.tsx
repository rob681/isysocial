"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Copy, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const TONE_OPTIONS = [
  { value: "__none__", label: "Sin preferencia" },
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "playful", label: "Divertido" },
  { value: "professional", label: "Profesional" },
  { value: "friendly", label: "Amigable" },
  { value: "authoritative", label: "Autoritario" },
  { value: "conversational", label: "Conversacional" },
];

interface AiAssistantProps {
  onInsert: (text: string) => void;
  network?: string;
  clientId?: string;
  onClose: () => void;
}

export function AiAssistant({ onInsert, network, clientId, onClose }: AiAssistantProps) {
  const { toast } = useToast();

  const [prompt, setPrompt] = useState("");
  const [versions, setVersions] = useState(1);
  const [maxChars, setMaxChars] = useState(500);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [tone, setTone] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: credits } = trpc.ai.getCredits.useQuery();
  const generateMutation = trpc.ai.generateCopy.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generateMutation.mutate({
      prompt,
      versions,
      maxChars,
      includeHashtags,
      includeEmojis,
      tone,
      network,
      clientId,
    });
  };

  const handleInsert = (text: string) => {
    onInsert(text);
    toast({ title: "Copy insertado" });
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full lg:w-[340px] flex-shrink-0 border-l bg-card flex flex-col max-h-[calc(100vh-4rem)] sticky top-16">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Asistente de IA</h3>
        </div>
        <div className="flex items-center gap-2">
          {credits && (
            <span className="text-[11px] text-muted-foreground">
              {credits.used}/{credits.limit} créditos
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Prompt */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Solicitud</Label>
          <Textarea
            placeholder="Escribe sobre qué quieres generar el copy. Ej: Promocionar nuestra nueva línea de productos ecológicos..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none text-sm"
            maxLength={1000}
          />
          <p className="text-[10px] text-muted-foreground text-right">{prompt.length}/1000</p>
        </div>

        {/* Versions */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Número de versiones</Label>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setVersions(n)}
                className={cn(
                  "w-10 h-10 rounded-full border text-sm font-medium transition-colors",
                  versions === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Characters slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Símbolos</Label>
            <span className="text-xs text-muted-foreground font-mono">{maxChars}</span>
          </div>
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={maxChars}
            onChange={(e) => setMaxChars(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {/* Advanced settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Opciones avanzadas
        </button>

        {showSettings && (
          <div className="space-y-3 animate-in slide-in-from-top-1">
            {/* Hashtags toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Agregar hashtags</Label>
              <Switch checked={includeHashtags} onCheckedChange={setIncludeHashtags} />
            </div>

            {/* Emojis toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Usar emojis</Label>
              <Switch checked={includeEmojis} onCheckedChange={setIncludeEmojis} />
            </div>

            {/* Tone selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tono de escritura</Label>
              <Select value={tone || "__none__"} onValueChange={(v) => setTone(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Sin preferencia" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generateMutation.isLoading}
          className="w-full gradient-primary text-white"
        >
          {generateMutation.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generar
            </>
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">
              Resultados ({results.length})
            </Label>
            {results.map((text, i) => (
              <div
                key={i}
                className="relative group border rounded-lg p-3 text-sm leading-relaxed bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <p className="whitespace-pre-wrap pr-6">{text}</p>
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(text, i)}
                    className="p-1 rounded hover:bg-background"
                    title="Copiar"
                  >
                    {copiedIndex === i ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs w-full"
                  onClick={() => handleInsert(text)}
                >
                  Usar este copy
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
