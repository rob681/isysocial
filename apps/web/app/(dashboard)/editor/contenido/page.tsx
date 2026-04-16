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
  Plus,
  Search,
  FileImage,
  Calendar,
  MessageCircle,
  Filter,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType } from "@isysocial/shared";
import { ViewToggle, type ViewMode } from "@/components/content/view-toggle";
import { ContentGrid } from "@/components/content/content-grid";
import { Topbar } from "@/components/layout/topbar";

function NuevoLinkInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const href = `/editor/contenido/nuevo${clientId ? `?clientId=${clientId}` : ""}`;
  return <Link href={href}>{children}</Link>;
}

function NuevoLink({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Link href="/editor/contenido/nuevo">{children}</Link>}>
      <NuevoLinkInner>{children}</NuevoLinkInner>
    </Suspense>
  );
}

function EditorContenidoInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;

  const [search, setSearch] = useState("");
  const [filterNetwork, setFilterNetwork] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  function goToPrevMonth() {
    if (filterMonth === 1) {
      setFilterMonth(12);
      setFilterYear((y) => y - 1);
    } else {
      setFilterMonth((m) => m - 1);
    }
    setPage(1);
  }

  function goToNextMonth() {
    if (filterYear === currentYear && filterMonth === currentMonth) return;
    if (filterMonth === 12) {
      setFilterMonth(1);
      setFilterYear((y) => y + 1);
    } else {
      setFilterMonth((m) => m + 1);
    }
    setPage(1);
  }

  // Reset page when clientId changes
  useEffect(() => { setPage(1); }, [clientId]);

  useEffect(() => {
    const saved = localStorage.getItem("isysocial-content-view");
    if (saved === "grid" || saved === "list") setViewMode(saved);
  }, []);
  const handleViewChange = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem("isysocial-content-view", v);
  };

  const { data: assignmentsData } = trpc.editors.myAssignedClients.useQuery();
  const hasNoAssignments =
    assignmentsData !== undefined &&
    !assignmentsData.hasManageAll &&
    Array.isArray(assignmentsData.clients) &&
    assignmentsData.clients.length === 0;

  // Lookup client name if filtering by a specific client
  const clientName = clientId
    ? assignmentsData?.clients?.find((c) => c.id === clientId)?.companyName
    : undefined;

  const { data, isLoading } = trpc.posts.list.useQuery({
    clientId,   // ← filtra por cliente si viene en la URL
    search: search || undefined,
    network: filterNetwork !== "ALL" ? (filterNetwork as SocialNetwork) : undefined,
    status: filterStatus !== "ALL" ? (filterStatus as PostStatus) : undefined,
    page,
    limit: 20,
    month: filterMonth,
    year: filterYear,
  });

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Contenido" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {clientName ? `Contenido — ${clientName}` : "Mis Contenidos"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {clientName
              ? `Publicaciones de ${clientName}`
              : "Gestiona los posts de tus clientes asignados"}
          </p>
        </div>
        <NuevoLink>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva publicación
          </Button>
        </NuevoLink>
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

        {/* Month navigator */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={goToPrevMonth} className="p-1 rounded hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center capitalize">
            {format(new Date(filterYear, filterMonth - 1), "MMMM yyyy", { locale: es })}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            disabled={filterYear === currentYear && filterMonth === currentMonth}
            className="p-1 rounded hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1" />
        <ViewToggle view={viewMode} onChange={handleViewChange} />
      </div>

      {/* Post list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : hasNoAssignments ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserX className="h-12 w-12 text-amber-400 mb-4" />
            <p className="text-lg font-semibold">Sin clientes asignados</p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              Aún no tienes clientes asignados. Contacta al administrador para que te asigne a uno o más clientes.
            </p>
          </CardContent>
        </Card>
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
            <NuevoLink>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear publicación
              </Button>
            </NuevoLink>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="space-y-4">
          <ContentGrid
            posts={data.posts as any}
            basePath="/editor/contenido"
            showClient
          />
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
          {data.posts.map((post) => {
            const statusColor = POST_STATUS_COLORS[post.status as PostStatus] || "";
            const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
            const thumbnail = post.media?.[0]?.fileUrl;
            const needsAttention = post.status === "CLIENT_CHANGES";

            return (
              <Link key={post.id} href={`/editor/contenido/${post.id}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${needsAttention ? "ring-2 ring-orange-400/50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                        {thumbnail ? (
                          post.media?.[0]?.mimeType?.startsWith("video/") ? (
                            <>
                              <video src={thumbnail} className="w-full h-full object-cover" preload="metadata" muted />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center">
                                  <div className="w-0 h-0 border-l-[8px] border-l-zinc-700 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-0.5" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <FileImage className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {post.title || post.copy?.slice(0, 60) || "Sin título"}
                          </p>
                          {needsAttention && (
                            <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                              Cambios solicitados
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: networkColor }}
                          >
                            {NETWORK_LABELS[post.network as SocialNetwork]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {POST_TYPE_LABELS[post.postType as PostType]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {post.client.companyName}
                          </span>
                        </div>
                      </div>

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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {data.pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}
      </main>
    </div>
  );
}

export default function EditorContenidoPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col flex-1">
        <Topbar title="Contenido" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </main>
      </div>
    }>
      <EditorContenidoInner />
    </Suspense>
  );
}
