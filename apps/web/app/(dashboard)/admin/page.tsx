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
  IN_REVIEW: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  CLIENT_CHANGES: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  APPROVED: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  SCHEDULED: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  PUBLISHED: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  PAUSED: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  CANCELLED: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
};

// ── Pipeline bar hex colors (for style prop — Tailwind classes don't work in style) ──
const STATUS_PIPELINE_HEX: Record<string, string> = {
  DRAFT: "#94a3b8",
  IN_REVIEW: "#facc15",
  CLIENT_CHANGES: "#fb923c",
  APPROVED: "#22c55e",
  SCHEDULED: "#3b82f6",
  PUBLISHED: "#10b981",
  PAUSED: "#a855f7",
  CANCELLED: "#ef4444",
};

function StatCard({
  title,
  value,
  icon,
  loading,
  href,
  colorClass,
  subtitle,
  accentColor,
}: {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  loading: boolean;
  href?: string;
  colorClass: string;
  subtitle?: string;
  accentColor?: string;
}) {
  const content = (
    <Card className="shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      {accentColor && (
        <div className="h-1 w-full transition-all duration-200 group-hover:h-1.5" style={{ background: accentColor }} />
      )}
      <CardContent className="pt-4 pb-4">
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
  const { data: guidedReviews, isLoading: guidedReviewsLoading } = trpc.posts.listGuidedReviews.useQuery({ status: "PENDING" });

  const stats = data?.stats;
  const pipeline = data?.pipeline ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const upcomingPosts = data?.upcomingPosts ?? [];
  const oldestPending = data?.oldestPending ?? [];

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {/* Welcome banner */}
        <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 px-6 py-5 flex items-center justify-between">
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
            accentColor="#2563eb"
          />
          <StatCard
            title="Editores"
            value={stats?.totalEditors}
            icon={<Users className="h-5 w-5 text-emerald-600" />}
            loading={isLoading}
            href="/admin/equipo"
            colorClass="bg-emerald-100 dark:bg-emerald-950"
            accentColor="#059669"
          />
          <StatCard
            title="Posts totales"
            value={stats?.totalPosts}
            icon={<FileImage className="h-5 w-5 text-purple-600" />}
            loading={isLoading}
            href="/admin/contenido"
            colorClass="bg-purple-100 dark:bg-purple-950"
            accentColor="#9333ea"
          />
          <StatCard
            title="Por aprobar"
            value={stats?.pendingApprovals}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            loading={isLoading}
            href="/admin/aprobaciones"
            colorClass="bg-amber-100 dark:bg-amber-950"
            accentColor="#d97706"
          />
          <StatCard
            title="Este mes"
            value={stats?.publishedThisMonth}
            icon={<TrendingUp className="h-5 w-5 text-cyan-600" />}
            loading={isLoading}
            colorClass="bg-cyan-100 dark:bg-cyan-950"
            subtitle="publicados"
            accentColor="#0891b2"
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
                        <div key={status} className="flex items-center gap-3 group">
                          <span className={`text-xs font-medium px-2 py-1 rounded-md min-w-[130px] text-center ${STATUS_PIPELINE_COLORS[status]}`}>
                            {POST_STATUS_LABELS[status as PostStatus]}
                          </span>
                          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: STATUS_PIPELINE_HEX[status] || "#94a3b8",
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 w-16 justify-end">
                            <span className="text-sm font-bold tabular-nums">{count}</span>
                            {pct > 0 && <span className="text-xs text-muted-foreground">{pct}%</span>}
                          </div>
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

        {/* Guided Reviews */}
        {!guidedReviewsLoading && guidedReviews && guidedReviews.length > 0 && (
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                Revisiones guiadas pendientes
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 ml-2">
                  {guidedReviews.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Clientes que han solicitado una sesión de revisión guiada con un creativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {guidedReviews.map((review: any) => (
                  <Link key={review.id} href={`/admin/contenido/${review.post?.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer border border-purple-100 dark:border-purple-900">
                      <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-950 flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {review.post?.copy?.slice(0, 50) || "Publicación"} — {review.client?.companyName || "Cliente"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Solicitada {timeAgo(review.requestedAt)}
                          {review.notes && ` · "${review.notes.slice(0, 60)}${review.notes.length > 60 ? "..." : ""}"`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs text-purple-600 border-purple-200 flex-shrink-0">
                        Pendiente
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Acciones rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/clientes">
              <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
                    <UserCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Clientes</h3>
                    <p className="text-xs text-muted-foreground">Gestionar cuentas</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/equipo">
              <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900 transition-colors">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Equipo</h3>
                    <p className="text-xs text-muted-foreground">Editores y permisos</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/contenido/nuevo">
              <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 group-hover:bg-purple-200 dark:group-hover:bg-purple-900 transition-colors">
                    <Plus className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Nuevo post</h3>
                    <p className="text-xs text-muted-foreground">Crear contenido</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/aprobaciones">
              <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 group-hover:bg-amber-200 dark:group-hover:bg-amber-900 transition-colors">
                    <Eye className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Aprobaciones</h3>
                    <p className="text-xs text-muted-foreground">Cola de revisión</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
