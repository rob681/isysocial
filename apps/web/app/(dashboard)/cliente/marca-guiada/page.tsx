"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { BrochurePathSelector } from "@/components/brand/brochure-path-selector";
import { BrochureDocumentUploader } from "@/components/brand/brochure-document-uploader";
import { BrochureGuidedQuestionnaire } from "@/components/brand/brochure-guided-questionnaire";
import { BrochureDynamicFieldRenderer } from "@/components/brand/brochure-dynamic-field-renderer";
import { BrochurePreview } from "@/components/brand/brochure-preview";
import { BrochureProgress } from "@/components/brand/brochure-progress";

type Step = "path-select" | "upload" | "questionnaire" | "fields" | "preview" | "complete";
type Path = "upload" | "qa" | null;

export default function BrandBrochureGuidedPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("path-select");
  const [selectedPath, setSelectedPath] = useState<Path>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialQuestions, setInitialQuestions] = useState<any[]>([]);

  const initiate = trpc.brandBrochure.initiate.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      if (data.questions) {
        setInitialQuestions(data.questions);
      }
      toast({ title: "Sesión iniciada" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      router.push("/cliente/marca");
    },
  });

  const generateSchema = trpc.brandBrochure.generateSchema.useMutation({
    onSuccess: () => {
      setCurrentStep("fields");
    },
    onError: (err) => {
      toast({ title: "Error al generar campos", description: err.message, variant: "destructive" });
    },
  });

  // Initialize session on mount
  useEffect(() => {
    initiate.mutate();
  }, []);

  const handlePathSelected = (path: "upload" | "qa") => {
    setSelectedPath(path);
    if (path === "upload") {
      setCurrentStep("upload");
    } else {
      setCurrentStep("questionnaire");
    }
  };

  const handleUploadComplete = () => {
    setCurrentStep("fields");
  };

  const handleQuestionnaireComplete = () => {
    if (!sessionId) return;
    generateSchema.mutate({ sessionId });
  };

  const handleFieldsComplete = () => {
    setCurrentStep("preview");
  };

  const handlePreviewConfirm = () => {
    setCurrentStep("complete");
  };

  if (!sessionId) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Brochure Guiado" />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Preparando tu brochure guiado...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Brochure Guiado" />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/cliente/marca")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Brochure de Tu Marca</h1>
            <p className="text-sm text-muted-foreground">
              Guía paso a paso para completar tu identidad de marca
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <BrochureProgress
          currentStep={currentStep}
          isComplete={currentStep === "complete"}
        />

        {/* Content Area */}
        <Card>
          {currentStep === "path-select" && (
            <CardContent className="pt-6">
              <BrochurePathSelector onSelect={handlePathSelected} />
            </CardContent>
          )}

          {currentStep === "upload" && (
            <BrochureDocumentUploader
              sessionId={sessionId}
              onExtractionComplete={handleUploadComplete}
            />
          )}

          {currentStep === "questionnaire" && (
            <BrochureGuidedQuestionnaire
              sessionId={sessionId}
              initialQuestions={initialQuestions}
              onComplete={handleQuestionnaireComplete}
            />
          )}

          {currentStep === "fields" && (
            <CardContent className="pt-6">
              <BrochureDynamicFieldRenderer
                sessionId={sessionId}
                onComplete={handleFieldsComplete}
              />
            </CardContent>
          )}

          {currentStep === "preview" && (
            <CardContent className="pt-6">
              <BrochurePreview
                sessionId={sessionId}
                onConfirm={handlePreviewConfirm}
                onBack={() => setCurrentStep("fields")}
              />
            </CardContent>
          )}

          {currentStep === "complete" && (
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">¡Brochure Completado!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Tu perfil de marca ha sido guardado exitosamente.
                </p>
              </div>
              <Button
                onClick={() => router.push("/cliente/marca")}
                className="w-full"
              >
                Ver Mi Marca
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Loading overlay for schema generation */}
        {generateSchema.isPending && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generando campos de tu marca...</p>
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
