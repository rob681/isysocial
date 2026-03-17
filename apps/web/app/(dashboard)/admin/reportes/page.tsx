"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileBarChart,
  FileImage,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

/* ─── Range Selector ──────────────────────────────────────────────── */
const RANGES = [
  { value: "7d" as const, label: "7 dias" },
  { value: "30d" as const, label: "30 dias" },
  { value: "90d" as const, label: "90 dias" },
];
type Range = "7d" | "30d" | "90d";

/* ─── Network display helpers ─────────────────────────────────────── */
const NETWORK_COLORS: Record<string, string> = {
  INSTAGRAM: "#E4405F",
  FACEBOOK: "#1877F2",
  LINKEDIN: "#0A66C2",
  TIKTOK: "#000000",
  X: "#1DA1F2",
};

const NETWORK_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  X: "X (Twitter)",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  IN_REVIEW: "#3b82f6",
  CLIENT_CHANGES: "#f97316",
  APPROVED: "#22c55e",
  SCHEDULED: "#06b6d4",
  PUBLISHED: "#8b5cf6",
  PAUSED: "#eab308",
  CANCELLED: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revision",
  CLIENT_CHANGES: "Cambios",
  APPROVED: "Aprobado",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  PAUSED: "Pausado",
  CANCELLED: "Cancelado",
};

/* ─── Horizontal Bar Chart (CSS only) ─────────────────────────────── */
function HorizontalBarChart({
  data,
  loading,
}: {
  data: { label: string; value: number; color: string }[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Sin datos
      </div>
    );
  }
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-sm w-24 truncate text-right text-muted-foreground">
            {item.label}
          </span>
          <div className="flex-1 h-7 bg-muted rounded overflow-hidden relative">
            <div
              className="h-full rounded transition-all duration-500 ease-out"
              style={{
                width: `${Math.max((item.value / maxVal) * 100, 2)}%`,
                backgroundColor: item.color,
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold">
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Vertical Bar Chart (CSS only) ───────────────────────────────── */
function VerticalBarChart({
  data,
  loading,
}: {
  data: { label: string; created: number; published: number }[];
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-[220px] w-full" />;
  }
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
        Sin datos
      </div>
    );
  }
  const maxVal = Math.max(...data.flatMap((d) => [d.created, d.published]), 1);

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span>Creados</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Publicados</span>
        </div>
      </div>
      {/* Bars */}
      <div className="flex items-end gap-3 h-[180px]">
        {data.map((week) => (
          <div key={week.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-1 w-full h-[140px]">
              {/* Created bar */}
              <div className="flex-1 flex flex-col justify-end items-center">
                <span className="text-[10px] font-semibold text-muted-foreground mb-1">
                  {week.created}
                </span>
                <div
                  className="w-full rounded-t bg-blue-500 transition-all duration-500 ease-out min-h-[4px]"
                  style={{
                    height: `${Math.max((week.created / maxVal) * 120, 4)}px`,
                  }}
                />
              </div>
              {/* Published bar */}
              <div className="flex-1 flex flex-col justify-end items-center">
                <span className="text-[10px] font-semibold text-muted-foreground mb-1">
                  {week.published}
                </span>
                <div
                  className="w-full rounded-t bg-green-500 transition-all duration-500 ease-out min-h-[4px]"
                  style={{
                    height: `${Math.max((week.published / maxVal) * 120, 4)}px`,
                  }}
                />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground text-center leading-tight mt-1">
              {week.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────────────────── */
function StatCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  trend,
  colorClass,
}: {
  title: string;
  value: number | string | undefined;
  subtitle?: string;
  icon: React.ReactNode;
  loading: boolean;
  trend?: number;
  colorClass: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{value ?? 0}</p>
            )}
            {subtitle && !loading && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend !== undefined && !loading && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  trend >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend >= 0 ? "+" : ""}
                {trend}% vs periodo anterior
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function ReportesPage() {
  const [range, setRange] = useState<Range>("30d");

  // Overview metrics
  const { data: overview, isLoading: loadingOverview } =
    trpc.analytics.getOverview.useQuery({ range });

  // Posts by status
  const { data: postsByStatus, isLoading: loadingStatus } =
    trpc.analytics.getPostsByStatus.useQuery({ range });

  // Posts by network
  const { data: postsByNetwork, isLoading: loadingNetwork } =
    trpc.analytics.getPostsByNetwork.useQuery({ range });

  // Weekly publishing activity
  const { data: weeklyData, isLoading: loadingWeekly } =
    trpc.analytics.getWeeklyPublishing.useQuery();

  // Recent published posts
  const { data: recentPublished, isLoading: loadingRecent } =
    trpc.analytics.getRecentPublished.useQuery({ limit: 10 });

  // Client metrics
  const { data: clientMetrics, isLoading: loadingClients } =
    trpc.analytics.getClientMetrics.useQuery({ range });

  // Map data for charts
  const statusChartData = (postsByStatus ?? []).map((s) => ({
    label: s.label,
    value: s.count,
    color: s.color,
  }));

  const networkChartData = (postsByNetwork ?? []).map((n) => ({
    label: NETWORK_LABELS[n.network] || n.network,
    value: n.count,
    color: NETWORK_COLORS[n.network] || "#94a3b8",
  }));

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Reportes" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileBarChart className="h-6 w-6 text-primary" />
              Reportes
            </h1>
            <p className="text-muted-foreground mt-1">
              Resumen de rendimiento y actividad de publicaciones
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant={range === r.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setRange(r.value)}
                className={
                  range === r.value ? "gradient-primary text-white shadow-sm" : ""
                }
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Posts publicados"
            value={overview?.publishedInRange}
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            loading={loadingOverview}
            trend={overview?.publishedGrowth}
            colorClass="bg-green-100 dark:bg-green-950"
          />
          <StatCard
            title="Tasa de aprobacion"
            value={overview ? `${overview.approvalRate}%` : undefined}
            subtitle={`${overview?.approvedInRange ?? 0} aprobados de ${overview?.postsInRange ?? 0}`}
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
            loading={loadingOverview}
            colorClass="bg-purple-100 dark:bg-purple-950"
          />
          <StatCard
            title="Posts este periodo"
            value={overview?.postsInRange}
            icon={<FileImage className="h-5 w-5 text-blue-600" />}
            loading={loadingOverview}
            trend={overview?.postsGrowth}
            colorClass="bg-blue-100 dark:bg-blue-950"
          />
          <StatCard
            title="Pendientes de aprobacion"
            value={overview?.pendingApproval}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            loading={loadingOverview}
            colorClass="bg-amber-100 dark:bg-amber-950"
          />
        </div>

        {/* ── Charts Section ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Posts by Status */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Posts por estado</CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={statusChartData} loading={loadingStatus} />
            </CardContent>
          </Card>

          {/* Posts by Network */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Posts por red social</CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={networkChartData} loading={loadingNetwork} />
            </CardContent>
          </Card>
        </div>

        {/* ── Weekly Activity ──────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Actividad semanal (ultimas 4 semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VerticalBarChart data={weeklyData ?? []} loading={loadingWeekly} />
          </CardContent>
        </Card>

        {/* ── Recent Published Posts Table ──────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Publicaciones recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentPublished && recentPublished.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">
                        Post
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground">
                        Cliente
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">
                        Red
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">
                        Tipo
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">
                        Fecha
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentPublished.map((post) => (
                      <tr
                        key={post.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 max-w-[200px]">
                          <span className="font-medium truncate block">
                            {post.title || "Sin titulo"}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {post.client.companyName || post.client.user.name || "—"}
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: NETWORK_COLORS[post.network] || "#94a3b8",
                              color: NETWORK_COLORS[post.network] || "#94a3b8",
                            }}
                          >
                            {NETWORK_LABELS[post.network] || post.network}
                          </Badge>
                        </td>
                        <td className="py-3 text-center text-xs text-muted-foreground">
                          {post.postType}
                        </td>
                        <td className="py-3 text-center text-xs text-muted-foreground">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString("es", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="py-3">
                          <Link href={`/admin/contenido/${post.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No hay publicaciones recientes
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Client Performance Table ─────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Rendimiento por cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingClients ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : clientMetrics && clientMetrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">
                        Cliente
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">
                        Posts
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">
                        Publicados
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">
                        Pendientes
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">
                        Tasa pub.
                      </th>
                      <th className="pb-3 font-medium text-muted-foreground" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clientMetrics.map((client) => {
                      const publishRate =
                        client.totalPosts > 0
                          ? Math.round(
                              (client.published / client.totalPosts) * 100
                            )
                          : 0;
                      return (
                        <tr
                          key={client.clientId}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {client.logoUrl ? (
                                <img
                                  src={client.logoUrl}
                                  alt={client.name}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                  {client.name.charAt(0)}
                                </div>
                              )}
                              <span className="font-medium">{client.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center font-semibold">
                            {client.totalPosts}
                          </td>
                          <td className="py-3 text-center">
                            <span className="text-green-600 font-medium">
                              {client.published}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            {client.pending > 0 ? (
                              <span className="text-amber-600 font-medium">
                                {client.pending}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${publishRate}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">
                                {publishRate}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <Link
                              href={`/admin/clientes/${client.clientId}`}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No hay clientes activos
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
