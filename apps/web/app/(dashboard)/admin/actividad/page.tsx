"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowRightLeft,
  MessageSquare,
  Globe,
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

/* ─── Filter types ──────────────────────────────────────────────── */

type FilterType = "all" | "status_change" | "comment" | "publish" | "notification";
type Range = "7d" | "30d" | "90d";

const FILTERS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Todos", icon: <Activity className="h-4 w-4" /> },
  { value: "status_change", label: "Estados", icon: <ArrowRightLeft className="h-4 w-4" /> },
  { value: "comment", label: "Comentarios", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "publish", label: "Publicaciones", icon: <Globe className="h-4 w-4" /> },
  { value: "notification", label: "Notificaciones", icon: <Bell className="h-4 w-4" /> },
];

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
];

/* ─── Icon helper ───────────────────────────────────────────────── */

function ActivityIcon({ type, meta }: { type: string; meta?: Record<string, string | null> }) {
  switch (type) {
    case "status_change":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      );
    case "comment":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
      );
    case "publish": {
      const status = meta?.status;
      if (status === "SUCCESS") {
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        );
      }
      if (status === "FAILED") {
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        );
      }
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
      );
    }
    case "notification":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Activity className="h-4 w-4 text-gray-500" />
        </div>
      );
  }
}

/* ─── Type badge ────────────────────────────────────────────────── */

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    status_change: {
      label: "Estado",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    comment: {
      label: "Comentario",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    publish: {
      label: "Publicación",
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    },
    notification: {
      label: "Notificación",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
  };
  const c = config[type] ?? { label: type, className: "" };
  return <Badge className={`text-xs font-medium ${c.className}`}>{c.label}</Badge>;
}

/* ─── Skeleton ──────────────────────────────────────────────────── */

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function ActividadPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [range, setRange] = useState<Range>("30d");

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.audit.list.useInfiniteQuery(
      { type: filter, range, limit: 30 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }
    );

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const totalInRange = data?.pages[0]?.totalInRange ?? 0;

  return (
    <div className="flex flex-col" data-tour="audit-page">
      <Topbar title="Actividad" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* ── Header stats ───────────────────────────────────── */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          {isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span>
              {totalInRange} actividades en los últimos{" "}
              {range === "7d" ? "7" : range === "30d" ? "30" : "90"} días
            </span>
          )}
        </div>

        {/* ── Filters ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2" data-tour="audit-filters">
          {/* Type filters */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value)}
                className="gap-1.5"
              >
                {f.icon}
                {f.label}
              </Button>
            ))}
          </div>

          <div className="mx-2 h-6 w-px bg-border hidden sm:block" />

          {/* Range selector */}
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant={range === r.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Activity feed ──────────────────────────────────── */}
        <Card data-tour="audit-feed">
          <CardContent className="p-0 divide-y divide-border">
            {isLoading ? (
              <ActivitySkeleton />
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">Sin actividad</p>
                <p className="text-xs mt-1">
                  No hay registros para el filtro seleccionado.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <ActivityIcon type={item.type} meta={item.meta as Record<string, string | null>} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {item.description}
                      </span>
                      <TypeBadge type={item.type} />
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{item.userName ?? item.userEmail ?? "Sistema"}</span>
                      {item.postTitle && (
                        <>
                          <span className="opacity-40">·</span>
                          {item.postId ? (
                            <Link
                              href={`/admin/contenido/${item.postId}`}
                              className="hover:underline truncate max-w-[200px]"
                            >
                              {item.postTitle}
                            </Link>
                          ) : (
                            <span className="truncate max-w-[200px]">{item.postTitle}</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Comment preview */}
                    {item.type === "comment" && item.meta && (item.meta as Record<string, string | null>).preview && (
                      <p className="mt-1 text-xs text-muted-foreground italic line-clamp-1">
                        &ldquo;{(item.meta as Record<string, string | null>).preview}&rdquo;
                      </p>
                    )}

                    {/* Publish error */}
                    {item.type === "publish" &&
                      item.meta &&
                      (item.meta as Record<string, string | null>).status === "FAILED" &&
                      (item.meta as Record<string, string | null>).error && (
                        <p className="mt-1 text-xs text-red-500 line-clamp-1">
                          Error: {(item.meta as Record<string, string | null>).error}
                        </p>
                      )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Load more ──────────────────────────────────────── */}
        {hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Cargando…
                </>
              ) : (
                "Cargar más"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
