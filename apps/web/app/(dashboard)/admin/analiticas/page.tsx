"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileImage,
  CheckCircle,
  Clock,
  Users,
  Lightbulb,
  Eye,
  ArrowUpRight,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import Link from "next/link";
import { exportToCSV } from "@/lib/export-csv";

/* ─── Range Selector ──────────────────────────────────────────────── */
const RANGES = [
  { value: "7d" as const, label: "7 días" },
  { value: "30d" as const, label: "30 días" },
  { value: "90d" as const, label: "90 días" },
  { value: "12m" as const, label: "12 meses" },
];

type Range = "7d" | "30d" | "90d" | "12m";

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
              <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend >= 0 ? "+" : ""}{trend}% vs periodo anterior
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Custom Tooltip ──────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ─── Status labels ───────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  CLIENT_CHANGES: "Cambios",
  APPROVED: "Aprobado",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  PAUSED: "Pausado",
  CANCELLED: "Cancelado",
};

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");

  const { data: overview, isLoading: loadingOverview } =
    trpc.analytics.getOverview.useQuery({ range });

  const { data: postsByStatus, isLoading: loadingStatus } =
    trpc.analytics.getPostsByStatus.useQuery({ range });

  const { data: postsByNetwork, isLoading: loadingNetwork } =
    trpc.analytics.getPostsByNetwork.useQuery({ range });

  const { data: timeline, isLoading: loadingTimeline } =
    trpc.analytics.getPostsTimeline.useQuery({ range });

  const { data: postsByType, isLoading: loadingType } =
    trpc.analytics.getPostsByType.useQuery({ range });

  const { data: clientMetrics, isLoading: loadingClients } =
    trpc.analytics.getClientMetrics.useQuery({ range });

  const { data: editorMetrics, isLoading: loadingEditors } =
    trpc.analytics.getEditorMetrics.useQuery({ range });

  const { data: recentActivity, isLoading: loadingActivity } =
    trpc.analytics.getRecentActivity.useQuery({ limit: 8 });

  const rangeLabel = RANGES.find((r) => r.value === range)?.label || range;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Analíticas" />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Header with Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analíticas
            </h1>
            <p className="text-muted-foreground mt-1">
              Métricas de rendimiento de tu agencia
            </p>
          </div>
          <div className="flex items-center gap-2">
            {clientMetrics && clientMetrics.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportToCSV(
                    clientMetrics,
                    [
                      { key: "companyName", label: "Cliente" },
                      { key: "totalPosts", label: "Posts totales" },
                      { key: "publishedPosts", label: "Publicados" },
                      { key: "approvedPosts", label: "Aprobados" },
                      { key: "pendingPosts", label: "Pendientes" },
                    ],
                    `analiticas-clientes-${range}-${new Date().toISOString().slice(0, 10)}`
                  );
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            )}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {RANGES.map((r) => (
                <Button
                  key={r.value}
                  variant={range === r.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setRange(r.value)}
                  className={range === r.value ? "gradient-primary text-white shadow-sm" : ""}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Overview Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Posts creados"
            value={overview?.postsInRange}
            icon={<FileImage className="h-5 w-5 text-blue-600" />}
            loading={loadingOverview}
            trend={overview?.postsGrowth}
            colorClass="bg-blue-100 dark:bg-blue-950"
          />
          <StatCard
            title="Publicados"
            value={overview?.publishedInRange}
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            loading={loadingOverview}
            trend={overview?.publishedGrowth}
            colorClass="bg-green-100 dark:bg-green-950"
          />
          <StatCard
            title="Pendientes de aprobación"
            value={overview?.pendingApproval}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            loading={loadingOverview}
            colorClass="bg-amber-100 dark:bg-amber-950"
          />
          <StatCard
            title="Tasa de aprobación"
            value={overview ? `${overview.approvalRate}%` : undefined}
            subtitle={`${overview?.approvedInRange ?? 0} aprobados de ${overview?.postsInRange ?? 0}`}
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
            loading={loadingOverview}
            colorClass="bg-purple-100 dark:bg-purple-950"
          />
        </div>

        {/* ── Second row: Ideas + Clients + Editors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Ideas creadas"
            value={overview?.totalIdeas}
            subtitle={`${overview?.ideasConverted ?? 0} convertidas a post (${overview?.conversionRate ?? 0}%)`}
            icon={<Lightbulb className="h-5 w-5 text-yellow-600" />}
            loading={loadingOverview}
            colorClass="bg-yellow-100 dark:bg-yellow-950"
          />
          <StatCard
            title="Clientes activos"
            value={overview?.totalClients}
            icon={<Users className="h-5 w-5 text-cyan-600" />}
            loading={loadingOverview}
            colorClass="bg-cyan-100 dark:bg-cyan-950"
          />
          <StatCard
            title="Editores activos"
            value={overview?.totalEditors}
            icon={<Users className="h-5 w-5 text-indigo-600" />}
            loading={loadingOverview}
            colorClass="bg-indigo-100 dark:bg-indigo-950"
          />
        </div>

        {/* ── Timeline Chart ────────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Actividad de contenido — {rangeLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTimeline ? (
              <Skeleton className="h-[300px] w-full" />
            ) : timeline && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPublished" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => {
                      if (v.length === 7) return v; // YYYY-MM
                      const d = new Date(v + "T00:00:00");
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Creados"
                    stroke="#3b82f6"
                    fill="url(#gradCreated)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="published"
                    name="Publicados"
                    stroke="#22c55e"
                    fill="url(#gradPublished)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos para este periodo
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Charts Row: Status + Network + Type ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Posts by Status */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Posts por estado</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStatus ? (
                <Skeleton className="h-[220px] w-full" />
              ) : postsByStatus && postsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={postsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="label"
                      paddingAngle={3}
                    >
                      {postsByStatus.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posts by Network */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Posts por red social</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingNetwork ? (
                <Skeleton className="h-[220px] w-full" />
              ) : postsByNetwork && postsByNetwork.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={postsByNetwork}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="network"
                      paddingAngle={3}
                    >
                      {postsByNetwork.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posts by Type */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Posts por tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingType ? (
                <Skeleton className="h-[220px] w-full" />
              ) : postsByType && postsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={postsByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      dataKey="label"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={70}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Posts" radius={[0, 4, 4, 0]}>
                      {postsByType.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Client Metrics Table ──────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Rendimiento por cliente</CardTitle>
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
                      <th className="pb-3 font-medium text-muted-foreground">Cliente</th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">Total</th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">Publicados</th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">Pendientes</th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">Progreso</th>
                      <th className="pb-3 font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clientMetrics.map((client) => {
                      const pct = client.totalPosts > 0
                        ? Math.round((client.published / client.totalPosts) * 100)
                        : 0;
                      return (
                        <tr key={client.clientId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {client.logoUrl ? (
                                <img
                                  src={client.logoUrl}
                                  alt={client.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                  {client.name.charAt(0)}
                                </div>
                              )}
                              <span className="font-medium">{client.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center font-semibold">{client.totalPosts}</td>
                          <td className="py-3 text-center">
                            <span className="text-green-600 font-medium">{client.published}</span>
                          </td>
                          <td className="py-3 text-center">
                            {client.pending > 0 ? (
                              <span className="text-amber-600 font-medium">{client.pending}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <Link href={`/admin/clientes/${client.clientId}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Eye className="h-3.5 w-3.5" />
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

        {/* ── Bottom Row: Editors + Recent Activity ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Editor Metrics */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Productividad por editor</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEditors ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : editorMetrics && editorMetrics.length > 0 ? (
                <div className="space-y-3">
                  {editorMetrics.map((editor) => {
                    const pct =
                      editor.totalPosts > 0
                        ? Math.round((editor.published / editor.totalPosts) * 100)
                        : 0;
                    return (
                      <div
                        key={editor.editorId}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        {editor.avatarUrl ? (
                          <img
                            src={editor.avatarUrl}
                            alt={editor.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                            {editor.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{editor.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {editor.totalPosts} posts
                            </span>
                            <span className="text-xs text-green-600">
                              {editor.published} publicados
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({pct}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No hay editores activos
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Actividad reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      {activity.changedBy?.avatarUrl ? (
                        <img
                          src={activity.changedBy.avatarUrl}
                          alt={activity.changedBy.name || ""}
                          className="w-7 h-7 rounded-full object-cover mt-0.5"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold mt-0.5">
                          {activity.changedBy?.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {activity.changedBy?.name || "Sistema"}
                          </span>{" "}
                          cambió{" "}
                          <Link
                            href={`/admin/contenido/${activity.post.id}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {activity.post.title || "sin título"}
                          </Link>{" "}
                          a{" "}
                          <span className="font-medium">
                            {STATUS_LABELS[activity.toStatus] || activity.toStatus}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(activity.changedAt).toLocaleDateString("es", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Link href={`/admin/contenido/${activity.post.id}`}>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No hay actividad reciente
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
