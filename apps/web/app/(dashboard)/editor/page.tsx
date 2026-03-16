"use client";

import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileImage,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType } from "@isysocial/shared";
import { useSession } from "next-auth/react";

// ── Time ago helper ──────────────────────────────────────────────────────────
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
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function EditorDashboardPage() {
  const { data: session } = useSession();
  const name = session?.user?.name?.split(" ")[0] ?? "Editor";

  const { data, isLoading } = trpc.posts.getEditorDashboardData.useQuery();

  const stats = data?.stats;
  const workload = data?.workloadByClient ?? [];
  const deadlines = data?.upcomingDeadlines ?? [];
  const approved = data?.recentlyApproved ?? [];
  const attention = data?.postsNeedingAttention ?? [];

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {name} 👋</h1>
          <p className="text-muted-foreground mt-1">
            Tu espacio de trabajo como editor de contenido
          </p>
        </div>
        <Link href="/editor/contenido/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva publicación
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{isLoading ? "—" : stats?.totalPosts ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total posts</p>
          </CardContent>
        </Card>
        <Link href="/editor/contenido">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{isLoading ? "—" : stats?.draftCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Borradores</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/editor/contenido">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{isLoading ? "—" : stats?.inReviewCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">En revisión</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/editor/contenido">
          <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${(stats?.changesCount ?? 0) > 0 ? "ring-2 ring-orange-400/50" : ""}`}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{isLoading ? "—" : stats?.changesCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Cambios pedidos</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{isLoading ? "—" : stats?.approvedCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Aprobados</p>
          </CardContent>
        </Card>
      </div>

      {/* Main grid: Attention + Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts needing attention */}
        <Card className={attention.length > 0 ? "border-orange-200 dark:border-orange-800" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Requieren tu atención
            </CardTitle>
            <CardDescription>Posts con cambios solicitados por el cliente</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : attention.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">No hay posts pendientes de cambios</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attention.map((post: any) => {
                  const thumbnail = post.media?.[0]?.fileUrl;
                  const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
                  return (
                    <Link key={post.id} href={`/editor/contenido/${post.id}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {post.title || post.copy?.slice(0, 40) || "Sin título"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: networkColor }}
                            >
                              {NETWORK_LABELS[post.network as SocialNetwork]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {post.client?.companyName}
                            </span>
                            {post._count?.comments > 0 && (
                              <span className="text-xs text-muted-foreground">
                                · {post._count.comments} comentarios
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="flex-shrink-0">
                          Resolver
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workload by Client */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Carga por cliente
            </CardTitle>
            <CardDescription>Distribución de posts activos por cliente</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : workload.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tienes posts asignados</p>
            ) : (
              <div className="space-y-2.5">
                {workload.slice(0, 6).map((client) => {
                  const maxCount = workload[0]?.count ?? 1;
                  const pct = Math.round((client.count / maxCount) * 100);
                  return (
                    <div key={client.clientId} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {client.logoUrl ? (
                          <img src={client.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{client.name}</p>
                          <span className="text-xs font-medium text-muted-foreground ml-2">{client.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deadline Alerts + Recently Approved */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadline alerts */}
        {deadlines.length > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Alertas de entrega
              </CardTitle>
              <CardDescription>Posts con fecha programada pero aún no aprobados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deadlines.map((post: any) => {
                  const schedDate = post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleDateString("es-MX", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                    : "";
                  const statusColor = POST_STATUS_COLORS[post.status as PostStatus] || "#94a3b8";
                  return (
                    <Link key={post.id} href={`/editor/contenido/${post.id}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {post.media?.[0]?.fileUrl ? (
                            <img src={post.media[0].fileUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {post.title || post.copy?.slice(0, 40) || "Sin título"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {post.client?.companyName} · Programado: {schedDate}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs flex-shrink-0"
                          style={{ color: statusColor, borderColor: statusColor + "40" }}
                        >
                          {POST_STATUS_LABELS[post.status as PostStatus]}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recently approved */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Recientemente aprobados
            </CardTitle>
            <CardDescription>Tus últimos posts aprobados por clientes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : approved.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay posts aprobados recientes</p>
            ) : (
              <div className="space-y-2">
                {approved.map((post: any) => {
                  const thumbnail = post.media?.[0]?.fileUrl;
                  const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
                  return (
                    <Link key={post.id} href={`/editor/contenido/${post.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="h-3.5 w-3.5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {post.title || post.copy?.slice(0, 40) || "Sin título"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: networkColor }}
                            >
                              {NETWORK_LABELS[post.network as SocialNetwork]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {post.client?.companyName}
                            </span>
                          </div>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/editor/calendario">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <Calendar className="h-8 w-8 text-primary/60" />
              <div>
                <h3 className="font-semibold">Calendario editorial</h3>
                <p className="text-sm text-muted-foreground">
                  Vista mensual de publicaciones
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/editor/contenido">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <FileImage className="h-8 w-8 text-primary/60" />
              <div>
                <h3 className="font-semibold">Mis contenidos</h3>
                <p className="text-sm text-muted-foreground">
                  Gestiona posts de tus clientes
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>
      </main>
    </div>
  );
}
