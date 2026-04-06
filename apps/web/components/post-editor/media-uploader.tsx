"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Loader2, Image, Video, GripVertical, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc/client";
import type { PostType } from "@isysocial/shared";
import { validateMedia as validateMediaFormat, type ValidationResult } from "@/lib/media-formats";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4MB — above this, use signed URL

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
  onReorder?: (orderedMedia: UploadedFile[]) => void;
  postType: PostType;
  network?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Sortable media item component
function SortableMediaItem({
  id,
  file,
  index,
  isMultiple,
  onRemove,
}: {
  id: string;
  file: UploadedFile;
  index: number;
  isMultiple: boolean;
  onRemove: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-all",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Compact thumbnail — icon-sized for easy reordering */}
      <div className="flex items-center gap-3 p-2">
        <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {file.mimeType.startsWith("video/") ? (
            <video
              src={file.url}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
            />
          ) : (
            <img src={file.url} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        {isMultiple && (
          <button
            className="flex-shrink-0 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            title="Arrastra para reordenar"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          {file.mimeType.startsWith("video/") ? (
            <Video className="h-4 w-4 text-violet-500" />
          ) : (
            <Image className="h-4 w-4 text-blue-500" />
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
    </div>
  );
}

export function MediaUploader({
  media,
  onUpload,
  onRemove,
  onReorder,
  postType,
  network,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const { toast } = useToast();
  const getUploadUrl = trpc.posts.getUploadUrl.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isMultiple = postType === "CAROUSEL";
  const acceptsVideo = ["REEL", "VIDEO", "STORY"].includes(postType);
  const accept = acceptsVideo
    ? "image/*,video/mp4,video/quicktime,video/webm"
    : "image/*";

  // Upload via signed URL (direct to Supabase — no size limit from Vercel)
  const uploadDirect = async (file: File): Promise<UploadedFile> => {
    setUploadProgress(`Preparando ${file.name}...`);
    const { signedUrl, publicUrl, storagePath, fileName } =
      await getUploadUrl.mutateAsync({
        fileName: file.name,
        mimeType: file.type,
        folder: "posts",
      });

    setUploadProgress(`Subiendo ${file.name}...`);
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Error al subir archivo a almacenamiento");
    }

    return {
      url: publicUrl,
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    };
  };

  // Upload via API route (small files only)
  const uploadViaApi = async (file: File): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "posts");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(err.error || "Error al subir archivo");
    }

    const data = await response.json();
    return {
      url: data.url,
      storagePath: data.storagePath,
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    };
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress("");
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

        // Validate against network format requirements
        if (network) {
          try {
            const validation = await validateMediaFormat(file, network, postType, media.length + results.length);
            if (!validation.valid) {
              toast({
                title: "Formato incompatible",
                description: validation.errors.join(". "),
                variant: "destructive",
              });
              continue;
            }
            if (validation.warnings.length > 0) {
              toast({
                title: "Advertencia de formato",
                description: validation.warnings.join(". "),
              });
            }
          } catch {
            // Validation failed silently, allow upload
          }
        }

        // Use direct upload for large files (>4MB), API route for small ones
        const result =
          file.size > DIRECT_UPLOAD_THRESHOLD
            ? await uploadDirect(file)
            : await uploadViaApi(file);

        results.push(result);
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
      setUploadProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = media.findIndex((item) => `media-${media.indexOf(item)}` === active.id);
      const newIndex = media.findIndex((item) => `media-${media.indexOf(item)}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedMedia = arrayMove(media, oldIndex, newIndex);
        onReorder?.(reorderedMedia);
      }
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
            <p className="text-sm text-muted-foreground">{uploadProgress || "Subiendo..."}</p>
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

      {/* Uploaded files with drag-drop support */}
      {media.length > 0 && isMultiple ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-3">
            <SortableContext
              items={media.map((_, i) => `media-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              {media.map((file, index) => (
                <SortableMediaItem
                  key={`media-${index}`}
                  id={`media-${index}`}
                  file={file}
                  index={index}
                  isMultiple={isMultiple}
                  onRemove={onRemove}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      ) : (
        media.length > 0 && (
          <div className="space-y-3">
            {media.map((file, index) => (
              <SortableMediaItem
                key={`media-${index}`}
                id={`media-${index}`}
                file={file}
                index={index}
                isMultiple={false}
                onRemove={onRemove}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
