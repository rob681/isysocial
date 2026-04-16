"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PublishError {
  timestamp: string;
  failures: Array<{
    network: string;
    error: string;
  }>;
  retryable: boolean;
}

interface ErrorNotificationCardProps {
  error: PublishError;
  postTitle?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Displays a post publication error with details about which networks failed and why.
 * Used in:
 * - Content grid cards (compact badge)
 * - Post detail page (full details modal)
 * - Error notification drawer/sheet
 */
export function ErrorNotificationCard({
  error,
  postTitle,
  onRetry,
  onDismiss,
}: ErrorNotificationCardProps) {
  const failureCount = error.failures.length;
  const timestamp = new Date(error.timestamp);

  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-200">
              Falló la publicación
            </h3>
            {postTitle && (
              <p className="text-sm text-red-700 dark:text-red-300 mt-1 line-clamp-2">
                {postTitle}
              </p>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Failures */}
        <div className="space-y-2">
          {error.failures.map((failure, idx) => (
            <div
              key={idx}
              className="text-sm bg-white dark:bg-black/20 rounded p-2.5 border border-red-200 dark:border-red-800"
            >
              <div className="font-medium text-red-900 dark:text-red-200">
                {failure.network}
              </div>
              <div className="text-red-700 dark:text-red-300 text-xs mt-1 break-words">
                {failure.error}
              </div>
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-red-600 dark:text-red-400">
          {timestamp.toLocaleString("es", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        {/* Actions */}
        {(onRetry || onDismiss) && (
          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button
                size="sm"
                variant="default"
                onClick={onRetry}
                disabled={!error.retryable}
                className="flex-1"
              >
                Reintentar publicación
              </Button>
            )}
            {onDismiss && !onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="flex-1"
              >
                Cerrar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact badge version for use in post cards
 */
export function ErrorBadge({
  error,
  onClick,
}: {
  error: PublishError;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors ${
        onClick ? "cursor-pointer" : ""
      }`}
      title={`${error.failures.length} red${error.failures.length === 1 ? "" : "es"} con fallos`}
    >
      <AlertTriangle className="h-3 w-3" />
      Falló
    </button>
  );
}
