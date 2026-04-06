"use client";

import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TASK_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECIBIDA: { label: "Recibida", color: "bg-blue-100 text-blue-700" },
  EN_PROGRESO: { label: "En progreso", color: "bg-amber-100 text-amber-700" },
  DUDA: { label: "Duda", color: "bg-orange-100 text-orange-700" },
  REVISION: { label: "Revisión", color: "bg-purple-100 text-purple-700" },
  FINALIZADA: { label: "Finalizada", color: "bg-green-100 text-green-700" },
  CANCELADA: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

interface IsytaskLinkBadgeProps {
  isytaskTaskId: string | null | undefined;
  taskNumber?: number;
  taskStatus?: string;
  taskTitle?: string;
}

/**
 * Badge shown in Isysocial when a Post is linked to an Isytask task.
 * Reads task info via cross-schema query (passed as props from server/query).
 */
export function IsytaskLinkBadge({
  isytaskTaskId,
  taskNumber,
  taskStatus,
  taskTitle,
}: IsytaskLinkBadgeProps) {
  if (!isytaskTaskId) return null;

  const statusInfo = taskStatus
    ? TASK_STATUS_LABELS[taskStatus] ?? { label: taskStatus, color: "bg-gray-100 text-gray-700" }
    : null;

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
      <ClipboardList className="h-4 w-4 text-emerald-600" />
      <span className="text-sm font-medium text-emerald-700">
        Isytask {taskNumber ? `#${taskNumber}` : ""}
      </span>
      {statusInfo && (
        <Badge className={`text-xs ${statusInfo.color}`}>
          {statusInfo.label}
        </Badge>
      )}
    </div>
  );
}
