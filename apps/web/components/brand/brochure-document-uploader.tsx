"use client";

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

interface BrochureDocumentUploaderProps {
  sessionId: string;
  onExtractionComplete: () => void;
}

type UploadState =
  | "idle"
  | "uploading"
  | "extracting"
  | "reviewing"
  | "confirming"
  | "done";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];
const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const STATE_LABELS: Record<UploadState, string> = {
  idle: "Esperando archivo",
  uploading: "Subiendo archivo...",
  extracting: "Extrayendo contenido con IA...",
  reviewing: "Revisa el texto extraido",
  confirming: "Confirmando extraccion...",
  done: "Extraccion completada",
};

export function BrochureDocumentUploader({
  sessionId,
  onExtractionComplete,
}: BrochureDocumentUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [validationMethod, setValidationMethod] = useState<string | null>(null);

  const uploadBrochureFile = trpc.brandBrochure.uploadBrochureFile.useMutation({
    onSuccess: (data) => {
      setExtractedText(data.extractedText || "");
      setConfidence(data.confidence ?? null);
      setValidationMethod(data.method ?? null);
      setState("reviewing");
    },
    onError: (err) => {
      toast({
        title: "Error al extraer contenido",
        description: err.message,
        variant: "destructive",
      });
      setState("idle");
    },
  });

  const confirmExtraction = trpc.brandBrochure.confirmExtraction.useMutation({
    onSuccess: () => {
      setState("done");
      toast({ title: "Extraccion confirmada" });
      onExtractionComplete();
    },
    onError: (err) => {
      toast({
        title: "Error al confirmar",
        description: err.message,
        variant: "destructive",
      });
      setState("reviewing");
    },
  });

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: "Tipo de archivo no soportado",
        description: "Solo se aceptan archivos PDF, PNG, JPG, JPEG y WEBP.",
        variant: "destructive",
      });
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Archivo demasiado grande",
        description: "El tamano maximo permitido es de 50MB.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    setState("uploading");

    try {
      // Step 1: Upload to /api/upload
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Error al subir el archivo");
      }

      const uploadData = await uploadRes.json();

      // Step 2: Call uploadBrochureFile with metadata
      setState("extracting");
      await uploadBrochureFile.mutateAsync({
        sessionId,
        fileUrl: uploadData.url,
        storagePath: uploadData.storagePath,
        fileName: uploadData.fileName,
        mimeType: uploadData.mimeType,
        fileSize: uploadData.fileSize,
      });
    } catch (err) {
      toast({
        title: "Error al subir archivo",
        description:
          err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
      setState("idle");
      setSelectedFile(null);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [sessionId]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirm = async () => {
    setState("confirming");
    await confirmExtraction.mutateAsync({
      sessionId,
      extractedText,
    });
  };

  const handleReset = () => {
    setState("idle");
    setSelectedFile(null);
    setExtractedText("");
    setConfidence(null);
    setValidationMethod(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getConfidenceBadge = () => {
    if (confidence === null) return null;
    const pct = Math.round(confidence * 100);
    const variant = pct >= 80 ? "default" : pct >= 50 ? "secondary" : "destructive";
    return (
      <Badge variant={variant}>
        Confianza: {pct}%
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-3">
        {state === "uploading" || state === "extracting" || state === "confirming" ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : state === "done" ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : state === "reviewing" ? (
          <FileText className="h-5 w-5 text-primary" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{STATE_LABELS[state]}</span>
      </div>

      {/* Drop zone - visible in idle state */}
      {state === "idle" && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-base font-medium">
                Arrastra tu archivo aqui o haz clic para seleccionar
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, PNG, JPG, JPEG o WEBP (max. 50MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Uploading / Extracting progress */}
      {(state === "uploading" || state === "extracting") && selectedFile && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-1000 animate-pulse"
              style={{ width: state === "uploading" ? "40%" : "80%" }}
            />
          </div>
        </div>
      )}

      {/* Review extracted text */}
      {state === "reviewing" && (
        <div className="space-y-4">
          {/* File info + badges */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {selectedFile && (
                <span className="text-sm text-muted-foreground">
                  {selectedFile.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getConfidenceBadge()}
              {validationMethod && (
                <Badge variant="outline">{validationMethod}</Badge>
              )}
            </div>
          </div>

          {/* Editable extracted text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Texto extraido (puedes editar si es necesario)
            </label>
            <Textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              rows={12}
              className="font-mono text-sm resize-y"
              placeholder="No se pudo extraer texto del documento..."
            />
          </div>

          {!extractedText.trim() && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>No se detecto texto. Puedes escribirlo manualmente.</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              <X className="h-4 w-4 mr-2" />
              Reiniciar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!extractedText.trim()}
              className="flex-1"
            >
              Confirmar y Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Confirming state */}
      {state === "confirming" && (
        <div className="border rounded-lg p-6 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Procesando tu documento...
          </span>
        </div>
      )}
    </div>
  );
}
