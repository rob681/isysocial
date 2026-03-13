"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ChevronDown, ChevronUp, User, ArrowRight } from "lucide-react";

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays}d`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

// Simple diff highlighting — find words that changed between two strings
function highlightDiff(oldText: string | null, newText: string | null) {
  if (!oldText && !newText) return null;
  if (!oldText) return <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-0.5 rounded">{newText}</span>;
  if (!newText) return <span className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-0.5 rounded line-through">{oldText}</span>;
  if (oldText === newText) return <span className="text-muted-foreground">{oldText}</span>;

  return (
    <div className="space-y-1">
      <div className="text-xs">
        <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1 py-0.5 rounded text-[11px] line-through">
          {oldText.length > 200 ? oldText.slice(0, 200) + "..." : oldText}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1 py-0.5 rounded text-[11px]">
          {newText.length > 200 ? newText.slice(0, 200) + "..." : newText}
        </span>
      </div>
    </div>
  );
}

interface RevisionHistoryProps {
  postId: string;
  /** Current post content for comparison with latest revision */
  currentTitle?: string | null;
  currentCopy?: string | null;
  currentHashtags?: string | null;
}

export function RevisionHistory({ postId, currentTitle, currentCopy, currentHashtags }: RevisionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedRevision, setExpandedRevision] = useState<string | null>(null);

  const { data: revisions, isLoading } = trpc.posts.getRevisions.useQuery(
    { postId },
    { enabled: isOpen }
  );

  const hasRevisions = revisions && revisions.length > 0;

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de cambios
            {hasRevisions && (
              <Badge variant="secondary" className="text-xs ml-1">
                {revisions.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !hasRevisions ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay cambios registrados. Las revisiones se crean automáticamente al editar el contenido.
            </p>
          ) : (
            <div className="space-y-3">
              {revisions.map((rev, index) => {
                // For the latest revision, compare with current content
                // For older revisions, compare with the next revision (index - 1)
                const isLatest = index === 0;
                const compareTitle = isLatest ? currentTitle : revisions[index - 1]?.title;
                const compareCopy = isLatest ? currentCopy : revisions[index - 1]?.copy;
                const compareHashtags = isLatest ? currentHashtags : revisions[index - 1]?.hashtags;

                const isExpanded = expandedRevision === rev.id;
                const titleChanged = rev.title !== compareTitle;
                const copyChanged = rev.copy !== compareCopy;
                const hashtagsChanged = rev.hashtags !== compareHashtags;
                const changesCount = [titleChanged, copyChanged, hashtagsChanged].filter(Boolean).length;

                return (
                  <div key={rev.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedRevision(isExpanded ? null : rev.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors text-left"
                    >
                      <div className="relative">
                        <div
                          className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
                        >
                          <span className="text-xs font-bold text-primary">v{rev.version}</span>
                        </div>
                        {index < revisions.length - 1 && (
                          <div className="absolute top-7 left-[13px] w-0.5 h-3 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{rev.changedBy.name}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(rev.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {changesCount === 0 ? "Contenido guardado" : `${changesCount} campo${changesCount > 1 ? "s" : ""} modificado${changesCount > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
                        <div className="pt-3">
                          {titleChanged && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Título</p>
                              {highlightDiff(rev.title, isLatest ? (currentTitle ?? null) : (revisions[index - 1]?.title ?? null))}
                            </div>
                          )}
                          {copyChanged && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Copy</p>
                              {highlightDiff(rev.copy, isLatest ? (currentCopy ?? null) : (revisions[index - 1]?.copy ?? null))}
                            </div>
                          )}
                          {hashtagsChanged && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Hashtags</p>
                              {highlightDiff(rev.hashtags, isLatest ? (currentHashtags ?? null) : (revisions[index - 1]?.hashtags ?? null))}
                            </div>
                          )}
                          {!titleChanged && !copyChanged && !hashtagsChanged && (
                            <p className="text-xs text-muted-foreground italic">
                              Contenido de esta versión: {rev.title || "Sin título"} — {rev.copy?.slice(0, 100) || "Sin copy"}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
