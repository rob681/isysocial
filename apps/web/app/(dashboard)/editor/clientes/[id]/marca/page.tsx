"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Palette,
  Type,
  MessageSquare,
  FileImage,
  Target,
  Heart,
  Flag,
  ListChecks,
  Eye,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";

const TONE_LABELS: Record<string, string> = {
  formal: "Formal",
  informal: "Informal",
  playful: "Divertido",
  professional: "Profesional",
  friendly: "Amigable",
  authoritative: "Autoritario",
  conversational: "Conversacional",
};

export default function EditorBrandKitPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const { data, isLoading } = trpc.clients.getBrandKit.useQuery({ clientId });

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

  if (!data) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Marca del cliente" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">Cliente no encontrado</p>
            <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const bk = (data.brandKit as any) || {};
  const hasColors = bk.primaryColor || bk.secondaryColor || bk.accentColor;
  const hasTypography = bk.typography?.primaryFont || bk.typography?.secondaryFont;
  const hasTone = bk.toneOfVoice || bk.styleNotes;
  const hasStrategy = bk.targetAudience || bk.brandValues || bk.missionStatement || bk.doAndDonts;

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
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Brand Kit — {data.companyName}</h1>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Eye className="h-3 w-3" />
              Solo lectura
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Identidad visual y tono de comunicación del cliente
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Brand info */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Colores de marca
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasColors ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {bk.primaryColor && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Primario</p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-10 h-10 rounded-lg ring-1 ring-black/10"
                            style={{ backgroundColor: bk.primaryColor }}
                          />
                          <span className="text-sm font-mono">{bk.primaryColor}</span>
                        </div>
                      </div>
                    )}
                    {bk.secondaryColor && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Secundario</p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-10 h-10 rounded-lg ring-1 ring-black/10"
                            style={{ backgroundColor: bk.secondaryColor }}
                          />
                          <span className="text-sm font-mono">{bk.secondaryColor}</span>
                        </div>
                      </div>
                    )}
                    {bk.accentColor && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Acento</p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-10 h-10 rounded-lg ring-1 ring-black/10"
                            style={{ backgroundColor: bk.accentColor }}
                          />
                          <span className="text-sm font-mono">{bk.accentColor}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  El cliente aún no ha definido colores de marca
                </p>
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
            </CardHeader>
            <CardContent>
              {hasTypography ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bk.typography?.primaryFont && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fuente principal</p>
                      <p className="text-sm font-medium">{bk.typography.primaryFont}</p>
                    </div>
                  )}
                  {bk.typography?.secondaryFont && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fuente secundaria</p>
                      <p className="text-sm font-medium">{bk.typography.secondaryFont}</p>
                    </div>
                  )}
                  {bk.typography?.sampleText && (
                    <div className="col-span-full space-y-1">
                      <p className="text-xs text-muted-foreground">Texto de ejemplo</p>
                      <p className="text-sm italic">{bk.typography.sampleText}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin tipografía definida
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tone of Voice */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Tono de comunicación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasTone ? (
                <div className="space-y-3">
                  {bk.toneOfVoice && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Tono de voz</p>
                      <span className="inline-flex items-center text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {TONE_LABELS[bk.toneOfVoice] || bk.toneOfVoice}
                      </span>
                    </div>
                  )}
                  {bk.styleNotes && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Notas de estilo</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {bk.styleNotes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin tono definido
                </p>
              )}
            </CardContent>
          </Card>

          {/* Brand Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Estrategia de marca
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasStrategy ? (
                <div className="space-y-4">
                  {bk.targetAudience && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" /> Audiencia objetivo
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {bk.targetAudience}
                      </p>
                    </div>
                  )}
                  {bk.brandValues && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Heart className="h-3 w-3" /> Valores de marca
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {bk.brandValues}
                      </p>
                    </div>
                  )}
                  {bk.missionStatement && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Flag className="h-3 w-3" /> Misión
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {bk.missionStatement}
                      </p>
                    </div>
                  )}
                  {bk.doAndDonts && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ListChecks className="h-3 w-3" /> Do&apos;s &amp; Don&apos;ts
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {bk.doAndDonts}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin estrategia definida
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Brand Assets */}
        <div className="lg:w-[320px] flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                Assets de marca
              </CardTitle>
              <CardDescription>Logos, patrones e identidad visual</CardDescription>
            </CardHeader>
            <CardContent>
              {data.brandAssets && data.brandAssets.length > 0 ? (
                <div className="space-y-2">
                  {data.brandAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay assets subidos todavía
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
      </main>
    </div>
  );
}
