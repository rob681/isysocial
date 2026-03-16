"use client";

import { CheckCircle2, Circle } from "lucide-react";

interface BrochureProgressProps {
  currentStep: "questionnaire" | "fields" | "complete";
  isComplete: boolean;
}

export function BrochureProgress({ currentStep, isComplete }: BrochureProgressProps) {
  const steps = [
    { id: "questionnaire", label: "Preguntas" },
    { id: "fields", label: "Campos de Marca" },
    { id: "complete", label: "Completo" },
  ];

  const getStepIndex = (step: string) => steps.findIndex((s) => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = isComplete || index < currentIndex;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle
                  className={`h-5 w-5 flex-shrink-0 ${
                    isActive ? "text-primary fill-primary" : "text-muted-foreground"
                  }`}
                />
              )}
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? "text-foreground"
                    : isCompleted
                    ? "text-muted-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded-full ${
                  isCompleted ? "bg-green-500" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
