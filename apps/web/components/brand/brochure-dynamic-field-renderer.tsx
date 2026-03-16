"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  Plus,
  Trash2,
  Upload,
  Palette,
  Type,
  Target,
  Briefcase,
} from "lucide-react";

// ---------- Types ----------

interface SchemaField {
  fieldId: string;
  label: string;
  type: "text" | "textarea" | "color" | "multi-color" | "multi-typography" | "select" | "file";
  category: "identity" | "communication" | "strategy" | "assets";
  suggestedValue?: string | null;
  confidence?: number | null;
  required?: boolean;
  options?: string[];
  maxItems?: number;
  description?: string;
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
  heading: TypographyEntry;
  body: TypographyEntry;
  accent?: TypographyEntry;
}

interface BrochureDynamicFieldRendererProps {
  sessionId: string;
  onComplete: () => void;
}

// ---------- Constants ----------

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  identity: { label: "Identidad", icon: Palette },
  communication: { label: "Comunicacion", icon: Type },
  strategy: { label: "Estrategia", icon: Target },
  assets: { label: "Recursos", icon: Briefcase },
};

const WEIGHT_OPTIONS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const USAGE_OPTIONS = [
  { value: "primary", label: "Primario" },
  { value: "secondary", label: "Secundario" },
  { value: "accent", label: "Acento" },
  { value: "background", label: "Fondo" },
];

// ---------- Helpers ----------

function parseSuggestedValue(
  type: SchemaField["type"],
  suggestedValue?: string | null
): unknown {
  if (!suggestedValue) return null;
  if (type === "multi-color" || type === "multi-typography") {
    try {
      return JSON.parse(suggestedValue);
    } catch {
      return null;
    }
  }
  return suggestedValue;
}

function getConfidenceBadge(confidence?: number | null) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const variant =
    pct >= 80 ? "default" : pct >= 50 ? "secondary" : "destructive";
  return (
    <Badge variant={variant} className="text-xs ml-2">
      {pct}%
    </Badge>
  );
}

// ---------- Sub-components ----------

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded border border-input cursor-pointer p-0.5"
      />
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="w-32 font-mono text-sm"
      />
    </div>
  );
}

function MultiColorField({
  value,
  onChange,
  maxItems,
}: {
  value: ColorEntry[];
  onChange: (v: ColorEntry[]) => void;
  maxItems?: number;
}) {
  const addColor = () => {
    if (maxItems && value.length >= maxItems) return;
    onChange([...value, { label: "", value: "#000000", usage: "primary" }]);
  };

  const removeColor = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, updates: Partial<ColorEntry>) => {
    const updated = value.map((entry, i) =>
      i === index ? { ...entry, ...updates } : entry
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {value.map((entry, index) => (
        <div
          key={index}
          className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
        >
          <input
            type="color"
            value={entry.value || "#000000"}
            onChange={(e) => updateColor(index, { value: e.target.value })}
            className="w-9 h-9 rounded border border-input cursor-pointer p-0.5 flex-shrink-0"
          />
          <Input
            value={entry.label}
            onChange={(e) => updateColor(index, { label: e.target.value })}
            placeholder="Nombre del color"
            className="flex-1 text-sm"
          />
          <Select
            value={entry.usage}
            onValueChange={(v) => updateColor(index, { usage: v })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeColor(index)}
            className="flex-shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addColor}
        disabled={maxItems != null && value.length >= maxItems}
      >
        <Plus className="h-4 w-4 mr-1" />
        Agregar Color
      </Button>
    </div>
  );
}

function TypographySection({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TypographyEntry;
  onChange: (v: TypographyEntry) => void;
}) {
  const toggleWeight = (weight: number) => {
    const weights = value.weights.includes(weight)
      ? value.weights.filter((w) => w !== weight)
      : [...value.weights, weight].sort((a, b) => a - b);
    onChange({ ...value, weights });
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Familia tipografica
          </Label>
          <Input
            value={value.family}
            onChange={(e) => onChange({ ...value, family: e.target.value })}
            placeholder="Inter, Roboto, etc."
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tamano base</Label>
          <Input
            value={value.size}
            onChange={(e) => onChange({ ...value, size: e.target.value })}
            placeholder="16px, 1rem, etc."
            className="text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Pesos</Label>
        <div className="flex flex-wrap gap-1.5">
          {WEIGHT_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => toggleWeight(w)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                value.weights.includes(w)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-muted"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MultiTypographyField({
  value,
  onChange,
}: {
  value: TypographySet;
  onChange: (v: TypographySet) => void;
}) {
  const defaultEntry: TypographyEntry = {
    family: "",
    weights: [400],
    size: "16px",
  };

  return (
    <div className="space-y-4">
      <TypographySection
        label="Encabezados (Heading)"
        value={value.heading || defaultEntry}
        onChange={(v) => onChange({ ...value, heading: v })}
      />
      <TypographySection
        label="Cuerpo (Body)"
        value={value.body || defaultEntry}
        onChange={(v) => onChange({ ...value, body: v })}
      />
      {value.accent !== undefined && (
        <TypographySection
          label="Acento (Accent)"
          value={value.accent || defaultEntry}
          onChange={(v) => onChange({ ...value, accent: v })}
        />
      )}
    </div>
  );
}

function FileField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error al subir");
      const data = await res.json();
      onChange(data.url);
    } catch {
      // Toast is handled at parent level
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate max-w-xs">{value}</span>
          <Button variant="ghost" size="icon" onClick={() => onChange("")}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      <label className="flex items-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
        <input
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {uploading ? "Subiendo..." : "Seleccionar archivo"}
        </span>
      </label>
    </div>
  );
}

// ---------- Main Component ----------

export function BrochureDynamicFieldRenderer({
  sessionId,
  onComplete,
}: BrochureDynamicFieldRendererProps) {
  const { toast } = useToast();
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = trpc.brandBrochure.getFieldSchema.useQuery(
    { sessionId },
  );

  const approveField = trpc.brandBrochure.approveField.useMutation();
  const saveAllFields = trpc.brandBrochure.saveAllFields.useMutation();
  const completeSession = trpc.brandBrochure.complete.useMutation();

  // Merge schema fields (have type, options, etc.) with DB fields (have clientValue, suggestedValue)
  const mergedFields: SchemaField[] = (() => {
    if (!data) return [];
    const schemaFields = (data.schema?.fields ?? []) as Array<{
      id: string;
      label: string;
      type: string;
      category: string;
      required?: boolean;
      hint?: string;
      maxItems?: number;
      options?: string[];
      suggestedValue?: unknown;
      confidence?: number;
    }>;
    const dbFieldMap = new Map(
      (data.fields ?? []).map((f) => [f.fieldId, f])
    );
    return schemaFields.map((sf) => {
      const dbField = dbFieldMap.get(sf.id);
      return {
        fieldId: sf.id,
        label: sf.label,
        type: sf.type as SchemaField["type"],
        category: (sf.category || "identity") as SchemaField["category"],
        required: sf.required,
        options: sf.options,
        maxItems: sf.maxItems,
        description: sf.hint,
        suggestedValue: dbField?.clientValue ?? dbField?.suggestedValue ?? (sf.suggestedValue != null ? (typeof sf.suggestedValue === "string" ? sf.suggestedValue : JSON.stringify(sf.suggestedValue)) : null),
        confidence: dbField?.confidence ?? sf.confidence ?? null,
      };
    });
  })();

  // Initialize field values from schema
  useEffect(() => {
    if (!mergedFields.length) return;
    const initial: Record<string, unknown> = {};
    for (const field of mergedFields) {
      const parsed = parseSuggestedValue(field.type, field.suggestedValue);
      if (field.type === "multi-color") {
        initial[field.fieldId] = Array.isArray(parsed)
          ? parsed
          : [{ label: "", value: "#000000", usage: "primary" }];
      } else if (field.type === "multi-typography") {
        const defaultTypo: TypographySet = {
          heading: { family: "", weights: [400, 700], size: "32px" },
          body: { family: "", weights: [400], size: "16px" },
        };
        initial[field.fieldId] =
          parsed && typeof parsed === "object" ? { ...defaultTypo, ...(parsed as object) } : defaultTypo;
      } else {
        initial[field.fieldId] = (parsed as string) || "";
      }
    }
    setFieldValues(initial);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = useCallback(
    (fieldId: string, value: unknown) => {
      setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  const handleFieldBlur = useCallback(
    async (fieldId: string) => {
      const value = fieldValues[fieldId];
      if (value === undefined) return;
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      try {
        await approveField.mutateAsync({
          sessionId,
          fieldId,
          value: stringValue,
        });
      } catch {
        // Silently fail on individual save - will be saved with "Guardar Todo"
      }
    },
    [fieldValues, sessionId, approveField]
  );

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const serialized: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldValues)) {
        serialized[key] =
          typeof value === "string" ? value : JSON.stringify(value);
      }

      await saveAllFields.mutateAsync({ sessionId, fields: serialized });
      await completeSession.mutateAsync({ sessionId });

      toast({ title: "Marca guardada exitosamente" });
      onComplete();
    } catch (err) {
      toast({
        title: "Error al guardar",
        description:
          err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group fields by category
  const groupedFields: Record<string, SchemaField[]> = {};
  for (const field of mergedFields) {
    const cat = field.category || "identity";
    if (!groupedFields[cat]) groupedFields[cat] = [];
    groupedFields[cat].push(field);
  }

  const categories = Object.keys(CATEGORY_CONFIG).filter(
    (cat) => groupedFields[cat]?.length
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-destructive">
        <p>Error al cargar campos: {error.message}</p>
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>No se generaron campos de marca</p>
      </div>
    );
  }

  const renderField = (field: SchemaField) => {
    const value = fieldValues[field.fieldId];

    return (
      <div key={field.fieldId} className="space-y-2">
        <div className="flex items-center">
          <Label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {getConfidenceBadge(field.confidence)}
        </div>
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}

        {field.type === "text" && (
          <Input
            value={(value as string) || ""}
            onChange={(e) => updateField(field.fieldId, e.target.value)}
            onBlur={() => handleFieldBlur(field.fieldId)}
            placeholder={`Ingresa ${field.label.toLowerCase()}`}
          />
        )}

        {field.type === "textarea" && (
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => updateField(field.fieldId, e.target.value)}
            onBlur={() => handleFieldBlur(field.fieldId)}
            placeholder={`Ingresa ${field.label.toLowerCase()}`}
            rows={4}
            className="resize-y"
          />
        )}

        {field.type === "color" && (
          <div onBlur={() => handleFieldBlur(field.fieldId)}>
            <ColorField
              value={(value as string) || "#000000"}
              onChange={(v) => updateField(field.fieldId, v)}
            />
          </div>
        )}

        {field.type === "multi-color" && (
          <div onBlur={() => handleFieldBlur(field.fieldId)}>
            <MultiColorField
              value={(value as ColorEntry[]) || []}
              onChange={(v) => updateField(field.fieldId, v)}
              maxItems={field.maxItems}
            />
          </div>
        )}

        {field.type === "multi-typography" && (
          <div onBlur={() => handleFieldBlur(field.fieldId)}>
            <MultiTypographyField
              value={
                (value as TypographySet) || {
                  heading: { family: "", weights: [400, 700], size: "32px" },
                  body: { family: "", weights: [400], size: "16px" },
                }
              }
              onChange={(v) => updateField(field.fieldId, v)}
            />
          </div>
        )}

        {field.type === "select" && (
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => {
              updateField(field.fieldId, v);
              // Auto-save on select change
              approveField
                .mutateAsync({ sessionId, fieldId: field.fieldId, value: v })
                .catch(() => {});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una opcion..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === "file" && (
          <FileField
            value={(value as string) || ""}
            onChange={(v) => {
              updateField(field.fieldId, v);
              if (v) {
                approveField
                  .mutateAsync({ sessionId, fieldId: field.fieldId, value: v })
                  .catch(() => {});
              }
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
          {categories.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            return (
              <TabsTrigger
                key={cat}
                value={cat}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {config.label}
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {groupedFields[cat].length}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-6">
            <div className="space-y-6">
              {groupedFields[cat].map((field) => renderField(field))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Separator />

      <Button
        onClick={handleSaveAll}
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Guardar Todo
      </Button>
    </div>
  );
}
