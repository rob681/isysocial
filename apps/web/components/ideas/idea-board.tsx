"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  Lightbulb,
} from "lucide-react";
import {
  IDEA_STATUS_LABELS,
  IDEA_STATUS_COLORS,
  NETWORK_LABELS,
} from "@isysocial/shared";
import type { IdeaStatus, SocialNetwork } from "@isysocial/shared";
import { IdeaCard } from "./idea-card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Kanban columns in order
const KANBAN_COLUMNS: { status: IdeaStatus; label: string; colorClass: string }[] = [
  { status: "BACKLOG", label: "Backlog", colorClass: "border-t-gray-400" },
  { status: "IN_PROGRESS", label: "En desarrollo", colorClass: "border-t-blue-500" },
  { status: "READY", label: "Listo", colorClass: "border-t-green-500" },
  { status: "CONVERTED", label: "Convertido", colorClass: "border-t-purple-500" },
];

interface IdeaBoardProps {
  basePath: string; // "/admin/ideas", "/editor/ideas", "/cliente/ideas"
  canCreate?: boolean;
  canDrag?: boolean;
  initialClientId?: string;
}

export function IdeaBoard({ basePath, canCreate = false, canDrag = false, initialClientId }: IdeaBoardProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>(initialClientId ?? "all");

  // Sync clientFilter when navigating between clients via sidebar
  useEffect(() => {
    setClientFilter(initialClientId ?? "all");
  }, [initialClientId]);
  const { toast } = useToast();

  const { data, isLoading, refetch } = trpc.ideas.list.useQuery({
    page: 1,
    limit: 100,
    search: search || undefined,
    network: networkFilter !== "all" ? (networkFilter as any) : undefined,
    clientId: clientFilter !== "all" ? clientFilter : undefined,
  });

  const { data: clients } = trpc.ideas.getClientsForSelect.useQuery(undefined, {
    enabled: canCreate,
  });

  const updateStatus = trpc.ideas.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast({ title: "Idea movida" });
    },
    onError: (err) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Group ideas by status for kanban
  const columns = useMemo(() => {
    if (!data?.ideas) return {};
    const grouped: Record<string, typeof data.ideas> = {};
    for (const col of KANBAN_COLUMNS) {
      grouped[col.status] = [];
    }
    grouped["DISCARDED"] = [];

    for (const idea of data.ideas) {
      if (grouped[idea.status]) {
        grouped[idea.status].push(idea);
      }
    }
    return grouped;
  }, [data?.ideas]);

  // Drag & drop handlers
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (ideaId: string) => (e: React.DragEvent) => {
    setDraggedId(ideaId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetStatus: IdeaStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedId && canDrag) {
      updateStatus.mutate({ id: draggedId, status: targetStatus });
    }
    setDraggedId(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ideas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Network filter */}
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 bg-background"
          >
            <option value="all">Todas las redes</option>
            {(Object.entries(NETWORK_LABELS) as [string, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Client filter (admin/editor only) */}
          {canCreate && clients && clients.length > 0 && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="text-sm border rounded-lg px-3 py-2 bg-background"
            >
              <option value="all">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          )}

          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "p-2 text-sm",
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
              title="Vista Kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 text-sm",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
              title="Vista Lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {canCreate && (
            <Link href={`${basePath}/nueva${initialClientId ? `?clientId=${initialClientId}` : ""}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva idea
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!data?.ideas || data.ideas.length === 0) && (
        <div className="text-center py-16 border rounded-lg bg-card">
          <Lightbulb className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No hay ideas aún</p>
          <p className="text-sm text-muted-foreground mt-1">
            {canCreate
              ? "Crea una nueva idea para comenzar a planificar contenido."
              : "Las ideas aparecerán aquí cuando tu agencia las cree."}
          </p>
          {canCreate && (
            <Link href={`${basePath}/nueva`}>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Nueva idea
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Kanban View */}
      {!isLoading && data?.ideas && data.ideas.length > 0 && viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => (
            <div
              key={col.status}
              className={cn(
                "bg-muted/30 rounded-lg border-t-4 min-h-[200px]",
                col.colorClass
              )}
              onDragOver={handleDragOver}
              onDrop={handleDrop(col.status)}
            >
              {/* Column Header */}
              <div className="p-3 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs bg-background border rounded-full px-2 py-0.5">
                  {columns[col.status]?.length || 0}
                </span>
              </div>

              {/* Cards */}
              <div className="px-2 pb-2 space-y-2">
                {columns[col.status]?.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    basePath={basePath}
                    isDraggable={canDrag && !["CONVERTED", "DISCARDED"].includes(idea.status)}
                    onDragStart={handleDragStart(idea.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && data?.ideas && data.ideas.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {data.ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} basePath={basePath} />
          ))}
        </div>
      )}

      {/* Discarded ideas (collapsed) */}
      {!isLoading && columns["DISCARDED"] && columns["DISCARDED"].length > 0 && viewMode === "kanban" && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            Descartadas ({columns["DISCARDED"].length})
          </summary>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 opacity-60">
            {columns["DISCARDED"].map((idea) => (
              <IdeaCard key={idea.id} idea={idea} basePath={basePath} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
