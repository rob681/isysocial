"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Loader2, Image, Video, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { PostType } from "@isysocial/shared";

interface UploadedFile {
  url: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

interface MediaUploaderProps {
  media: UploadedFile[];
  onUpload: (files: UploadedFile[]) => void;
  onRemove: (index: number) => void;
  postType: PostType;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUploader({ media, onUpload, onRemove, postType }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const isMultiple = postType === "CAROUSEL";
  const acceptsVideo = ["REEL", "VIDEO", "STORY"].includes(postType);
  const accept = acceptsVideo
    ? "image/*,video/mp4,video/quicktime,video/webm"
    : "image/*";

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const results: UploadedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;

        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: "Archivo muy grande",
            description: `"${file.name}" excede 50 MB`,
            variant: "destructive",
          });
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "posts");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Error al subir archivo");
        }

        const data = await response.json();
        results.push({
          url: data.url,
          storagePath: data.storagePath,
          fileName: data.fileName,
          mimeType: data.mimeType,
          fileSize: data.fileSize,
        });
      }

      if (results.length > 0) {
        onUpload(results);
      }
    } catch (err: any) {
      toast({
        title: "Error al subir",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          "hover:border-primary/50 hover:bg-primary/5",
          uploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={isMultiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Subiendo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click para subir {acceptsVideo ? "imagen o video" : "imagen"}
              {isMultiple ? " (múltiples archivos)" : ""}
            </p>
            <p className="text-xs text-muted-foreground/60">Máximo 50 MB por archivo</p>
          </div>
        )}
      </div>

      {/* Uploaded files */}
      {media.length > 0 && (
        <div className="space-y-2">
          {media.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg border bg-card"
            >
              {isMultiple && (
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
              )}

              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                {file.mimeType.startsWith("video/") ? (
                  <Video className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <img src={file.url} alt="" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
              </div>

              {/* Remove */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => onRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
