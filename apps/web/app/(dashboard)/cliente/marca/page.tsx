"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Palette,
  Type,
  MessageSquare,
  FileImage,
  Printer,
  Target,
  Heart,
  Flag,
  ListChecks,
  Save,
  Loader2,
  Upload,
  Trash2,
  Megaphone,
  Sparkles,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIBrandAssistant } from "@/components/brand/ai-brand-assistant";
import { Topbar } from "@/components/layout/topbar";

// ─── Constants ────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "playful", label: "Divertido" },
  { value: "professional", label: "Profesional" },
  { value: "friendly", label: "Amigable" },
  { value: "authoritative", label: "Autoritario" },
  { value: "conversational", label: "Conversacional" },
];

// ─── Guided Section Wrapper ───────────────────────────────────────────────

function GuidedSection({
  number,
  title,
  icon: Icon,
  description,
  children,
}: {
  number: number;
  title: string;
  icon: React.ElementType;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden print:shadow-none print:break-inside-avoid">
      <div className="px-6 py-5 border-b bg-muted/30 print:bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
            {number}
          </div>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 ml-11">
          {description}
        </p>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

// ─── Question Block ───────────────────────────────────────────────────────

function QuestionBlock({
  question,
  hint,
  children,
}: {
  question: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{question}</p>
      {hint && (
        <p className="text-xs text-muted-foreground -mt-1">{hint}</p>
      )}
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ClienteBrandKitPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const clientProfileId = (session?.user as any)?.clientProfileId as
    | string
    | undefined;
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ──
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [primaryFont, setPrimaryFont] = useState("");
  const [secondaryFont, setSecondaryFont] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState<string>("");
  const [styleNotes, setStyleNotes] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandValues, setBrandValues] = useState("");
  const [missionStatement, setMissionStatement] = useState("");
  const [doAndDonts, setDoAndDonts] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // ── Queries & mutations ──
  const { data, isLoading } = trpc.clients.getBrandKit.useQuery(
    { clientId: clientProfileId! },
    { enabled: !!clientProfileId }
  );

  const updateBrandKit = trpc.clients.updateBrandKit.useMutation({
    onSuccess: () => {
      toast({ title: "Tu marca ha sido guardada" });
      utils.clients.getBrandKit.invalidate({ clientId: clientProfileId! });
    },
    onError: (err) =>
      toast({
        title: "Error al guardar",
        description: err.message,
        variant: "destructive",
      }),
  });

  const addBrandAsset = trpc.clients.addBrandAsset.useMutation({
    onSuccess: () => {
      toast({ title: "Archivo subido correctamente" });
      utils.clients.getBrandKit.invalidate({ clientId: clientProfileId! });
    },
    onError: (err) =>
      toast({
        title: "Error al subir archivo",
        description: err.message,
        variant: "destructive",
      }),
  });

  const removeBrandAsset = trpc.clients.removeBrandAsset.useMutation({
    onSuccess: () => {
      toast({ title: "Archivo eliminado" });
      utils.clients.getBrandKit.invalidate({ clientId: clientProfileId! });
    },
    onError: (err) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  // ── Initialize form from data ──
  if (data && !initialized) {
    const bk = (data.brandKit as any) || {};
    setPrimaryColor(bk.primaryColor || "");
    setSecondaryColor(bk.secondaryColor || "");
    setAccentColor(bk.accentColor || "");
    setPrimaryFont(bk.typography?.primaryFont || "");
    setSecondaryFont(bk.typography?.secondaryFont || "");
    setToneOfVoice(bk.toneOfVoice || "");
    setStyleNotes(bk.styleNotes || "");
    setTargetAudience(bk.targetAudience || "");
    setBrandValues(bk.brandValues || "");
    setMissionStatement(bk.missionStatement || "");
    setDoAndDonts(bk.doAndDonts || "");
    setInitialized(true);
  }

  // ── Handlers ──
  const handleSave = () => {
    if (!clientProfileId) return;
    updateBrandKit.mutate({
      clientId: clientProfileId,
      primaryColor: primaryColor || undefined,
      secondaryColor: secondaryColor || undefined,
      accentColor: accentColor || undefined,
      typography: {
        primaryFont: primaryFont || undefined,
        secondaryFont: secondaryFont || undefined,
      },
      toneOfVoice: (toneOfVoice || null) as any,
      styleNotes: styleNotes || undefined,
      targetAudience: targetAudience || undefined,
      brandValues: brandValues || undefined,
      missionStatement: missionStatement || undefined,
      doAndDonts: doAndDonts || undefined,
    });
  };

  const uploadFile = useCallback(
    async (file: File) => {
      if (!clientProfileId) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "brand-assets");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al subir");
        }
        const result = await res.json();
        // Derive label from file name (without extension)
        const label =
          file.name.replace(/\.[^/.]+$/, "").substring(0, 60) || "Asset";
        await addBrandAsset.mutateAsync({
          clientId: clientProfileId,
          label,
          fileName: result.fileName,
          fileUrl: result.url,
          storagePath: result.storagePath,
          mimeType: result.mimeType,
          fileSize: result.fileSize,
        });
      } catch (err: any) {
        toast({
          title: "Error al subir archivo",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [clientProfileId, addBrandAsset, toast]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(uploadFile);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files) {
        Array.from(files).forEach(uploadFile);
      }
    },
    [uploadFile]
  );

  // ── Loading state ──
  if (isLoading || !data) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Tu marca" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="space-y-6 max-w-3xl mx-auto">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-[200px] w-full rounded-2xl" />
            <Skeleton className="h-[200px] w-full rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Tu marca" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
    <div className="max-w-3xl mx-auto pb-12 print:pb-0 print:max-w-none">
      {/* ──── Page Header ──── */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Mi Marca
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Completa la informacion de tu marca para que tu equipo cree mejor
              contenido
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiAssistantOpen(true)}
              className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950/30"
            >
              <Sparkles className="h-4 w-4" />
              Asistente IA
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Descargar guia
            </Button>
          </div>
        </div>
      </div>

      {/* ──── Guided Sections ──── */}
      <div className="space-y-6">
        {/* ── Section 1: Tu Marca ── */}
        <GuidedSection
          number={1}
          title="Tu Marca"
          icon={Palette}
          description="Define los colores y tipografia que representan tu marca"
        >
          <QuestionBlock
            question="Cuales son los colores principales de tu marca?"
            hint="Puedes usar el selector de color o escribir el codigo hexadecimal"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Primario</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={primaryColor || "#ffffff"}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Secundario</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={secondaryColor || "#ffffff"}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#10b981"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Acento</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={accentColor || "#ffffff"}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#f59e0b"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            {/* Color preview bar */}
            {(primaryColor || secondaryColor || accentColor) && (
              <div className="flex rounded-xl overflow-hidden h-3 mt-2 shadow-inner">
                {primaryColor && (
                  <div className="flex-1" style={{ backgroundColor: primaryColor }} />
                )}
                {secondaryColor && (
                  <div className="flex-1" style={{ backgroundColor: secondaryColor }} />
                )}
                {accentColor && (
                  <div className="flex-1" style={{ backgroundColor: accentColor }} />
                )}
              </div>
            )}
          </QuestionBlock>

          <QuestionBlock
            question="Que tipografia usa tu marca?"
            hint="Escribe el nombre de las fuentes que utiliza tu marca"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                value={primaryFont}
                onChange={(e) => setPrimaryFont(e.target.value)}
                placeholder="Fuente principal, ej: Montserrat"
              />
              <Input
                value={secondaryFont}
                onChange={(e) => setSecondaryFont(e.target.value)}
                placeholder="Fuente secundaria, ej: Open Sans"
              />
            </div>
          </QuestionBlock>
        </GuidedSection>

        {/* ── Section 2: Comunicacion ── */}
        <GuidedSection
          number={2}
          title="Comunicacion"
          icon={Megaphone}
          description="Define como habla tu marca en redes sociales"
        >
          <QuestionBlock question="Como describirias el tono de tu marca?">
            <Select value={toneOfVoice || ""} onValueChange={setToneOfVoice}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tono" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </QuestionBlock>

          <QuestionBlock
            question="Hay algo mas que debamos saber sobre tu estilo de comunicacion?"
            hint="Frases frecuentes, hashtags, emojis preferidos, referencias de estilo..."
          >
            <Textarea
              value={styleNotes}
              onChange={(e) => setStyleNotes(e.target.value)}
              placeholder="Ej: Usamos emojis en todas las publicaciones, siempre cerramos con un call-to-action..."
              rows={4}
              className="resize-none"
            />
          </QuestionBlock>
        </GuidedSection>

        {/* ── Section 3: Estrategia ── */}
        <GuidedSection
          number={3}
          title="Estrategia"
          icon={Target}
          description="Ayudanos a entender tu marca para crear contenido alineado"
        >
          <QuestionBlock
            question="Cual es la mision de tu empresa?"
            hint="En una o dos oraciones, que hace tu empresa y por que existe"
          >
            <Textarea
              value={missionStatement}
              onChange={(e) => setMissionStatement(e.target.value)}
              placeholder="Ej: Conectamos a las personas con experiencias gastronomicas unicas..."
              rows={3}
              className="resize-none"
            />
          </QuestionBlock>

          <QuestionBlock
            question="Quien es tu audiencia objetivo?"
            hint="Edad, ubicacion, intereses, comportamiento de compra"
          >
            <Textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Ej: Mujeres de 25-40 anos, profesionistas, interesadas en bienestar y estilo de vida..."
              rows={3}
              className="resize-none"
            />
          </QuestionBlock>

          <QuestionBlock
            question="Cuales son los valores de tu marca?"
            hint="Los principios que guian todo lo que hace tu marca"
          >
            <Textarea
              value={brandValues}
              onChange={(e) => setBrandValues(e.target.value)}
              placeholder="Ej: Innovacion, calidad, cercanía, sustentabilidad..."
              rows={3}
              className="resize-none"
            />
          </QuestionBlock>

          <QuestionBlock
            question="Que se debe y NO se debe hacer con tu marca?"
            hint="Guias especificas para la creacion de contenido"
          >
            <Textarea
              value={doAndDonts}
              onChange={(e) => setDoAndDonts(e.target.value)}
              placeholder={"Si:\n- Usar lenguaje cercano\n- Incluir CTAs claros\n\nNo:\n- Nunca usar jerga tecnica\n- Evitar temas politicos"}
              rows={5}
              className="resize-none"
            />
          </QuestionBlock>
        </GuidedSection>

        {/* ── Section 4: Assets de Marca ── */}
        <GuidedSection
          number={4}
          title="Assets de Marca"
          icon={FileImage}
          description="Sube tu logo, iconos, patrones y otros archivos de tu marca"
        >
          {/* Upload zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              }
            `}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  Arrastra archivos aqui o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Imagenes (JPG, PNG, SVG, WebP), videos, o PDF
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Existing assets */}
          {data.brandAssets && data.brandAssets.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {data.brandAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative rounded-xl border overflow-hidden bg-muted/10 transition-all hover:shadow-md"
                >
                  <div className="aspect-square bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-3">
                    {asset.mimeType.startsWith("image/") ? (
                      <img
                        src={asset.fileUrl}
                        alt={asset.label}
                        className="w-full h-full object-contain"
                      />
                    ) : asset.mimeType === "application/pdf" ? (
                      <FileText className="h-10 w-10 text-red-400" />
                    ) : (
                      <FileImage className="h-10 w-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-2 border-t bg-card">
                    <p className="text-xs font-medium truncate">{asset.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {asset.fileName}
                    </p>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={() => {
                      if (confirm("Eliminar este archivo?")) {
                        removeBrandAsset.mutate({ assetId: asset.id });
                      }
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </GuidedSection>

        {/* ──── Save Button ──── */}
        <div className="flex justify-end pt-2 print:hidden">
          <Button
            onClick={handleSave}
            disabled={updateBrandKit.isLoading}
            size="lg"
            className="gap-2"
          >
            {updateBrandKit.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar mi marca
          </Button>
        </div>
      </div>

      {/* ──── AI Brand Assistant ──── */}
      <AIBrandAssistant
        open={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        companyName={data?.companyName || ""}
        existingValues={{
          missionStatement,
          targetAudience,
          brandValues,
          toneOfVoice,
          styleNotes,
          doAndDonts,
        }}
        onInsert={(field, value) => {
          switch (field) {
            case "missionStatement":
              setMissionStatement(value);
              break;
            case "targetAudience":
              setTargetAudience(value);
              break;
            case "brandValues":
              setBrandValues(value);
              break;
            case "styleNotes":
              setStyleNotes(value);
              break;
            case "doAndDonts":
              setDoAndDonts(value);
              break;
            case "tagline":
              // Insert tagline into styleNotes as a suggestion
              setStyleNotes((prev) =>
                prev ? `${prev}\n\nTagline sugerido: ${value}` : `Tagline sugerido: ${value}`
              );
              break;
          }
        }}
      />

      {/* ──── PRINT STYLES ──── */}
      <style jsx global>{`
        @media print {
          nav,
          aside,
          header,
          [data-sidebar],
          [data-topbar],
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:bg-transparent {
            background: transparent !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
      </main>
    </div>
  );
}
