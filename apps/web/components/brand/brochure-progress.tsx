"use client";

import { CheckCircle2, Circle } from "lucide-react";

type Step = "path-select" | "upload" | "questionnaire" | "fields" | "preview" | "complete";

interface BrochureProgressProps {
  currentStep: Step;
  isComplete: boolean;
}

const steps = [
  { id: "path-select", label: "Método" },
  { id: "info", label: "Información" },   // represents upload OR questionnaire
  { id: "fields", label: "Campos" },
  { id: "preview", label: "Revisión" },
  { id: "complete", label: "Completo" },
];

// Map the actual step to a display index
function getDisplayIndex(step: Step): number {
  if (step === "path-select") return 0;
  if (step === "upload" || step === "questionnaire") return 1;
  if (step === "fields") return 2;
  if (step === "preview") return 3;
  if (step === "complete") return 4;
  return 0;
}

export function BrochureProgress({ currentStep, isComplete }: BrochureProgressProps) {
  const currentIndex = getDisplayIndex(currentStep);

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
