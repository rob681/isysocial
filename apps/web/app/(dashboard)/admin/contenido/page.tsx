"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  FileImage,
  Calendar,
  MessageCircle,
  Filter,
  Link2,
  CheckSquare,
  Square,
  Trash2,
  ArrowRightCircle,
  Tag,
  X,
  Loader2,
  Download,
  Film,
  Users,
  Play,
} from "lucide-react";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType } from "@isysocial/shared";
import { exportToCSV } from "@/lib/export-csv";
import { ViewToggle, type ViewMode } from "@/components/content/view-toggle";
import { ContentGrid } from "@/components/content/content-grid";
import { ContentKanban } from "@/components/content/content-kanban";
import { Topbar } from "@/components/layout/topbar";

/* ─── Performance Tier Badge ─────────────────────────────────────── */
function PerformanceTierBadge({ tier }: { tier: "TOP" | "HIGH" | "AVERAGE" | "LOW" }) {
  const config = {
    TOP: { label: "⭐ TOP", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    HIGH: { label: "HIGH", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    AVERAGE: { label: "AVERAGE", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
    LOW: { label: "LOW", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
  };
  const { label, className } = config[tier] ?? config.AVERAGE;
  return (
    <Badge variant="secondary" className={`text-[10px] ${className}`}>
      {label}
    </Badge>
  );
}

/* ─── Bulk Action Bar ─────────────────────────────────────────────── */
function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatus,
  onBulkDelete,
  onBulkCategory,
  loading,
  categories,
}: {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatus: (status: string) => void;
  onBulkDelete: () => void;
  onBulkCategory: (categoryId: string | null) => void;
  loading: boolean;
  categories: { id: string; name: string; color: string }[];
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  return (
    <div className="sticky top-0 z-20 bg-primary text-primary-foreground rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4" />
        <span className="font-medium text-sm">
          {selectedCount} {selectedCount === 1 ? "seleccionado" : "seleccionados"}
        </span>
      </div>

      <div className="flex-1" />

      {loading && <Loader2 className="h-4 w-4 animate-spin" />}

      {/* Change Status */}
      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setShowStatusMenu(!showStatusMenu); setShowCategoryMenu(false); }}
          disabled={loading}
        >
          <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />
          Cambiar estado
        </Button>
        {showStatusMenu && (
          <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg py-1 min-w-[180px] z-30">
            {(["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "CANCELLED"] as const).map(
              (s) => (
                <button
                  key={s}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
                  onClick={() => { onBulkStatus(s); setShowStatusMenu(false); }}
                >
                  <Badge variant="secondary" className={POST_STATUS_COLORS[s] + " text-[10px]"}>
                    {POST_STATUS_LABELS[s]}
                  </Badge>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Change Category */}
      {categories.length > 0 && (
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setShowCategoryMenu(!showCategoryMenu); setShowStatusMenu(false); }}
            disabled={loading}
          >
            <Tag className="h-3.5 w-3.5 mr-1.5" />
            Categoría
          </Button>
          {showCategoryMenu && (
            <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg py-1 min-w-[180px] z-30">
              <button
                className="w-full px-3 py-2 text-sm text-left hover:bg-accent text-muted-foreground"
                onClick={() => { onBulkCategory(null); setShowCategoryMenu(false); }}
              >
                Sin categoría
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
                  onClick={() => { onBulkCategory(c.id); setShowCategoryMenu(false); }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <Button
        variant="secondary"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={onBulkDelete}
        disabled={loading}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        Eliminar
      </Button>

      {/* Clear */}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground" onClick={onClearSelection}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ─── No client selected ─────────────────────────────────────────── */
function NoClientSelected() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Contenido" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Selecciona un cliente</h2>
          <p className="text-muted-foreground text-sm">
            Elige un cliente desde la barra lateral para ver y gestionar su contenido.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
function ContenidoPageInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;

  if (!clientId) return <NoClientSelected />;

  return <ContenidoWithClient clientId={clientId} />;
}

function ContenidoWithClient({ clientId }: { clientId: string }) {
  const [search, setSearch] = useState("");
  const [filterNetwork, setFilterNetwork] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Reset page when clientId changes (navigation between clients)
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [clientId]);

  useEffect(() => {
    const saved = localStorage.getItem("isysocial-content-view");
    if (saved === "grid" || saved === "list" || saved === "kanban") setViewMode(saved);
  }, []);
  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem("isysocial-content-view", v);
  };

  const utils = trpc.useUtils();
  const { data: categories } = trpc.categories.list.useQuery();

  const { data: clientData } = trpc.clients.get.useQuery(
    { id: clientId! },
    { enabled: !!clientId }
  );

  const { data, isLoading } = trpc.posts.list.useQuery({
    search: search || undefined,
    network: filterNetwork !== "ALL" ? (filterNetwork as SocialNetwork) : undefined,
    status: filterStatus !== "ALL" ? (filterStatus as PostStatus) : undefined,
    categoryId: filterCategory !== "ALL" ? filterCategory : undefined,
    clientId,
    page,
    limit: 20,
  });

  // Kanban mode: fetch all posts without status filter and with higher limit
  const { data: kanbanData, isLoading: isKanbanLoading } = trpc.posts.list.useQuery({
    search: search || undefined,
    network: filterNetwork !== "ALL" ? (filterNetwork as SocialNetwork) : undefined,
    categoryId: filterCategory !== "ALL" ? filterCategory : undefined,
    clientId,
    page: 1,
    limit: 200,
  }, { enabled: viewMode === "kanban" });

  const updateStatusMutation = trpc.posts.updateStatus.useMutation({
    onSuccess: () => { utils.posts.list.invalidate(); },
  });

  const bulkStatusMutation = trpc.posts.bulkUpdateStatus.useMutation({
    onSuccess: () => { utils.posts.list.invalidate(); setSelectedIds(new Set()); },
  });

  const bulkDeleteMutation = trpc.posts.bulkDelete.useMutation({
    onSuccess: () => { utils.posts.list.invalidate(); setSelectedIds(new Set()); },
  });

  const bulkCategoryMutation = trpc.posts.bulkAssignCategory.useMutation({
    onSuccess: () => { utils.posts.list.invalidate(); setSelectedIds(new Set()); },
  });

  const bulkLoading = bulkStatusMutation.isLoading || bulkDeleteMutation.isLoading || bulkCategoryMutation.isLoading;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data?.posts) return;
    const allIds = data.posts.map((p) => p.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }

  function handleBulkStatus(status: string) {
    if (selectedIds.size === 0) return;
    bulkStatusMutation.mutate({ postIds: Array.from(selectedIds), status: status as any });
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setDeleteDialogOpen(true);
  }

  function confirmBulkDelete() {
    bulkDeleteMutation.mutate({ postIds: Array.from(selectedIds) });
    setDeleteDialogOpen(false);
  }

  function handleBulkCategory(categoryId: string | null) {
    if (selectedIds.size === 0) return;
    bulkCategoryMutation.mutate({ postIds: Array.from(selectedIds), categoryId });
  }

  const allSelected = data?.posts?.length ? data.posts.every((p) => selectedIds.has(p.id)) : false;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Contenido" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onBulkStatus={handleBulkStatus}
          onBulkDelete={handleBulkDelete}
          onBulkCategory={handleBulkCategory}
          loading={bulkLoading}
          categories={categories ?? []}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {clientId && clientData ? clientData.companyName : "Contenido"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {clientId && clientData
              ? `Publicaciones de ${clientData.companyName}`
              : "Gestiona las publicaciones de tus clientes"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.posts && data.posts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportToCSV(
                  data.posts,
                  [
                    { key: "title", label: "Título" },
                    { key: "client.companyName", label: "Cliente" },
                    { key: "network", label: "Red social", transform: (v) => NETWORK_LABELS[v as SocialNetwork] ?? v },
                    { key: "postType", label: "Tipo", transform: (v) => POST_TYPE_LABELS[v as PostType] ?? v },
                    { key: "status", label: "Estado", transform: (v) => POST_STATUS_LABELS[v as PostStatus] ?? v },
                    { key: "category.name", label: "Categoría" },
                    { key: "copy", label: "Copy" },
                    { key: "hashtags", label: "Hashtags" },
                    { key: "scheduledAt", label: "Programada", transform: (v) => v ? new Date(v).toLocaleDateString("es-MX") : "" },
                    { key: "createdAt", label: "Creada", transform: (v) => v ? new Date(v).toLocaleDateString("es-MX") : "" },
                  ],
                  `contenido-${new Date().toISOString().slice(0, 10)}`
                );
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          )}
          <Link href={`/admin/contenido/nuevo${clientId ? `?clientId=${clientId}` : ""}`}>
            <Button className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nueva publicación
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar publicaciones..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <Select value={filterNetwork} onValueChange={(v) => { setFilterNetwork(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Red social" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las redes</SelectItem>
            {Object.entries(NETWORK_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {Object.entries(POST_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {categories && categories.length > 0 && (
          <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
            <SelectTrigger className="w-[170px]">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />
        <ViewToggle view={viewMode} onChange={handleViewChange} />
      </div>

      {/* Post list */}
      {(viewMode === "kanban" ? isKanbanLoading : isLoading) ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : viewMode === "kanban" ? (
        <ContentKanban
          posts={(kanbanData?.posts ?? []) as any}
          basePath="/admin/contenido"
          showClient
          onStatusChange={(postId, newStatus) => {
            updateStatusMutation.mutate({ id: postId, toStatus: newStatus as any });
          }}
        />
      ) : !data || data.posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileImage className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No hay publicaciones
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Crea tu primera publicación para empezar
            </p>
            <Link href="/admin/contenido/nuevo" className="mt-4">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear publicación
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="space-y-4">
          {/* Select All for grid */}
          {data.posts.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={toggleSelectAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
              <span className="text-xs text-muted-foreground">
                {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
              </span>
              {selectedIds.size > 0 && (
                <span className="text-xs text-primary font-medium">
                  ({selectedIds.size} seleccionados)
                </span>
              )}
            </div>
          )}
          <ContentGrid
            posts={data.posts as any}
            basePath="/admin/contenido"
            showClient
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {page} de {data.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          {data.posts.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={toggleSelectAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
              <span className="text-xs text-muted-foreground">
                {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
              </span>
            </div>
          )}

          {/* Group mirror posts with the same mirrorGroupId into one card */}
          {(() => {
            const seen = new Set<string>();
            const grouped: Array<{ primary: typeof data.posts[0]; mirrors: typeof data.posts }> = [];
            for (const post of data.posts) {
              const mgId = (post as any).mirrorGroupId;
              if (mgId) {
                if (seen.has(mgId)) continue;
                seen.add(mgId);
                grouped.push({ primary: post, mirrors: data.posts.filter((p) => (p as any).mirrorGroupId === mgId) });
              } else {
                grouped.push({ primary: post, mirrors: [post] });
              }
            }

            const STATUS_BORDER: Record<string, string> = {
              DRAFT: "border-l-gray-300 dark:border-l-gray-600",
              IN_REVIEW: "border-l-yellow-400",
              CLIENT_CHANGES: "border-l-orange-400",
              APPROVED: "border-l-green-500",
              SCHEDULED: "border-l-blue-500",
              PUBLISHED: "border-l-emerald-500",
              PAUSED: "border-l-purple-400",
              CANCELLED: "border-l-red-400",
            };

            return grouped.map(({ primary: post, mirrors }) => {
            const statusColor = POST_STATUS_COLORS[post.status as PostStatus] || "";
            const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
            const thumbnail = post.media?.[0]?.fileUrl;
            const isVideo = post.media?.[0]?.mimeType?.startsWith("video/");
            const isSelected = selectedIds.has(post.id);
            const borderClass = STATUS_BORDER[post.status] ?? "border-l-gray-200";

            return (
              <Card
                key={post.id}
                className={`hover:shadow-md transition-all cursor-pointer border-l-4 ${borderClass} ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(post.id); }}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    {/* Thumbnail */}
                    <Link href={`/admin/contenido/${post.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative w-16 h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {thumbnail ? (
                          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FileImage className="h-6 w-6 text-muted-foreground/40" />
                        )}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                              <Play className="h-3 w-3 text-zinc-700 ml-0.5" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {post.title || post.copy?.slice(0, 60) || "Sin título"}
                          </p>
                          {mirrors.length > 1 && (
                            <span title={`Publicado en ${mirrors.length} redes`}><Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /></span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {mirrors.length > 1 ? (
                            mirrors.map((m) => (
                              <span key={m.id}
                                className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: NETWORK_COLORS[m.network as SocialNetwork] || "#888" }}
                              >
                                {NETWORK_LABELS[m.network as SocialNetwork]}
                              </span>
                            ))
                          ) : (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: networkColor }}
                            >
                              {NETWORK_LABELS[post.network as SocialNetwork]}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {POST_TYPE_LABELS[post.postType as PostType]}
                          </span>
                          {(post as any).category && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              ·
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: (post as any).category.color }}
                              />
                              {(post as any).category.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            · {post.client.companyName}
                          </span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {post.scheduledAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {new Date(post.scheduledAt).toLocaleDateString("es", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                        )}
                        {post._count.comments > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>{post._count.comments}</span>
                          </div>
                        )}
                        <Badge variant="secondary" className={statusColor}>
                          {POST_STATUS_LABELS[post.status as PostStatus]}
                        </Badge>
                        {(post as any).performanceTier && (
                          <PerformanceTierBadge tier={(post as any).performanceTier} />
                        )}
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          });
          })()}

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar publicaciones</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar {selectedIds.size} publicacion{selectedIds.size === 1 ? "" : "es"}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}

export default function ContenidoPage() {
  return (
    <Suspense>
      <ContenidoPageInner />
    </Suspense>
  );
}
