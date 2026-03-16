"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { BrochureQuestion } from "./brochure-question";

interface BrochureGuidedQuestionnaireProps {
  sessionId: string;
  onComplete: () => void;
  initialQuestions?: any[];
}

interface Question {
  stepNumber: number;
  questionId: string;
  question: string;
  hint?: string;
  inputType: string;
  required: boolean;
}

export function BrochureGuidedQuestionnaire({
  sessionId,
  onComplete,
  initialQuestions,
}: BrochureGuidedQuestionnaireProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(!initialQuestions);

  const submitAnswer = trpc.brandBrochure.submitAnswer.useMutation({
    onSuccess: (data) => {
      // Add new questions if available
      if (data.nextQuestions && data.nextQuestions.length > 0) {
        const newQuestions: Question[] = data.nextQuestions.map((q: any, idx: number) => ({
          stepNumber: questions.length + idx + 1,
          questionId: q.questionId,
          question: q.question,
          hint: q.hint,
          inputType: q.inputType || "textarea",
          required: true,
        }));
        setQuestions([...questions, ...newQuestions]);
      }

      // Move to next question or complete
      if (currentQuestionIndex + 1 < questions.length || data.nextQuestions.length > 0) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // All questions answered, move to field suggestions
        toast({ title: "Preguntas completadas", description: "Generando tus campos de marca..." });
        onComplete();
      }
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });


  const currentQuestion = questions[currentQuestionIndex];

  if (isLoadingQuestions) {
    return (
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </CardContent>
    );
  }

  if (!currentQuestion) {
    return (
      <CardContent className="py-6 text-center text-muted-foreground">
        <p>No hay preguntas disponibles</p>
      </CardContent>
    );
  }

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.questionId]: value });
  };

  const handleNext = async () => {
    if (!answers[currentQuestion.questionId] && currentQuestion.required) {
      toast({ title: "Por favor responde la pregunta", variant: "default" });
      return;
    }

    await submitAnswer.mutateAsync({
      sessionId,
      questionId: currentQuestion.questionId,
      answer: answers[currentQuestion.questionId] || "",
    });
  };

  const isAnswered = currentQuestion.questionId in answers;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Pregunta {currentQuestionIndex + 1} de {questions.length}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <BrochureQuestion
          question={currentQuestion}
          value={answers[currentQuestion.questionId] || ""}
          onChange={handleAnswer}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0 || submitAnswer.isPending}
          >
            Anterior
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isAnswered || submitAnswer.isPending}
            className="flex-1"
          >
            {submitAnswer.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isLastQuestion ? "Completar Preguntas" : "Siguiente"}
          </Button>
        </div>
      </CardContent>
    </>
  );
}
