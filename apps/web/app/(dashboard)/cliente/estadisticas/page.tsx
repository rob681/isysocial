"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye, Users, Heart, TrendingUp, FileImage, CheckCircle,
  Clock, BarChart3, Calendar, Share2, RefreshCw, AlertCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { NETWORK_LABELS, NETWORK_COLORS, POST_STATUS_LABELS } from "@isysocial/shared";
import type { SocialNetwork } from "@isysocial/shared";
import { cn } from "@/lib/utils";

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ title, value, sub, icon, color, loading }: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; color?: string; loading?: boolean;
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
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: (color ?? "#6366f1") + "20", color: color ?? "#6366f1" }}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const RANGES = [
  { value: "7d" as const, label: "7 días" },
  { value: "30d" as const, label: "30 días" },
  { value: "90d" as const, label: "90 días" },
];
type Range = "7d" | "30d" | "90d";

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ClienteEstadisticasPage() {
  const { data: session } = useSession();
  const clientProfileId = (session?.user as any)?.clientProfileId as string | undefined;
  const [range, setRange] = useState<Range>("30d");
  const [network, setNetwork] = useState<"INSTAGRAM" | "FACEBOOK">("INSTAGRAM");

  // All posts for this client
  const { data: postsData, isLoading: postsLoading } = trpc.posts.list.useQuery({
    page: 1, limit: 200,
  }, { enabled: !!clientProfileId });

  // Account insights (via admin endpoint — clientProfileId used as clientId)
  const { data: insights, isLoading: insightsLoading, error: insightsError, refetch } =
    trpc.socialInsights.getAccountInsights.useQuery(
      { clientId: clientProfileId!, network, range },
      { enabled: !!clientProfileId, staleTime: 5 * 60 * 1000, retry: false }
    );

  const posts = postsData?.posts ?? [];
  const published = posts.filter(p => p.status === "PUBLISHED").length;
  const scheduled = posts.filter(p => p.status === "SCHEDULED").length;
  const inReview = posts.filter(p => p.status === "IN_REVIEW").length;
  const approved = posts.filter(p => p.status === "APPROVED").length;

  // Posts by network
  const byNetwork = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of posts) {
      map[p.network] = (map[p.network] ?? 0) + 1;
    }
    return Object.entries(map).map(([net, count]) => ({
      name: NETWORK_LABELS[net as SocialNetwork] ?? net,
      count,
      color: NETWORK_COLORS[net as SocialNetwork] ?? "#888",
    })).sort((a, b) => b.count - a.count);
  }, [posts]);

  // Chart data from insights
  const insightData = insights?.data as any;
  const chartData = insightData?.dates?.map((date: string, i: number) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short" }),
    alcance: insightData.reach?.[i] ?? 0,
    impresiones: insightData.impressions?.[i] ?? 0,
  })) ?? [];

  const totalReach = (insightData?.reach ?? []).reduce((a: number, b: number) => a + b, 0);
  const followers = insightData?.followerCount ?? 0;

  const networkColor = network === "INSTAGRAM" ? "#E1306C" : "#1877F2";

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Mis Estadísticas" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-5xl mx-auto space-y-6">

          <div>
            <h1 className="text-2xl font-bold">Mis Estadísticas</h1>
            <p className="text-muted-foreground text-sm">
              Rendimiento de tus publicaciones y redes sociales
            </p>
          </div>

          {/* Post stats */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Publicaciones
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Publicados" value={published}
                icon={<CheckCircle className="h-5 w-5" />} color="#10b981" loading={postsLoading} />
              <StatCard title="Programados" value={scheduled}
                icon={<Clock className="h-5 w-5" />} color="#6366f1" loading={postsLoading} />
              <StatCard title="Pendientes aprobación" value={inReview}
                icon={<AlertCircle className="h-5 w-5" />} color="#f59e0b" loading={postsLoading} />
              <StatCard title="Total" value={posts.length}
                icon={<FileImage className="h-5 w-5" />} color="#64748b" loading={postsLoading} />
            </div>
          </div>

          {/* Posts by network */}
          {byNetwork.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Publicaciones por red social
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byNetwork} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(v) => [v, "Posts"]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {byNetwork.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Social Insights */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Métricas de redes sociales
            </h2>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                {[
                  { value: "INSTAGRAM" as const, label: "Instagram", color: "#E1306C" },
                  { value: "FACEBOOK" as const, label: "Facebook", color: "#1877F2" },
                ].map((n) => (
                  <button key={n.value} onClick={() => setNetwork(n.value)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      network === n.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: n.color }} />
                    {n.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                {RANGES.map((r) => (
                  <button key={r.value} onClick={() => setRange(r.value)}
                    className={cn("px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      range === r.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}>
                    {r.label}
                  </button>
                ))}
              </div>
              <button onClick={() => refetch()} disabled={insightsLoading}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className={cn("h-4 w-4", insightsLoading && "animate-spin")} />
              </button>
            </div>

            {insightsError ? (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                <CardContent className="pt-5 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Métricas no disponibles aún
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Tu agencia necesita reconectar tu cuenta de {network === "INSTAGRAM" ? "Instagram" : "Facebook"} con permisos de analytics para ver estas métricas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <StatCard title="Seguidores" value={followers}
                    icon={<Users className="h-5 w-5" />} color={networkColor} loading={insightsLoading} />
                  <StatCard title={`Alcance (${range})`} value={totalReach}
                    sub="personas únicas" icon={<Eye className="h-5 w-5" />} color="#10b981" loading={insightsLoading} />
                  <StatCard
                    title="Impresiones"
                    value={(insightData?.impressions ?? []).reduce((a: number, b: number) => a + b, 0)}
                    sub="veces mostrado"
                    icon={<TrendingUp className="h-5 w-5" />} color="#6366f1" loading={insightsLoading} />
                </div>

                {chartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Alcance diario
                        <Badge variant="secondary" className="text-[10px]">
                          {network === "INSTAGRAM" ? "Instagram" : "Facebook"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={networkColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={networkColor} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{
                              background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                              borderRadius: "8px", fontSize: "12px",
                            }} />
                            <Area type="monotone" dataKey="alcance" name="Alcance" stroke={networkColor}
                              fill="url(#clientGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!insightsLoading && chartData.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                      <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">Sin datos para este período</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
