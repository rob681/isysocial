"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { BrochureGuidedQuestionnaire } from "@/components/brand/brochure-guided-questionnaire";
import { BrochureFieldEditor } from "@/components/brand/brochure-field-editor";
import { BrochureProgress } from "@/components/brand/brochure-progress";

export default function BrandBrochureGuidedPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<"questionnaire" | "fields" | "complete">("questionnaire");
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

  // Initialize session on mount
  useEffect(() => {
    initiate.mutate();
  }, []);

  if (!sessionId) {
    return (
      <div className="flex flex-col flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Preparando tu brochure guiado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 lg:p-8">
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
            <p className="text-sm text-muted-foreground">Guía paso a paso para completar tu identidad de marca</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <BrochureProgress
          currentStep={currentStep}
          isComplete={currentStep === "complete"}
        />

        {/* Content Area */}
        <Card>
          {currentStep === "questionnaire" && (
            <BrochureGuidedQuestionnaire
              sessionId={sessionId}
              initialQuestions={initialQuestions}
              onComplete={() => setCurrentStep("fields")}
            />
          )}

          {currentStep === "fields" && (
            <BrochureFieldEditor
              sessionId={sessionId}
              onComplete={() => setCurrentStep("complete")}
            />
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
      </div>
    </div>
  );
}
