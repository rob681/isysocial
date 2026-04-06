"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  TrendingUp,
  BarChart3,
  Play,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const RANGES = [
  { value: "7d" as const, label: "7 d" },
  { value: "14d" as const, label: "14 d" },
  { value: "30d" as const, label: "30 d" },
  { value: "90d" as const, label: "90 d" },
];

type Range = "7d" | "14d" | "30d" | "90d";

const NETWORKS = [
  { value: "INSTAGRAM" as const, label: "Instagram", color: "#E1306C" },
  { value: "FACEBOOK" as const, label: "Facebook", color: "#1877F2" },
];

function StatCard({
  title,
  value,
  icon,
  loading,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  color?: string;
}) {
  if (loading) return <Skeleton className="h-28 rounded-xl" />;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString("es-MX") : value}</p>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: (color ?? "#6366f1") + "20", color: color ?? "#6366f1" }}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SocialAnalyticsPage() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<"INSTAGRAM" | "FACEBOOK">("INSTAGRAM");
  const [range, setRange] = useState<Range>("30d");

  const { data: clients, isLoading: clientsLoading } = trpc.posts.getClientsForSelect.useQuery();

  // Auto-select first client
  if (!selectedClient && clients && clients.length > 0) {
    setSelectedClient(clients[0].id);
  }

  const { data: accountInsights, isLoading: insightsLoading, refetch: refetchInsights } =
    trpc.socialInsights.getAccountInsights.useQuery(
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
    date: new Date(date).toLocaleDateString("es", { day: "numeric", month: "short" }),
    alcance: insightData.reach?.[i] ?? 0,
    impresiones: insightData.impressions?.[i] ?? 0,
  })) ?? [];

  const networkMeta = NETWORKS.find((n) => n.value === selectedNetwork);

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Analytics Social" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">

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
              {NETWORKS.map((net) => (
                <button
                  key={net.value}
                  onClick={() => setSelectedNetwork(net.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedNetwork === net.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: net.color }} />
                  {net.label}
                </button>
              ))}
            </div>

            {/* Range selector */}
            <div className="flex items-center bg-muted rounded-lg p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    range === r.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <Button variant="ghost" size="sm" onClick={() => refetchInsights()} disabled={insightsLoading}>
              <RefreshCw className={`h-4 w-4 ${insightsLoading ? "animate-spin" : ""}`} />
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
              {/* Overview cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Seguidores"
                  value={insightData?.followerCount ?? insightData?.followers_count ?? 0}
                  icon={<Users className="h-5 w-5" />}
                  loading={insightsLoading}
                  color={networkMeta?.color}
                />
                <StatCard
                  title="Alcance"
                  value={overview?.totals?.reach ?? 0}
                  icon={<Eye className="h-5 w-5" />}
                  loading={overviewLoading}
                  color="#10b981"
                />
                <StatCard
                  title="Impresiones"
                  value={overview?.totals?.impressions ?? 0}
                  icon={<TrendingUp className="h-5 w-5" />}
                  loading={overviewLoading}
                  color="#6366f1"
                />
                <StatCard
                  title="Engagement"
                  value={(overview?.totals as any)?.engagement ?? 0}
                  icon={<Heart className="h-5 w-5" />}
                  loading={overviewLoading}
                  color="#f59e0b"
                />
              </div>

              {/* Error state */}
              {(accountInsights as any)?.error && (
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <CardContent className="pt-6 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No se pudieron obtener las analytics</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {(accountInsights as any).error}. Es posible que necesites reconectar la cuenta con los nuevos permisos de analytics.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chart: Reach & Impressions over time */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Alcance e Impresiones
                      <Badge variant="secondary" className="text-[10px]">{networkMeta?.label}</Badge>
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
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                          <Area type="monotone" dataKey="alcance" stroke="#10b981" fill="url(#gradReach)" strokeWidth={2} />
                          <Area type="monotone" dataKey="impresiones" stroke="#6366f1" fill="url(#gradImpressions)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Published posts with individual metrics */}
              <PostInsightsTable clientId={selectedClient} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Published Posts Insights Table ───────────────────────────────── */
function PostInsightsTable({ clientId }: { clientId: string }) {
  const { data, isLoading } = trpc.posts.list.useQuery({
    clientId,
    status: "PUBLISHED" as any,
    page: 1,
    limit: 20,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Posts Publicados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.posts?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Posts Publicados
          <Badge variant="secondary" className="text-[10px]">{data.posts.length} posts</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.posts.map((post) => (
            <PostInsightRow key={post.id} post={post} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PostInsightRow({ post }: { post: any }) {
  const { data: insights, isLoading } = trpc.socialInsights.getPostInsights.useQuery(
    { postId: post.id },
    { staleTime: 10 * 60 * 1000, retry: false }
  );

  const metrics = (insights as any)?.[0];
  const thumbnail = post.media?.[0]?.fileUrl;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {post.title || post.copy?.slice(0, 50) || "Sin t\u00edtulo"}
        </p>
        <p className="text-xs text-muted-foreground">
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
            : post.network}
        </p>
      </div>

      {/* Metrics */}
      {isLoading ? (
        <Skeleton className="h-6 w-32" />
      ) : metrics ? (
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
          {metrics.reach > 0 && (
            <span className="flex items-center gap-1" title="Alcance">
              <Eye className="h-3.5 w-3.5" />
              {metrics.reach.toLocaleString()}
            </span>
          )}
          {metrics.likes > 0 && (
            <span className="flex items-center gap-1" title="Likes">
              <Heart className="h-3.5 w-3.5" />
              {metrics.likes.toLocaleString()}
            </span>
          )}
          {metrics.comments > 0 && (
            <span className="flex items-center gap-1" title="Comentarios">
              <MessageCircle className="h-3.5 w-3.5" />
              {metrics.comments.toLocaleString()}
            </span>
          )}
          {metrics.shares > 0 && (
            <span className="flex items-center gap-1" title="Compartidos">
              <Share2 className="h-3.5 w-3.5" />
              {metrics.shares.toLocaleString()}
            </span>
          )}
          {metrics.saved > 0 && (
            <span className="flex items-center gap-1" title="Guardados">
              <Bookmark className="h-3.5 w-3.5" />
              {metrics.saved.toLocaleString()}
            </span>
          )}
          {metrics.plays > 0 && (
            <span className="flex items-center gap-1" title="Reproducciones">
              <Play className="h-3.5 w-3.5" />
              {metrics.plays.toLocaleString()}
            </span>
          )}
          {metrics.impressions > 0 && (
            <span className="flex items-center gap-1" title="Impresiones">
              <TrendingUp className="h-3.5 w-3.5" />
              {metrics.impressions.toLocaleString()}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Sin datos</span>
      )}
    </div>
  );
}
