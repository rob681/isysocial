"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  ArrowLeft,
  Palette,
  Type,
  MessageSquare,
  FileImage,
  Save,
  Trash2,
  Upload,
  Target,
  Heart,
  Flag,
  ListChecks,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Topbar } from "@/components/layout/topbar";

const TONE_OPTIONS = [
  { value: "formal", label: "Formal" },
  { value: "informal", label: "Informal" },
  { value: "playful", label: "Divertido" },
  { value: "professional", label: "Profesional" },
  { value: "friendly", label: "Amigable" },
  { value: "authoritative", label: "Autoritario" },
  { value: "conversational", label: "Conversacional" },
];

export default function BrandKitPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clientId = params.id as string;
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.clients.getBrandKit.useQuery({ clientId });

  // Local form state
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [primaryFont, setPrimaryFont] = useState("");
  const [secondaryFont, setSecondaryFont] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState<string>("");
  const [styleNotes, setStyleNotes] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandValues, setBrandValues] = useState("");
  const [missionStatement, setMissionStatement] = useState("");
  const [doAndDonts, setDoAndDonts] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form from data
  if (data && !initialized) {
    const bk = (data.brandKit as any) || {};
    setPrimaryColor(bk.primaryColor || "");
    setSecondaryColor(bk.secondaryColor || "");
    setAccentColor(bk.accentColor || "");
    setPrimaryFont(bk.typography?.primaryFont || "");
    setSecondaryFont(bk.typography?.secondaryFont || "");
    setSampleText(bk.typography?.sampleText || "");
    setToneOfVoice(bk.toneOfVoice || "");
    setStyleNotes(bk.styleNotes || "");
    setTargetAudience(bk.targetAudience || "");
    setBrandValues(bk.brandValues || "");
    setMissionStatement(bk.missionStatement || "");
    setDoAndDonts(bk.doAndDonts || "");
    setInitialized(true);
  }

  const updateBrandKit = trpc.clients.updateBrandKit.useMutation({
    onSuccess: () => {
      toast({ title: "Brand Kit guardado" });
      utils.clients.getBrandKit.invalidate({ clientId });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeBrandAsset = trpc.clients.removeBrandAsset.useMutation({
    onSuccess: () => {
      toast({ title: "Asset eliminado" });
      utils.clients.getBrandKit.invalidate({ clientId });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    updateBrandKit.mutate({
      clientId,
      primaryColor: primaryColor || undefined,
      secondaryColor: secondaryColor || undefined,
      accentColor: accentColor || undefined,
      typography: {
        primaryFont: primaryFont || undefined,
        secondaryFont: secondaryFont || undefined,
        sampleText: sampleText || undefined,
      },
      toneOfVoice: (toneOfVoice || null) as any,
      styleNotes: styleNotes || undefined,
      targetAudience: targetAudience || undefined,
      brandValues: brandValues || undefined,
      missionStatement: missionStatement || undefined,
      doAndDonts: doAndDonts || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Marca del cliente" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="space-y-6 max-w-4xl">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Marca del cliente" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Brand Kit — {data?.companyName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define la identidad visual y tono de comunicación del cliente
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: colors, typography, tone */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Colores de marca
              </CardTitle>
              <CardDescription>Paleta de colores principal del cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Color primario</Label>
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
                <div className="space-y-2">
                  <Label>Color secundario</Label>
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
                <div className="space-y-2">
                  <Label>Color de acento</Label>
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

              {/* Color preview */}
              {(primaryColor || secondaryColor || accentColor) && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs text-muted-foreground">Vista previa:</span>
                  {primaryColor && (
                    <div className="w-10 h-10 rounded-lg ring-1 ring-black/10" style={{ backgroundColor: primaryColor }} title="Primario" />
                  )}
                  {secondaryColor && (
                    <div className="w-10 h-10 rounded-lg ring-1 ring-black/10" style={{ backgroundColor: secondaryColor }} title="Secundario" />
                  )}
                  {accentColor && (
                    <div className="w-10 h-10 rounded-lg ring-1 ring-black/10" style={{ backgroundColor: accentColor }} title="Acento" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Type className="h-4 w-4" />
                Tipografía
              </CardTitle>
              <CardDescription>Fuentes utilizadas en la comunicación del cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fuente principal</Label>
                  <Input
                    value={primaryFont}
                    onChange={(e) => setPrimaryFont(e.target.value)}
                    placeholder="Ej: Montserrat, Inter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fuente secundaria</Label>
                  <Input
                    value={secondaryFont}
                    onChange={(e) => setSecondaryFont(e.target.value)}
                    placeholder="Ej: Open Sans, Roboto"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Texto de ejemplo</Label>
                <Input
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  placeholder="Frase clave que represente la marca"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tone of Voice */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Tono de comunicación
              </CardTitle>
              <CardDescription>Cómo habla la marca en redes sociales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tono de voz</Label>
                <Select value={toneOfVoice || "__none__"} onValueChange={(v) => setToneOfVoice(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tono" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin definir</SelectItem>
                    {TONE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas de estilo</Label>
                <Textarea
                  value={styleNotes}
                  onChange={(e) => setStyleNotes(e.target.value)}
                  placeholder="Guías adicionales de estilo, frases a evitar, referencias de marca..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Brand Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Estrategia de marca
              </CardTitle>
              <CardDescription>Audiencia, valores y misión del cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  Audiencia objetivo
                </Label>
                <Textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Describe el público objetivo: edad, intereses, ubicación, comportamiento..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                  Valores de marca
                </Label>
                <Textarea
                  value={brandValues}
                  onChange={(e) => setBrandValues(e.target.value)}
                  placeholder="Valores fundamentales: innovación, confianza, calidad..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                  Misión de la marca
                </Label>
                <Textarea
                  value={missionStatement}
                  onChange={(e) => setMissionStatement(e.target.value)}
                  placeholder="La misión de la marca en una o dos oraciones..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                  Que hacer y que no (Do&apos;s &amp; Don&apos;ts)
                </Label>
                <Textarea
                  value={doAndDonts}
                  onChange={(e) => setDoAndDonts(e.target.value)}
                  placeholder={"Do's:\n- Usar lenguaje cercano\n- Incluir CTAs claros\n\nDon'ts:\n- Nunca usar jerga técnica\n- Evitar colores neón"}
                  rows={6}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateBrandKit.isLoading}>
              {updateBrandKit.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Brand Kit
            </Button>
          </div>
        </div>

        {/* Right: Brand Assets */}
        <div className="lg:w-[320px] flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                Assets de marca
              </CardTitle>
              <CardDescription>Logos, patrones, y archivos de identidad visual</CardDescription>
            </CardHeader>
            <CardContent>
              {data?.brandAssets && data.brandAssets.length > 0 ? (
                <div className="space-y-2">
                  {data.brandAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group">
                      <div className="w-10 h-10 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {asset.mimeType.startsWith("image/") ? (
                          <img src={asset.fileUrl} alt={asset.label} className="w-full h-full object-cover" />
                        ) : (
                          <FileImage className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{asset.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{asset.fileName}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("¿Eliminar este asset?")) {
                            removeBrandAsset.mutate({ assetId: asset.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay assets subidos todavía
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                Sube assets desde la sección de archivos del cliente (próximamente).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
      </main>
    </div>
  );
}
