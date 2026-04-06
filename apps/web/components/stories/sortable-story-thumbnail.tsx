"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SortableStoryThumbnailProps {
  id: string;
  storySequence: number;
  title?: string;
  imageUrl?: string;
  status: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SortableStoryThumbnail({
  id,
  storySequence,
  title,
  imageUrl,
  status,
  onEdit,
  onDelete,
}: SortableStoryThumbnailProps) {
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

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-200 text-gray-800",
    IN_REVIEW: "bg-blue-200 text-blue-800",
    APPROVED: "bg-green-200 text-green-800",
    PUBLISHED: "bg-green-700 text-white",
    REJECTED: "bg-red-200 text-red-800",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative w-40 overflow-hidden transition-all",
        isDragging && "opacity-50 shadow-lg scale-105"
      )}
    >
      {/* Image Preview */}
      <div className="relative aspect-video bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title || "Story"}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <span className="text-xs text-center px-2">Sin vista previa</span>
          </div>
        )}

        {/* Sequence Badge */}
        <Badge className="absolute top-2 left-2 bg-black/70">
          #{storySequence + 1}
        </Badge>

        {/* Status Badge */}
        <Badge className={cn("absolute top-2 right-2", statusColors[status])}>
          {status}
        </Badge>
      </div>

      {/* Footer */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium truncate">
          {title || `Story ${storySequence + 1}`}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-1">
          {/* Drag Handle */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7"
            {...attributes}
            {...listeners}
            title="Arrastra para reordenar"
          >
            <GripVertical className="w-4 h-4" />
          </Button>

          {/* Edit Button */}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7"
              onClick={onEdit}
              title="Editar story"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}

          {/* Delete Button */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onDelete}
              title="Eliminar story"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
