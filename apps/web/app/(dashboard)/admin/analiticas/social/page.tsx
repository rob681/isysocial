"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Eye, Users, Heart, MessageCircle, Share2, Bookmark,
  TrendingUp, BarChart3, Play, RefreshCw, AlertCircle,
  ExternalLink, Instagram, Facebook, Image,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

/* ─── Constants ─────────────────────────────────────────────── */

const RANGES = [
  { value: "7d" as const, label: "7 días" },
  { value: "14d" as const, label: "14 días" },
  { value: "30d" as const, label: "30 días" },
  { value: "90d" as const, label: "90 días" },
];

type Range = "7d" | "14d" | "30d" | "90d";

const NETWORKS = [
  { value: "INSTAGRAM" as const, label: "Instagram", color: "#E1306C", icon: Instagram },
  { value: "FACEBOOK" as const, label: "Facebook", color: "#1877F2", icon: Facebook },
];

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({
  title, value, sub, icon, loading, color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  loading?: boolean;
  color?: string;
}) {
  if (loading) return <Skeleton className="h-28 rounded-xl" />;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {typeof value === "number" ? value.toLocaleString("es-MX") : value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: (color ?? "#6366f1") + "20", color: color ?? "#6366f1" }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function SocialAnalyticsPage() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<"INSTAGRAM" | "FACEBOOK">("INSTAGRAM");
  const [range, setRange] = useState<Range>("30d");
  const [tab, setTab] = useState<"overview" | "posts">("overview");

  const { data: clients, isLoading: clientsLoading } = trpc.posts.getClientsForSelect.useQuery();

  // Auto-select first client
  if (!selectedClient && clients && clients.length > 0) {
    setSelectedClient(clients[0].id);
  }

  const {
    data: accountInsights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights,
  } = trpc.socialInsights.getAccountInsights.useQuery(
    { clientId: selectedClient, network: selectedNetwork, range },
    { enabled: !!selectedClient, staleTime: 5 * 60 * 1000, retry: false }
  );

  const { data: overview, isLoading: overviewLoading } =
    trpc.socialInsights.getClientOverview.useQuery(
      { clientId: selectedClient, range },
      { enabled: !!selectedClient, staleTime: 5 * 60 * 1000, retry: false }
    );

  // Build chart data from time series
  const insightData = accountInsights?.data as any;
  const chartData = insightData?.dates?.map((date: string, i: number) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short" }),
    alcance: insightData.reach?.[i] ?? 0,
    impresiones: insightData.impressions?.[i] ?? 0,
  })) ?? [];

  const networkMeta = NETWORKS.find((n) => n.value === selectedNetwork);
  const totalReach = (insightData?.reach ?? []).reduce((a: number, b: number) => a + b, 0);
  const totalImpressions = (insightData?.impressions ?? []).reduce((a: number, b: number) => a + b, 0);
  const followers = insightData?.followerCount ?? 0;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Analytics Social" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Analytics de Redes Sociales</h1>
            <p className="text-muted-foreground text-sm">
              Métricas reales desde Meta Graph API
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Client selector */}
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              disabled={clientsLoading}
            >
              <option value="">Selecciona un cliente</option>
              {clients?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>

            {/* Network tabs */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              {NETWORKS.map((net) => {
                const Icon = net.icon;
                return (
                  <button
                    key={net.value}
                    onClick={() => setSelectedNetwork(net.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      selectedNetwork === net.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: selectedNetwork === net.value ? net.color : undefined }} />
                    {net.label}
                  </button>
                );
              })}
            </div>

            {/* Range selector */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    range === r.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <Button variant="ghost" size="sm" onClick={() => refetchInsights()} disabled={insightsLoading}>
              <RefreshCw className={cn("h-4 w-4", insightsLoading && "animate-spin")} />
            </Button>
          </div>

          {!selectedClient ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Selecciona un cliente</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Elige un cliente para ver sus analytics de redes sociales
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Error: needs to reconnect */}
              {insightsError && (
                <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardContent className="pt-5 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Se necesitan permisos de analytics
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        El cliente debe reconectar su cuenta de {networkMeta?.label} para otorgar los nuevos permisos de insights.
                        Ve a Clientes → {clients?.find((c: any) => c.id === selectedClient)?.companyName} → Conexiones y haz clic en &quot;Reconectar&quot;.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b">
                {[
                  { key: "overview" as const, label: "Resumen de cuenta" },
                  { key: "posts" as const, label: "Posts históricos" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                      tab === t.key
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      title="Seguidores"
                      value={followers}
                      icon={<Users className="h-5 w-5" />}
                      loading={insightsLoading}
                      color={networkMeta?.color}
                    />
                    <StatCard
                      title={`Alcance (${range})`}
                      value={totalReach}
                      sub="personas únicas"
                      icon={<Eye className="h-5 w-5" />}
                      loading={insightsLoading}
                      color="#10b981"
                    />
                    <StatCard
                      title={`Impresiones (${range})`}
                      value={totalImpressions}
                      sub="veces mostrado"
                      icon={<TrendingUp className="h-5 w-5" />}
                      loading={insightsLoading}
                      color="#6366f1"
                    />
                    <StatCard
                      title="Redes conectadas"
                      value={overview?.totals?.networksConnected ?? 0}
                      icon={<BarChart3 className="h-5 w-5" />}
                      loading={overviewLoading}
                      color="#f59e0b"
                    />
                  </div>

                  {/* Chart */}
                  {insightsLoading ? (
                    <Skeleton className="h-[300px] w-full rounded-xl" />
                  ) : chartData.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Alcance e Impresiones — últimos {range}
                          <Badge variant="secondary" className="text-[10px]">
                            {networkMeta?.label}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradImpressions" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                }}
                              />
                              <Area type="monotone" dataKey="alcance" name="Alcance" stroke="#10b981" fill="url(#gradReach)" strokeWidth={2} />
                              <Area type="monotone" dataKey="impresiones" name="Impresiones" stroke="#6366f1" fill="url(#gradImpressions)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  ) : !insightsLoading && !insightsError ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">Sin datos para este período</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Puede que el cliente necesite reconectar su cuenta con permisos de analytics.
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}
                </>
              )}

              {tab === "posts" && (
                <IGMediaListSection clientId={selectedClient} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Posts Históricos (Media List from IG API) ──────────────── */
function IGMediaListSection({ clientId }: { clientId: string }) {
  const [limit, setLimit] = useState(20);

  const { data, isLoading, error, refetch } = trpc.socialInsights.getIGMediaList.useQuery(
    { clientId, limit },
    { staleTime: 5 * 60 * 1000, retry: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="pt-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No se pudieron obtener los posts</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Reconecta la cuenta de Instagram con permisos de analytics para acceder al historial de posts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.media?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Image className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No hay posts de Instagram</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Posts de Instagram</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Historial completo de la cuenta — ordenado por mayor alcance
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3">
        {data.media.map((item, i) => (
          <IGMediaCard key={item.id} item={item} rank={i + 1} />
        ))}
      </div>

      {data.total > limit && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setLimit((l) => l + 20)}
        >
          Ver más posts
        </Button>
      )}
    </div>
  );
}

function IGMediaCard({ item, rank }: { item: any; rank: number }) {
  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const isVideo = item.mediaType === "VIDEO" || item.mediaType === "REELS";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
      {/* Rank */}
      <span className="text-xs font-bold text-muted-foreground/50 w-5 text-center flex-shrink-0">
        {rank}
      </span>

      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          isVideo ? <Play className="h-5 w-5 text-muted-foreground/40" /> : <Image className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 px-1.5 py-0.5 rounded font-medium">
            {isVideo ? "Video" : "Imagen"}
          </span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        {item.caption && (
          <p className="text-sm text-muted-foreground truncate">{item.caption}</p>
        )}
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Metric icon={<Eye className="h-3.5 w-3.5" />} value={item.reach} label="Alcance" color="text-emerald-600" />
        <Metric icon={<TrendingUp className="h-3.5 w-3.5" />} value={item.impressions} label="Impresiones" color="text-indigo-600" />
        <Metric icon={<Heart className="h-3.5 w-3.5" />} value={item.likes} label="Likes" color="text-rose-500" />
        <Metric icon={<MessageCircle className="h-3.5 w-3.5" />} value={item.comments} label="Comentarios" color="text-blue-500" />
        {item.saved > 0 && <Metric icon={<Bookmark className="h-3.5 w-3.5" />} value={item.saved} label="Guardados" color="text-amber-500" />}
        {item.plays > 0 && <Metric icon={<Play className="h-3.5 w-3.5" />} value={item.plays} label="Reproducciones" color="text-purple-500" />}
      </div>

      {/* Link */}
      {item.permalink && (
        <a
          href={item.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          title="Ver en Instagram"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function Metric({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color?: string }) {
  if (value === 0) return null;
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[40px]" title={label}>
      <div className={cn("flex items-center gap-1", color ?? "text-muted-foreground")}>
        {icon}
        <span className="text-xs font-semibold">{value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground hidden sm:block">{label}</span>
    </div>
  );
}
