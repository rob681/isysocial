"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface BrochureFieldEditorProps {
  sessionId: string;
  onComplete: () => void;
}

interface BrandField {
  fieldId: string;
  label: string;
  suggestedValue: string | null;
  confidence?: number | null;
}

export function BrochureFieldEditor({ sessionId, onComplete }: BrochureFieldEditorProps) {
  const { toast } = useToast();
  const [fields, setFields] = useState<BrandField[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const getFieldSuggestions = trpc.brandBrochure.getFieldSuggestions.useQuery(
    { sessionId },
    {
      onSuccess: (data) => {
        if (data.fields) {
          setFields(data.fields);
          // Initialize edit values with suggested values
          const initial: Record<string, string> = {};
          data.fields.forEach((f: BrandField) => {
            initial[f.fieldId] = f.suggestedValue || "";
          });
          setEditValues(initial);
        }
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    }
  );

  const approveField = trpc.brandBrochure.approveField.useMutation({
    onSuccess: () => {
      toast({ title: "Campo guardado" });
      setEditingField(null);
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const completeSession = trpc.brandBrochure.complete.useMutation({
    onSuccess: () => {
      toast({ title: "Brochure completado exitosamente" });
      onComplete();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleApprove = async (fieldId: string) => {
    const value = editValues[fieldId];
    if (!value) {
      toast({ title: "Por favor completa este campo", variant: "default" });
      return;
    }

    await approveField.mutateAsync({
      sessionId,
      fieldId,
      value,
    });
  };

  const handleComplete = async () => {
    // Approve all remaining fields before completing
    const unapprovedFields = fields.filter((f) => !editValues[f.fieldId]);
    if (unapprovedFields.length > 0) {
      toast({ title: "Por favor completa todos los campos", variant: "default" });
      return;
    }

    await completeSession.mutateAsync({ sessionId });
  };

  const toggleExpanded = (fieldId: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId);
    } else {
      newExpanded.add(fieldId);
    }
    setExpandedFields(newExpanded);
  };

  if (getFieldSuggestions.isLoading) {
    return (
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Generando tus campos de marca...</p>
        </div>
      </CardContent>
    );
  }

  if (!fields.length) {
    return (
      <CardContent className="py-6 text-center text-muted-foreground">
        <p>No se pudieron generar campos de marca</p>
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-lg">Revisa y Edita Tu Marca</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Nuestro sistema sugirió estos campos basado en tus respuestas. Puedes editarlos según lo necesites.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div
            key={field.fieldId}
            className="border rounded-lg p-4 space-y-3"
          >
            {/* Field Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{field.label}</h3>
                  {field.confidence && field.confidence >= 0.8 && (
                    <Badge variant="default" className="text-xs">
                      ✓ Recomendado
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggleExpanded(field.fieldId)}
                className="text-muted-foreground hover:text-foreground"
              >
                {expandedFields.has(field.fieldId) ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Field Content */}
            {expandedFields.has(field.fieldId) && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Sugerencia de IA
                  </label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">
                    {field.suggestedValue}
                  </p>
                </div>

                {editingField === field.fieldId ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Tu versión
                      </label>
                      <Textarea
                        value={editValues[field.fieldId] || ""}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            [field.fieldId]: e.target.value,
                          })
                        }
                        rows={3}
                        className="resize-none mt-1"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingField(null);
                          setEditValues({
                            ...editValues,
                            [field.fieldId]: field.suggestedValue || "",
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(field.fieldId)}
                        disabled={approveField.isPending}
                      >
                        Guardar
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(field.fieldId)}
                  >
                    Editar
                  </Button>
                )}
              </>
            )}
          </div>
        ))}

        {/* Complete Button */}
        <Button
          onClick={handleComplete}
          disabled={completeSession.isPending}
          className="w-full mt-6"
        >
          {completeSession.isPending && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Completar Brochure
        </Button>
      </CardContent>
    </>
  );
}
