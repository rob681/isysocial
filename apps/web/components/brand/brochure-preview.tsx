"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Palette, Type, Target, Briefcase } from "lucide-react";

interface BrochurePreviewProps {
  sessionId: string;
  onConfirm: () => void;
  onBack: () => void;
}

interface ColorEntry {
  label: string;
  value: string;
  usage: string;
}

interface TypographyEntry {
  family: string;
  weights: number[];
  size: string;
}

interface TypographySet {
  heading?: TypographyEntry;
  body?: TypographyEntry;
  accent?: TypographyEntry;
}

interface SchemaField {
  fieldId: string;
  label: string;
  type: string;
  category: string;
  suggestedValue?: string | null;
  confidence?: number | null;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  identity: { label: "Identidad", icon: Palette },
  communication: { label: "Comunicacion", icon: Type },
  strategy: { label: "Estrategia", icon: Target },
  assets: { label: "Recursos", icon: Briefcase },
};

function tryParseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function ColorSwatches({ colors }: { colors: ColorEntry[] }) {
  if (!colors.length) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div
            className="w-14 h-14 rounded-lg border border-input shadow-sm"
            style={{ backgroundColor: color.value }}
          />
          <span className="text-xs font-medium truncate max-w-[60px]">
            {color.label || color.value}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5">
            {color.usage}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function TypographyPreview({ typography }: { typography: TypographySet }) {
  const sections: { key: string; label: string; entry?: TypographyEntry }[] = [
    { key: "heading", label: "Encabezados", entry: typography.heading },
    { key: "body", label: "Cuerpo", entry: typography.body },
    { key: "accent", label: "Acento", entry: typography.accent },
  ];

  return (
    <div className="space-y-4">
      {sections.map(
        ({ key, label, entry }) =>
          entry?.family && (
            <div key={key} className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">
                {label}
              </p>
              <p
                className="text-lg"
                style={{ fontFamily: `"${entry.family}", sans-serif` }}
              >
                {entry.family} — Tamano base: {entry.size}
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.weights.map((w) => (
                  <span
                    key={w}
                    className="text-sm px-2 py-0.5 rounded bg-muted"
                    style={{
                      fontFamily: `"${entry.family}", sans-serif`,
                      fontWeight: w,
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}

export function BrochurePreview({
  sessionId,
  onConfirm,
  onBack,
}: BrochurePreviewProps) {
  const { data, isLoading, error } = trpc.brandBrochure.getFieldSchema.useQuery(
    { sessionId },
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>Error al cargar vista previa: {error.message}</p>
      </div>
    );
  }

  // Merge schema fields (with type info) and DB fields (with values)
  const fields: SchemaField[] = (() => {
    if (!data) return [];
    const schemaFields = (data.schema?.fields ?? []) as Array<{
      id: string; label: string; type: string; category: string;
      suggestedValue?: unknown; confidence?: number;
    }>;
    const dbFieldMap = new Map(
      (data.fields ?? []).map((f) => [f.fieldId, f])
    );
    return schemaFields.map((sf) => {
      const dbField = dbFieldMap.get(sf.id);
      return {
        fieldId: sf.id,
        label: sf.label,
        type: sf.type,
        category: sf.category || "identity",
        suggestedValue: dbField?.clientValue ?? dbField?.suggestedValue ?? (sf.suggestedValue != null ? (typeof sf.suggestedValue === "string" ? sf.suggestedValue : JSON.stringify(sf.suggestedValue)) : null),
        confidence: dbField?.confidence ?? sf.confidence ?? null,
      };
    });
  })();

  // Group by category
  const grouped: Record<string, SchemaField[]> = {};
  for (const field of fields) {
    const cat = field.category || "identity";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(field);
  }

  // Find special fields for highlighted display
  const findField = (id: string) => fields.find((f) => f.fieldId === id);
  const taglineField = findField("tagline") || findField("slogan");
  const missionField = findField("mission") || findField("mision");

  // Extract color and typography fields
  const colorFields = fields.filter((f) => f.type === "multi-color");
  const typographyFields = fields.filter((f) => f.type === "multi-typography");
  const singleColorFields = fields.filter((f) => f.type === "color");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Vista Previa de tu Marca</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa los datos de tu marca antes de guardar.
        </p>
      </div>

      {/* Tagline highlight */}
      {taglineField?.suggestedValue && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
          <p className="text-2xl font-bold text-primary">
            {taglineField.suggestedValue}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Tagline</p>
        </div>
      )}

      {/* Color swatches */}
      {(colorFields.length > 0 || singleColorFields.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Paleta de Colores
          </h3>
          {colorFields.map((field) => {
            const parsed = tryParseJson(field.suggestedValue);
            const colors = Array.isArray(parsed) ? (parsed as ColorEntry[]) : [];
            return (
              <div key={field.fieldId}>
                <ColorSwatches colors={colors} />
              </div>
            );
          })}
          {singleColorFields.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {singleColorFields.map((field) => (
                <div key={field.fieldId} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-14 h-14 rounded-lg border border-input shadow-sm"
                    style={{ backgroundColor: field.suggestedValue || "#ccc" }}
                  />
                  <span className="text-xs font-medium">{field.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Typography */}
      {typographyFields.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Type className="h-4 w-4" />
            Tipografia
          </h3>
          {typographyFields.map((field) => {
            const parsed = tryParseJson(field.suggestedValue);
            if (!parsed || typeof parsed !== "object") return null;
            return (
              <TypographyPreview
                key={field.fieldId}
                typography={parsed as TypographySet}
              />
            );
          })}
        </div>
      )}

      {/* Mission highlight */}
      {missionField?.suggestedValue && (
        <div className="bg-muted/50 border rounded-lg p-5">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Mision
          </p>
          <p className="text-sm leading-relaxed italic">
            {missionField.suggestedValue}
          </p>
        </div>
      )}

      <Separator />

      {/* All fields by category */}
      {Object.keys(CATEGORY_META)
        .filter((cat) => grouped[cat]?.length)
        .map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          const catFields = grouped[cat].filter(
            (f) =>
              f.type !== "multi-color" &&
              f.type !== "multi-typography" &&
              f.type !== "color" &&
              f.fieldId !== taglineField?.fieldId &&
              f.fieldId !== missionField?.fieldId
          );

          if (!catFields.length) return null;

          return (
            <div key={cat} className="space-y-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {meta.label}
              </h3>
              <div className="grid gap-4">
                {catFields.map((field) => (
                  <div key={field.fieldId} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </p>
                    {field.type === "file" && field.suggestedValue ? (
                      <div className="border rounded-lg p-2 inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={field.suggestedValue}
                          alt={field.label}
                          className="max-h-24 rounded"
                        />
                      </div>
                    ) : (
                      <p className="text-sm">
                        {field.suggestedValue || (
                          <span className="text-muted-foreground italic">
                            Sin valor
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      <Separator />

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Editar
        </Button>
        <Button onClick={onConfirm} className="flex-1">
          <Check className="h-4 w-4 mr-2" />
          Confirmar y Guardar
        </Button>
      </div>
    </div>
  );
}
