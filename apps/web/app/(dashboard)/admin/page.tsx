"use client";

import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  UserCircle,
  Users,
  FileImage,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  CalendarDays,
  Activity,
  Plus,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  NETWORK_LABELS,
  NETWORK_COLORS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus } from "@isysocial/shared";

// ── Pipeline colors ──────────────────────────────────────────────────────────
const STATUS_PIPELINE_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  IN_REVIEW: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  CLIENT_CHANGES: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  APPROVED: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  SCHEDULED: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
  PUBLISHED: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  PAUSED: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  CANCELLED: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
};

function StatCard({
  title,
  value,
  icon,
  loading,
  href,
  colorClass,
  subtitle,
}: {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  loading: boolean;
  href?: string;
  colorClass: string;
  subtitle?: string;
}) {
  const content = (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-1">{value ?? 0}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

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

export default function AdminDashboardPage() {
  const { data, isLoading } = trpc.agencies.getDashboardData.useQuery();

  const stats = data?.stats;
  const pipeline = data?.pipeline ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const upcomingPosts = data?.upcomingPosts ?? [];
  const oldestPending = data?.oldestPending ?? [];

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel de control</h1>
            <p className="text-muted-foreground mt-1">
              Resumen general de tu agencia
            </p>
          </div>
          <Link href="/admin/contenido/nuevo">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo post
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Clientes"
            value={stats?.totalClients}
            icon={<UserCircle className="h-5 w-5 text-blue-600" />}
            loading={isLoading}
            href="/admin/clientes"
            colorClass="bg-blue-100 dark:bg-blue-950"
          />
          <StatCard
            title="Editores"
            value={stats?.totalEditors}
            icon={<Users className="h-5 w-5 text-emerald-600" />}
            loading={isLoading}
            href="/admin/equipo"
            colorClass="bg-emerald-100 dark:bg-emerald-950"
          />
          <StatCard
            title="Posts totales"
            value={stats?.totalPosts}
            icon={<FileImage className="h-5 w-5 text-purple-600" />}
            loading={isLoading}
            href="/admin/contenido"
            colorClass="bg-purple-100 dark:bg-purple-950"
          />
          <StatCard
            title="Por aprobar"
            value={stats?.pendingApprovals}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            loading={isLoading}
            href="/admin/aprobaciones"
            colorClass="bg-amber-100 dark:bg-amber-950"
          />
          <StatCard
            title="Este mes"
            value={stats?.publishedThisMonth}
            icon={<TrendingUp className="h-5 w-5 text-cyan-600" />}
            loading={isLoading}
            colorClass="bg-cyan-100 dark:bg-cyan-950"
            subtitle="publicados"
          />
        </div>

        {/* Pipeline + Pending Approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content Pipeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Pipeline de contenido
              </CardTitle>
              <CardDescription>Estado actual de todas las publicaciones</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(["DRAFT", "IN_REVIEW", "CLIENT_CHANGES", "APPROVED", "SCHEDULED", "PUBLISHED"] as const).map(
                    (status) => {
                      const item = pipeline.find((p) => p.status === status);
                      const count = item?.count ?? 0;
                      const total = pipeline.reduce((acc, p) => acc + p.count, 0);
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                      return (
                        <div key={status} className="flex items-center gap-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-md min-w-[120px] text-center ${STATUS_PIPELINE_COLORS[status]}`}>
                            {POST_STATUS_LABELS[status as PostStatus]}
                          </span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: POST_STATUS_COLORS[status as PostStatus] || "#94a3b8",
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-10 text-right">{count}</span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals - Oldest first */}
          <Card className={oldestPending.length > 0 ? "border-amber-200 dark:border-amber-800" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Esperando aprobación
                </CardTitle>
                {oldestPending.length > 0 && (
                  <Link href="/admin/aprobaciones">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Ver cola
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
              <CardDescription>Posts con más tiempo en revisión</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : oldestPending.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay posts pendientes de aprobación</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {oldestPending.map((post) => {
                    const thumbnail = (post as any).media?.[0]?.fileUrl;
                    const waitTime = timeAgo(post.updatedAt);
                    return (
                      <Link key={post.id} href={`/admin/contenido/${post.id}`}>
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
                              {post.title || (post as any).copy?.slice(0, 40) || "Sin título"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(post as any).client?.companyName} · {waitTime}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 flex-shrink-0">
                            En revisión
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity + Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Actividad reciente
              </CardTitle>
              <CardDescription>Últimos cambios de estado en publicaciones</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin actividad reciente</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((log: any) => {
                    const statusLabel = POST_STATUS_LABELS[log.toStatus as PostStatus] || log.toStatus;
                    const statusColor = POST_STATUS_COLORS[log.toStatus as PostStatus] || "#94a3b8";
                    const networkColor = NETWORK_COLORS[log.post?.network as SocialNetwork] || "#888";
                    return (
                      <Link key={log.id} href={`/admin/contenido/${log.post?.id}`}>
                        <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                          <div
                            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: statusColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{log.changedBy?.name}</span>
                              {" "}cambió{" "}
                              <span className="font-medium truncate">
                                {log.post?.title || log.post?.client?.companyName || "post"}
                              </span>
                              {" "}a{" "}
                              <span
                                className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: statusColor }}
                              >
                                {statusLabel}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {timeAgo(log.changedAt)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Posts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Próximos 7 días
                </CardTitle>
                <Link href="/admin/calendario">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Calendario
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription>Posts programados para esta semana</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : upcomingPosts.length === 0 ? (
                <div className="text-center py-6">
                  <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay posts programados esta semana</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingPosts.map((post: any) => {
                    const thumbnail = post.media?.[0]?.fileUrl;
                    const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
                    const schedDate = post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleDateString("es-MX", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    return (
                      <Link key={post.id} href={`/admin/contenido/${post.id}`}>
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
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0">{schedDate}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Acciones rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/clientes">
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-blue-100 dark:bg-blue-950">
                    <UserCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Clientes</h3>
                    <p className="text-xs text-muted-foreground">Gestionar cuentas</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/equipo">
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Equipo</h3>
                    <p className="text-xs text-muted-foreground">Editores y permisos</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/contenido/nuevo">
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-purple-100 dark:bg-purple-950">
                    <Plus className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Nuevo post</h3>
                    <p className="text-xs text-muted-foreground">Crear contenido</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/aprobaciones">
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-amber-100 dark:bg-amber-950">
                    <Eye className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Aprobaciones</h3>
                    <p className="text-xs text-muted-foreground">Cola de revisión</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
