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
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  ScanEye,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Search,
  Target,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PostType } from "@isysocial/shared";

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

type SourceType = "prompt" | "vision" | "existing";
type WorkflowStep = 1 | 2 | 3;

interface AiAssistantProps {
  onInsert: (text: string) => void;
  network?: string;
  clientId?: string;
  mediaUrls?: string[];
  currentCopy?: string;
  onClose: () => void;
  postType?: PostType;
}

export function AiAssistant({
  onInsert,
  network,
  clientId,
  mediaUrls,
  currentCopy,
  onClose,
  postType,
}: AiAssistantProps) {
  const { toast } = useToast();

  // ─── Workflow State ─────────────────────────────────────────────────────
  const [step, setStep] = useState<WorkflowStep>(1);
  const [sourceType, setSourceType] = useState<SourceType>("prompt");

  // Step 1: Source
  const [prompt, setPrompt] = useState("");
  const [versions, setVersions] = useState(3);
  const [maxChars, setMaxChars] = useState(500);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [tone, setTone] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Results & Selection
  const [generatedVersions, setGeneratedVersions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedCopy, setSelectedCopy] = useState("");

  // Step 2: Refinement
  const [refinedCopy, setRefinedCopy] = useState("");
  const [seoResult, setSeoResult] = useState<any>(null);
  const [seoTheme, setSeoTheme] = useState("");
  const [authenticityResult, setAuthenticityResult] = useState<any>(null);

  // Misc
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // ─── Queries & Mutations ────────────────────────────────────────────────
  const { data: credits } = trpc.ai.getCredits.useQuery();

  const generateMutation = trpc.ai.generateCopy.useMutation({
    onSuccess: (data) => {
      setGeneratedVersions(data.results);
      if (data.results.length === 1) {
        setSelectedIndex(0);
        setSelectedCopy(data.results[0]!);
      }
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const visionMutation = trpc.ai.analyzeMedia.useMutation({
    onSuccess: (data) => {
      setGeneratedVersions(data.results);
      if (data.results.length === 1) {
        setSelectedIndex(0);
        setSelectedCopy(data.results[0]!);
      }
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const refineMutation = trpc.ai.refineCopy.useMutation({
    onSuccess: (data) => {
      setRefinedCopy(data.refined);
      toast({ title: "Copy refinado", description: "Listo para usar" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const enrichSeoMutation = trpc.ai.enrichWithSEO.useMutation({
    onSuccess: (data) => {
      setSeoResult(data);
      toast({ title: "Copy enriquecido", description: "Keywords insertadas" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const checkAuthenticityMutation = trpc.ai.checkAuthenticity.useMutation({
    onSuccess: (data) => {
      setAuthenticityResult(data);
      toast({ title: "Análisis completado", description: `Match: ${data.matchScore}%` });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleGenerate = () => {
    setGeneratedVersions([]);
    setSelectedIndex(null);
    setSelectedCopy("");
    setRefinedCopy("");
    setSeoResult(null);
    setAuthenticityResult(null);

    if (sourceType === "prompt") {
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
    } else if (sourceType === "vision") {
      if (!mediaUrls?.length) return;
      visionMutation.mutate({
        imageUrls: mediaUrls.slice(0, 4),
        network,
        clientId,
        tone,
        includeHashtags,
        includeEmojis,
        versions,
      });
    } else if (sourceType === "existing") {
      const text = currentCopy || "";
      if (!text.trim()) {
        toast({ title: "Sin texto", description: "Escribe un copy primero en el editor", variant: "destructive" });
        return;
      }
      setSelectedCopy(text);
      setSelectedIndex(-1); // special: means "existing text"
      setStep(2);
    }
  };

  const handleSelectVersion = (index: number) => {
    setSelectedIndex(index);
    setSelectedCopy(generatedVersions[index]!);
    // Reset refinement state when selecting a different version
    setRefinedCopy("");
    setSeoResult(null);
    setAuthenticityResult(null);
  };

  const handleUseRefined = (text: string) => {
    setSelectedCopy(text);
    setRefinedCopy("");
    toast({ title: "Versión aplicada" });
  };

  const handleInsert = () => {
    if (!selectedCopy.trim()) return;
    onInsert(selectedCopy);
    toast({ title: "Copy insertado en la publicación" });
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isGenerating = generateMutation.isLoading || visionMutation.isLoading;

  // Extract hashtags from selected copy for display
  const hashtagsInCopy = selectedCopy.match(/((?:#\w+\s*)+)$/)?.[1]?.trim() || "";
  const copyWithoutHashtags = hashtagsInCopy
    ? selectedCopy.replace(/((?:#\w+\s*)+)$/, "").trim()
    : selectedCopy;

  return (
    <div className="w-full lg:w-[360px] flex-shrink-0 border-l bg-card flex flex-col max-h-[calc(100vh-4rem)] sticky top-16 overflow-hidden">
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

      {/* Step Indicator */}
      <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30">
        {[
          { num: 1, label: "Generar" },
          { num: 2, label: "Refinar" },
          { num: 3, label: "Insertar" },
        ].map(({ num, label }) => (
          <button
            key={num}
            onClick={() => {
              if (num === 1) setStep(1);
              if (num === 2 && selectedCopy) setStep(2);
              if (num === 3 && selectedCopy) setStep(3);
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all",
              step === num
                ? "bg-primary text-primary-foreground"
                : step > num
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "text-muted-foreground"
            )}
          >
            {step > num ? <CheckCircle2 className="h-3 w-3" /> : <span>{num}</span>}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ═══════════════════════════════════════════════════════════════════
           STEP 1: SOURCE — Choose how to generate copy
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <>
            {/* Source selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">¿Cómo quieres generar el copy?</Label>
              <div className="space-y-2">
                {[
                  {
                    key: "prompt" as const,
                    Icon: Pencil,
                    label: "Desde texto",
                    desc: "Describe tu idea y la IA genera el copy",
                  },
                  {
                    key: "vision" as const,
                    Icon: ScanEye,
                    label: "Desde media",
                    desc: "La IA analiza tu imagen/video y genera copy",
                    disabled: !mediaUrls?.length || ["VIDEO", "REEL", "STORY"].includes(postType || ""),
                    tooltip: ["VIDEO", "REEL", "STORY"].includes(postType || "") ? "No disponible para videos" : undefined,
                  },
                  {
                    key: "existing" as const,
                    Icon: FileText,
                    label: "Usar mi texto",
                    desc: "Refina el copy que ya escribiste en el editor",
                    disabled: !currentCopy?.trim(),
                  },
                ].map(({ key, Icon, label, desc, disabled, tooltip }) => {
                  const buttonContent = (
                    <button
                      key={key}
                      onClick={() => !disabled && setSourceType(key)}
                      disabled={disabled}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                        sourceType === key
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "hover:bg-accent",
                        disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          sourceType === key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                  );

                  if (tooltip) {
                    return (
                      <TooltipProvider key={key}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {buttonContent}
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            {tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }
                  return buttonContent;
                })}
              </div>
            </div>

            {/* Source-specific inputs */}
            {sourceType === "prompt" && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Escribe sobre qué quieres generar el copy. Ej: Promocionar nuestra nueva línea de productos ecológicos..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none text-sm"
                  maxLength={1000}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {prompt.length}/1000
                </p>
              </div>
            )}

            {sourceType === "vision" && mediaUrls && mediaUrls.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Media a analizar ({Math.min(mediaUrls.length, 4)} archivo{mediaUrls.length > 1 ? "s" : ""})
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {mediaUrls.slice(0, 4).map((url, i) => (
                    <div
                      key={i}
                      className="w-16 h-16 rounded-lg overflow-hidden bg-muted border"
                    >
                      {url.match(/\.(mp4|mov|webm|avi)/i) ? (
                        <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sourceType === "existing" && (
              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground mb-1">Tu texto actual:</p>
                <p className="text-sm line-clamp-4">{currentCopy || "Sin texto"}</p>
              </div>
            )}

            {/* Options (for prompt and vision) */}
            {sourceType !== "existing" && (
              <>
                {/* Versions */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Versiones</Label>
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

                {/* Advanced settings toggle */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSettings ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Opciones avanzadas
                </button>

                {showSettings && (
                  <div className="space-y-3 animate-in slide-in-from-top-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Símbolos máx</Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {maxChars}
                        </span>
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

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Agregar hashtags</Label>
                      <Switch checked={includeHashtags} onCheckedChange={setIncludeHashtags} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Usar emojis</Label>
                      <Switch checked={includeEmojis} onCheckedChange={setIncludeEmojis} />
                    </div>

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
              </>
            )}

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                (sourceType === "prompt" && !prompt.trim()) ||
                (sourceType === "vision" && !mediaUrls?.length) ||
                (sourceType === "existing" && !currentCopy?.trim())
              }
              className="w-full gradient-primary text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {sourceType === "vision" ? "Analizando media..." : "Generando..."}
                </>
              ) : (
                <>
                  {sourceType === "vision" ? (
                    <ScanEye className="h-4 w-4 mr-2" />
                  ) : sourceType === "existing" ? (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {sourceType === "existing" ? "Ir a refinar" : "Generar"}
                </>
              )}
            </Button>

            {/* Generated versions — SELECT one */}
            {generatedVersions.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  Selecciona una versión ({generatedVersions.length})
                </Label>
                {generatedVersions.map((text, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectVersion(i)}
                    className={cn(
                      "relative group border rounded-lg p-3 text-sm leading-relaxed cursor-pointer transition-all",
                      selectedIndex === i
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    {/* Selection indicator */}
                    <div className="absolute top-2 left-2">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          selectedIndex === i
                            ? "border-primary bg-primary text-white"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedIndex === i && <Check className="h-3 w-3" />}
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap pl-7 pr-6">{text}</p>

                    {/* Copy button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(text, i);
                        }}
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
                  </div>
                ))}

                {selectedIndex !== null && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        onInsert(selectedCopy);
                        toast({ title: "Copy insertado" });
                      }}
                    >
                      Insertar directo
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gradient-primary text-white"
                      onClick={() => setStep(2)}
                    >
                      Refinar <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
           STEP 2: REFINE — Improve selected copy
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 2 && selectedCopy && (
          <>
            {/* Current copy display */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-[10px] text-primary font-medium uppercase tracking-wider mb-1">
                Copy seleccionado
              </p>
              <p className="text-sm leading-relaxed">{selectedCopy}</p>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Aplica mejoras opcionales a tu copy 👇
            </p>

            {/* Refine: Make more impactful */}
            <div className="space-y-2 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-semibold">Hacer más impactante</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Transforma frases genéricas en anécdotas o preguntas provocativas
              </p>
              <Button
                onClick={() => refineMutation.mutate({ copy: selectedCopy, clientId })}
                disabled={refineMutation.isLoading}
                variant="outline"
                className="w-full"
              >
                {refineMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {refineMutation.isLoading ? "Refinando..." : "Refinar"}
              </Button>
              {refinedCopy && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm mb-2 leading-relaxed">{refinedCopy}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUseRefined(refinedCopy)}
                  >
                    <Check className="h-3 w-3 mr-1" /> Usar esta versión
                  </Button>
                </div>
              )}
            </div>

            {/* Refine: SEO Enrichment */}
            <div className="space-y-2 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-semibold">Enriquecer SEO</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Inserta keywords relevantes de forma natural
              </p>
              <input
                type="text"
                placeholder="Tema (ej: producto ecológico, tech, fitness)"
                value={seoTheme}
                onChange={(e) => setSeoTheme(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              />
              <Button
                onClick={() =>
                  enrichSeoMutation.mutate({
                    copy: selectedCopy,
                    hashtags: hashtagsInCopy,
                    theme: seoTheme,
                    network: network || "INSTAGRAM",
                  })
                }
                disabled={!seoTheme.trim() || enrichSeoMutation.isLoading}
                variant="outline"
                className="w-full"
              >
                {enrichSeoMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {enrichSeoMutation.isLoading ? "Enriqueciendo..." : "Enriquecer"}
              </Button>
              {seoResult && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                  <div>
                    <p className="text-[10px] text-blue-600 font-medium mb-0.5">Copy mejorado:</p>
                    <p className="text-sm leading-relaxed">{seoResult.enrichedCopy}</p>
                  </div>
                  {seoResult.enrichedHashtags && (
                    <div>
                      <p className="text-[10px] text-blue-600 font-medium mb-0.5">Hashtags SEO:</p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {seoResult.enrichedHashtags}
                      </p>
                    </div>
                  )}
                  {seoResult.seoAnalysis?.placementScore && (
                    <p className="text-[10px] text-muted-foreground">
                      Score SEO: {Math.round(seoResult.seoAnalysis.placementScore * 100)}%
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const enriched = seoResult.enrichedHashtags
                        ? `${seoResult.enrichedCopy}\n\n${seoResult.enrichedHashtags}`
                        : seoResult.enrichedCopy;
                      handleUseRefined(enriched);
                    }}
                  >
                    <Check className="h-3 w-3 mr-1" /> Usar copy + hashtags SEO
                  </Button>
                </div>
              )}
            </div>

            {/* Refine: Authenticity Check */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                <h4 className="text-sm font-semibold">Verificar autenticidad</h4>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Compara contra el Kit de Marca y Brochure del cliente
              </p>
              <Button
                onClick={() =>
                  checkAuthenticityMutation.mutate({
                    copy: selectedCopy,
                    clientId: clientId || "",
                  })
                }
                disabled={!clientId || checkAuthenticityMutation.isLoading}
                variant="outline"
                className="w-full"
              >
                {checkAuthenticityMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Target className="h-4 w-4 mr-2" />
                )}
                {checkAuthenticityMutation.isLoading ? "Analizando..." : "Verificar"}
              </Button>
              {!clientId && (
                <p className="text-[10px] text-amber-600">
                  Selecciona un cliente primero para verificar autenticidad
                </p>
              )}
              {authenticityResult && (
                <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Match con tu marca:</span>
                    <span
                      className={cn(
                        "text-lg font-bold",
                        authenticityResult.matchScore >= 75
                          ? "text-green-600"
                          : authenticityResult.matchScore >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                      )}
                    >
                      {authenticityResult.matchScore}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{authenticityResult.analysis}</p>
                  {authenticityResult.suggestions?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium mb-1">Sugerencias:</p>
                      <ul className="text-[11px] text-muted-foreground space-y-0.5">
                        {authenticityResult.suggestions.map((s: string, i: number) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="h-3 w-3 mr-1" /> Volver
              </Button>
              <Button
                size="sm"
                className="flex-1 gradient-primary text-white"
                onClick={() => setStep(3)}
              >
                Revisar <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
           STEP 3: REVIEW & INSERT
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 3 && selectedCopy && (
          <>
            <div className="text-center space-y-1 pb-3">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
              <h4 className="text-sm font-semibold">Copy listo</h4>
              <p className="text-[11px] text-muted-foreground">
                Revisa tu copy final antes de insertarlo
              </p>
            </div>

            {/* Final copy display */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {copyWithoutHashtags}
              </p>
            </div>

            {/* Hashtags (editable) */}
            {hashtagsInCopy && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3 text-blue-500" />
                  <Label className="text-xs font-medium">Hashtags detectados</Label>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">{hashtagsInCopy}</p>
              </div>
            )}

            {/* Character count */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{selectedCopy.length} caracteres</span>
              {network === "X" && selectedCopy.length > 280 && (
                <span className="text-red-500 font-medium">⚠️ Excede 280 chars para X</span>
              )}
            </div>

            {/* Action buttons */}
            <Button onClick={handleInsert} className="w-full gradient-primary text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Insertar en publicación
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(2)} className="flex-1">
                <ArrowLeft className="h-3 w-3 mr-1" /> Refinar más
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleCopy(selectedCopy, 999);
                }}
                className="flex-1"
              >
                {copiedIndex === 999 ? (
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                Copiar
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep(1);
                setGeneratedVersions([]);
                setSelectedCopy("");
                setSelectedIndex(null);
                setRefinedCopy("");
                setSeoResult(null);
                setAuthenticityResult(null);
              }}
              className="w-full text-xs text-muted-foreground"
            >
              Empezar de nuevo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
