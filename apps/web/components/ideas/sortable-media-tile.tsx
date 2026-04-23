"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";

interface SortableMediaTileProps {
  id: string;
  index: number;
  fileUrl: string;
  mimeType?: string | null;
  canEdit: boolean;
  onRemove?: () => void;
}

/**
 * Draggable media tile for idea-detail's carousel reorder UI.
 * Uses @dnd-kit's useSortable — drag handle is the grip icon only, so
 * clicks/taps elsewhere stay available for future previews.
 */
export function SortableMediaTile({
  id,
  index,
  fileUrl,
  mimeType,
  canEdit,
  onRemove,
}: SortableMediaTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const isVideo = (mimeType ?? "").startsWith("video/");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group w-full aspect-square rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 border",
        isDragging && "opacity-60 shadow-lg z-10"
      )}
    >
      {isVideo ? (
        <>
          <VideoThumbnail src={fileUrl} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center">
              <Play className="h-3 w-3 text-zinc-800 ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        <img src={fileUrl} alt="" className="w-full h-full object-cover" />
      )}

      {/* Order badge */}
      <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-semibold rounded px-1.5 py-0.5 pointer-events-none">
        {index + 1}
      </span>

      {canEdit && (
        <>
          {/* Drag handle — top-right */}
          <button
            type="button"
            className="absolute top-1 right-1 p-1 rounded bg-black/50 hover:bg-black/70 text-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            title="Arrastra para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </button>

          {/* Remove — bottom-right */}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute bottom-1 right-1 p-1 rounded bg-red-600/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Eliminar"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
