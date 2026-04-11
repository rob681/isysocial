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
  TrendingUp, TrendingDown, BarChart3, Play, RefreshCw, AlertCircle,
  ExternalLink, Instagram, Facebook, Image, MousePointerClick,
  UserPlus, Globe, Award, ArrowUpRight, ArrowDownRight, Minus,
  Download, Clock, FileText,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

/* ─── Constants ─────────────────────────────────────────────── */

const RANGES = [
  { value: "7d" as const, label: "7 días" },
  { value: "14d" as const, label: "14 días" },
  { value: "30d" as const, label: "30 días" },
  { value: "90d" as const, label: "90 días" },
];

const RANGE_LABELS: Record<string, string> = {
  "7d": "vs semana anterior",
  "14d": "vs 2 semanas anteriores",
  "30d": "vs mes anterior",
  "90d": "vs trimestre anterior",
};

type Range = "7d" | "14d" | "30d" | "90d";

const NETWORKS = [
  { value: "INSTAGRAM" as const, label: "Instagram", color: "#E1306C", icon: Instagram },
  { value: "FACEBOOK" as const, label: "Facebook", color: "#1877F2", icon: Facebook },
];

/* ─── Delta Badge ────────────────────────────────────────────── */
function DeltaBadge({ delta, rangeLabel }: { delta: number | null | undefined; rangeLabel: string }) {
  if (delta === null || delta === undefined) return null;
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium",
        isNeutral ? "text-muted-foreground" : isPositive ? "text-emerald-600" : "text-rose-600"
      )}
      title={rangeLabel}
    >
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(delta)}%
    </span>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({
  title, value, sub, icon, loading, color, highlight, delta, rangeLabel,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  loading?: boolean;
  color?: string;
  highlight?: boolean;
  delta?: number | null;
  rangeLabel?: string;
}) {
  if (loading) return <Skeleton className="h-28 rounded-xl" />;
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {typeof value === "number" ? value.toLocaleString("es-MX") : value}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              {delta !== undefined && rangeLabel && (
                <DeltaBadge delta={delta} rangeLabel={rangeLabel} />
              )}
            </div>
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

  const insightData = accountInsights?.data as any;
  const currentTotals = accountInsights?.currentTotals as any;
  const deltas = accountInsights?.deltas as any;
  const isFacebook = selectedNetwork === "FACEBOOK";
  const rangeLabel = RANGE_LABELS[range] ?? "vs período anterior";

  const chartData = insightData?.dates?.map((date: string, i: number) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short" }),
    alcance: insightData.reach?.[i] ?? 0,
    impresiones: insightData.impressions?.[i] ?? 0,
    ...(isFacebook && { engagements: insightData.postEngagements?.[i] ?? 0, nuevosFans: insightData.fanAdds?.[i] ?? 0 }),
    ...(!isFacebook && { vistasPerf: insightData.profileViews?.[i] ?? 0 }),
  })) ?? [];

  const networkMeta = NETWORKS.find((n) => n.value === selectedNetwork);

  // IG totals (from currentTotals if available, fallback to local compute)
  const followers = insightData?.followerCount ?? 0;
  const totalReach = currentTotals?.reach ?? (insightData?.reach ?? []).reduce((a: number, b: number) => a + b, 0);
  const totalImpressions = currentTotals?.impressions ?? (insightData?.impressions ?? []).reduce((a: number, b: number) => a + b, 0);
  const totalProfileViews = currentTotals?.profileViews ?? (insightData?.profileViews ?? []).reduce((a: number, b: number) => a + b, 0);
  const totalWebsiteClicks = currentTotals?.websiteClicks ?? (insightData?.websiteClicks ?? []).reduce((a: number, b: number) => a + b, 0);

  // FB totals
  const fanCount = insightData?.fanCount ?? 0;
  const totalFanAdds = currentTotals?.fanAdds ?? (insightData?.fanAdds ?? []).reduce((a: number, b: number) => a + b, 0);
  const totalPostEngagements = currentTotals?.postEngagements ?? (insightData?.postEngagements ?? []).reduce((a: number, b: number) => a + b, 0);
  const totalVideoViews = currentTotals?.videoViews ?? (insightData?.videoViews ?? []).reduce((a: number, b: number) => a + b, 0);

  const isPendingAppReview =
    !isFacebook &&
    !insightsLoading &&
    !insightsError &&
    followers > 0 &&
    totalReach === 0 &&
    totalImpressions === 0;

  const clientName = clients?.find((c: any) => c.id === selectedClient)?.companyName ?? "";
  const reportDate = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  const reportTime = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const rangeLabelFull = RANGES.find((r) => r.value === range)?.label ?? range;

  return (
    <div className="flex flex-col flex-1">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #analytics-report, #analytics-report * { visibility: visible; }
          #analytics-report {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 24px;
            background: white;
            max-width: 100%;
          }
          .print-hide { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
      <Topbar title="Analytics Social" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-6xl mx-auto space-y-6" id="analytics-report">

          {/* Print-only report header */}
          <div className="hidden" style={{ display: "none" }} id="print-header">
            <style>{`
              @media print { #print-header { display: block !important; } }
            `}</style>
            <div className="flex items-start justify-between pb-5 mb-5 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Isysocial · Reporte de Analytics</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  {clientName || "Cliente"} — {networkMeta?.label}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Período: {rangeLabelFull} · Generado el {reportDate} a las {reportTime}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">Isysocial</p>
                <p className="text-xs text-gray-400">Plataforma de gestión de redes sociales</p>
              </div>
            </div>
          </div>

          {/* Screen header */}
          <div className="print-hide">
            <h1 className="text-2xl font-bold">Analytics de Redes Sociales</h1>
            <p className="text-muted-foreground text-sm">
              Métricas reales desde Meta Graph API · Comparativa vs período anterior
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 print-hide">
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

            <div className="flex items-center bg-muted rounded-lg p-0.5">
              {NETWORKS.map((net) => {
                const Icon = net.icon;
                return (
                  <button
                    key={net.value}
                    onClick={() => { setSelectedNetwork(net.value); setTab("overview"); }}
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

            {deltas && (
              <span className="text-xs text-muted-foreground italic hidden sm:inline">
                Flechas = {rangeLabel}
              </span>
            )}

            <Button variant="ghost" size="sm" onClick={() => refetchInsights()} disabled={insightsLoading}>
              <RefreshCw className={cn("h-4 w-4", insightsLoading && "animate-spin")} />
            </Button>

            {selectedClient && !insightsError && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.print()}
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            )}
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
              {insightsError && (
                <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardContent className="pt-5 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Sin datos de {networkMeta?.label}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {insightsError.message.includes("No hay cuenta")
                          ? `El cliente no tiene ${networkMeta?.label} conectado. Ve a Clientes → ${clients?.find((c: any) => c.id === selectedClient)?.companyName} → Redes Sociales.`
                          : `Puede que el token haya expirado o se necesiten más permisos. Reconecta la cuenta de ${networkMeta?.label}.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b print-hide">
                {[
                  { key: "overview" as const, label: "Resumen de cuenta" },
                  { key: "posts" as const, label: isFacebook ? "Posts de Facebook" : "Posts de Instagram" },
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
                  {/* Print section label */}
                  <div className="hidden" style={{ display: "none" }} id="print-section-label">
                    <style>{`@media print { #print-section-label { display: block !important; margin-bottom: 16px; } }`}</style>
                    <h2 className="text-base font-semibold text-gray-700 mb-1">Resumen de cuenta — {rangeLabelFull}</h2>
                    <p className="text-xs text-gray-400">{rangeLabel}</p>
                  </div>

                  {/* KPI Cards — Instagram */}
                  {!isFacebook && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard
                        title="Seguidores"
                        value={followers}
                        icon={<Users className="h-5 w-5" />}
                        loading={insightsLoading}
                        color={networkMeta?.color}
                        highlight
                        delta={deltas?.followers}
                        rangeLabel={rangeLabel}
                      />
                      <StatCard
                        title={`Alcance (${range})`}
                        value={totalReach}
                        sub="personas únicas"
                        icon={<Eye className="h-5 w-5" />}
                        loading={insightsLoading}
                        color="#10b981"
                        delta={deltas?.reach}
                        rangeLabel={rangeLabel}
                      />
                      <StatCard
                        title={`Impresiones (${range})`}
                        value={totalImpressions}
                        sub="veces mostrado"
                        icon={<TrendingUp className="h-5 w-5" />}
                        loading={insightsLoading}
                        color="#6366f1"
                        delta={deltas?.impressions}
                        rangeLabel={rangeLabel}
                      />
                      <StatCard
                        title={`Visitas al perfil (${range})`}
                        value={totalProfileViews}
                        sub="visitas totales"
                        icon={<Users className="h-5 w-5" />}
                        loading={insightsLoading}
                        color="#f59e0b"
                        delta={deltas?.profileViews}
                        rangeLabel={rangeLabel}
                      />
                    </div>
                  )}

                  {!isFacebook && totalWebsiteClicks > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard
                        title={`Clicks al sitio web (${range})`}
                        value={totalWebsiteClicks}
                        sub="desde el perfil"
                        icon={<MousePointerClick className="h-5 w-5" />}
                        loading={insightsLoading}
                        color="#06b6d4"
                        delta={deltas?.websiteClicks}
                        rangeLabel={rangeLabel}
                      />
                      <StatCard
                        title="Redes conectadas"
                        value={overview?.totals?.networksConnected ?? 0}
                        icon={<BarChart3 className="h-5 w-5" />}
                        loading={overviewLoading}
                        color="#8b5cf6"
                      />
                    </div>
                  )}

                  {/* KPI Cards — Facebook */}
                  {isFacebook && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard
                        title="Fans totales"
                        value={fanCount}
                        sub="seguidores de página"
                        icon={<Users className="h-5 w-5" />}
                        loading={insightsLoading}
                        color={networkMeta?.color}
                        highlight
                        delta={deltas?.fanCount}
                        rangeLabel={rangeLabel}
                      />
                      <StatCard
                        title={`Alcance (${range})`}
                        value={totalReach}
                        sub="personas únicas"
                        icon={<Eye className="h-5 w-5" />}
                        loading={insightsLoading}
                        color="#10b981"
                        delta={deltas?.reach}
                        rangeLabel={rangeLabel}
                      />
                      <StatCard
                        title={`Impresiones (${range})`}
                        value={totalImpressions}
                        sub="veces mostrado"
                        icon={<TrendingUp className="h-5 w-5" />}
                        loading={insightsLoading}
                        color="#6366f1"
                        delta={deltas?.impressions}
                        rangeLabel={rangeLabel}
                      />
                      <StatCard
                        title={`Engagements (${range})`}
                        value={totalPostEngagements}
                        sub="interacciones en posts"
                        icon={<Heart className="h-5 w-5" />}
                        loading={insightsLoading}
                        color="#ef4444"
                        delta={deltas?.postEngagements}
                        rangeLabel={rangeLabel}
                      />
                    </div>
                  )}

                  {isFacebook && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard
                        title={`Nuevos fans (${range})`}
                        value={totalFanAdds}
                        sub="nuevos seguidores"
                        icon={<UserPlus className="h-5 w-5" />}
                        loading={insightsLoading}
                        color="#f59e0b"
                        delta={deltas?.fanAdds}
                        rangeLabel={rangeLabel}
                      />
                      {totalVideoViews > 0 && (
                        <StatCard
                          title={`Reproducciones de video (${range})`}
                          value={totalVideoViews}
                          icon={<Play className="h-5 w-5" />}
                          loading={insightsLoading}
                          color="#8b5cf6"
                          delta={deltas?.videoViews}
                          rangeLabel={rangeLabel}
                        />
                      )}
                      <StatCard
                        title="Redes conectadas"
                        value={overview?.totals?.networksConnected ?? 0}
                        icon={<Globe className="h-5 w-5" />}
                        loading={overviewLoading}
                        color="#64748b"
                      />
                    </div>
                  )}

                  {/* Chart */}
                  {insightsLoading ? (
                    <Skeleton className="h-[300px] w-full rounded-xl" />
                  ) : chartData.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          {isFacebook ? "Alcance, Impresiones y Engagements" : "Alcance e Impresiones"} — últimos {range}
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
                                <linearGradient id="gradEngagement" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                              <Legend />
                              <Area type="monotone" dataKey="alcance" name="Alcance" stroke="#10b981" fill="url(#gradReach)" strokeWidth={2} />
                              <Area type="monotone" dataKey="impresiones" name="Impresiones" stroke="#6366f1" fill="url(#gradImpressions)" strokeWidth={2} />
                              {isFacebook && (
                                <Area type="monotone" dataKey="engagements" name="Engagements" stroke="#ef4444" fill="url(#gradEngagement)" strokeWidth={2} />
                              )}
                              {!isFacebook && totalProfileViews > 0 && (
                                <Area type="monotone" dataKey="vistasPerf" name="Visitas al perfil" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  ) : !insightsLoading && !insightsError ? (
                    <Card className={isPendingAppReview ? "border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20" : ""}>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        {isPendingAppReview ? (
                          <Clock className="h-10 w-10 text-blue-400 mb-3" />
                        ) : (
                          <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        )}
                        <p className="text-sm font-medium text-muted-foreground">
                          {isPendingAppReview ? "Permisos de analytics pendientes de aprobación" : "Sin datos para este período"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1 text-center max-w-sm">
                          {isPendingAppReview
                            ? "Meta requiere aprobación de App Review para acceder a métricas de alcance e impresiones. El conteo de seguidores ya funciona correctamente. Una vez aprobado, todos los datos aparecerán aquí automáticamente."
                            : "Puede que el cliente necesite reconectar su cuenta con permisos de analytics."}
                        </p>
                        {isPendingAppReview && (
                          <a
                            href="https://developers.facebook.com/apps/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Verificar estado en Meta for Developers
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ) : null}

                  {/* Fan growth bar chart for Facebook */}
                  {isFacebook && !insightsLoading && totalFanAdds > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Nuevos Fans por día
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
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
                              <Bar dataKey="nuevosFans" name="Nuevos fans" fill="#1877F2" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {tab === "posts" && (
                isFacebook
                  ? <FBPostsSection clientId={selectedClient} />
                  : <IGMediaListSection clientId={selectedClient} />
              )}

              {/* Email Report Panel */}
              <EmailReportPanel
                clientId={selectedClient}
                network={selectedNetwork}
                range={range}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Facebook Posts Section ─────────────────────────────────── */
function FBPostsSection({ clientId }: { clientId: string }) {
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<"reach" | "impressions" | "reactions" | "comments">("reach");

  const { data, isLoading, error, refetch } = trpc.socialInsights.getFBPostsList.useQuery(
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
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.posts?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Facebook className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No hay posts de Facebook</p>
        </CardContent>
      </Card>
    );
  }

  const sortedPosts = [...data.posts].sort((a: any, b: any) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  const topPost = sortedPosts[0];

  return (
    <div className="space-y-4">
      {/* Top Performer */}
      {topPost && (
        <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Mejor post (por {sortBy === "reach" ? "alcance" : sortBy === "impressions" ? "impresiones" : sortBy === "reactions" ? "reacciones" : "comentarios"})
              </span>
            </div>
            <FBPostCard post={topPost} rank={1} isTop />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Todos los posts de Facebook</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{data.total} posts totales</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="reach">Mayor alcance</option>
            <option value="impressions">Mayor impresiones</option>
            <option value="reactions">Más reacciones</option>
            <option value="comments">Más comentarios</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {sortedPosts.map((post: any, i: number) => (
          <FBPostCard key={post.id} post={post} rank={i + 1} />
        ))}
      </div>

      {data.total > limit && (
        <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + 20)}>
          Ver más posts
        </Button>
      )}
    </div>
  );
}

function FBPostCard({ post, rank, isTop }: { post: any; rank: number; isTop?: boolean }) {
  const date = post.createdTime
    ? new Date(post.createdTime).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group",
      isTop && "border-amber-300 dark:border-amber-700"
    )}>
      {!isTop && <span className="text-xs font-bold text-muted-foreground/50 w-5 text-center flex-shrink-0">{rank}</span>}

      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
        {post.picture ? (
          <img src={post.picture} alt="" className="w-full h-full object-cover" />
        ) : (
          <Facebook className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{date}</span>
        {post.message && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{post.message}</p>
        )}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <Metric icon={<Eye className="h-3.5 w-3.5" />} value={post.reach} label="Alcance" color="text-emerald-600" />
        <Metric icon={<TrendingUp className="h-3.5 w-3.5" />} value={post.impressions} label="Impresiones" color="text-indigo-600" />
        <Metric icon={<Heart className="h-3.5 w-3.5" />} value={post.reactions} label="Reacciones" color="text-rose-500" />
        <Metric icon={<MessageCircle className="h-3.5 w-3.5" />} value={post.comments} label="Comentarios" color="text-blue-500" />
        {post.shares > 0 && <Metric icon={<Share2 className="h-3.5 w-3.5" />} value={post.shares} label="Compartidos" color="text-violet-500" />}
        {post.clicks > 0 && <Metric icon={<MousePointerClick className="h-3.5 w-3.5" />} value={post.clicks} label="Clicks" color="text-amber-500" />}
      </div>

      {post.permalinkUrl && (
        <a
          href={post.permalinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          title="Ver en Facebook"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

/* ─── Instagram Posts Section ────────────────────────────────── */
function IGMediaListSection({ clientId }: { clientId: string }) {
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<"reach" | "impressions" | "likes" | "engagementRate" | "saved">("reach");

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
              Reconecta la cuenta de Instagram con permisos de analytics.
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
          <Instagram className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No hay posts de Instagram</p>
        </CardContent>
      </Card>
    );
  }

  const sortedMedia = [...data.media].sort((a: any, b: any) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  const topPost = sortedMedia[0];

  // Aggregated stats
  const totalReach = data.media.reduce((s: number, m: any) => s + (m.reach ?? 0), 0);
  const totalLikes = data.media.reduce((s: number, m: any) => s + (m.likes ?? 0), 0);
  const avgEngRate = data.media.length > 0
    ? (data.media.reduce((s: number, m: any) => s + (m.engagementRate ?? 0), 0) / data.media.length).toFixed(2)
    : "0";

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-bold">{totalReach.toLocaleString("es-MX")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Alcance total</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-bold">{totalLikes.toLocaleString("es-MX")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Likes totales</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-bold">{avgEngRate}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Engagement rate promedio</p>
        </div>
      </div>

      {/* Top Performer */}
      {topPost && (
        <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Mejor post (por {sortBy === "reach" ? "alcance" : sortBy === "impressions" ? "impresiones" : sortBy === "likes" ? "likes" : sortBy === "engagementRate" ? "engagement rate" : "guardados"})
              </span>
            </div>
            <IGMediaCard item={topPost} rank={1} isTop />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Historial de posts — Instagram</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{data.total} posts totales</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="reach">Mayor alcance</option>
            <option value="impressions">Mayor impresiones</option>
            <option value="likes">Más likes</option>
            <option value="engagementRate">Mayor engagement rate</option>
            <option value="saved">Más guardados</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {sortedMedia.map((item: any, i: number) => (
          <IGMediaCard key={item.id} item={item} rank={i + 1} />
        ))}
      </div>

      {data.total > limit && (
        <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + 20)}>
          Ver más posts
        </Button>
      )}
    </div>
  );
}

function IGMediaCard({ item, rank, isTop }: { item: any; rank: number; isTop?: boolean }) {
  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const isVideo = item.mediaType === "VIDEO" || item.mediaType === "REELS";

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group",
      isTop && "border-amber-300 dark:border-amber-700"
    )}>
      {!isTop && <span className="text-xs font-bold text-muted-foreground/50 w-5 text-center flex-shrink-0">{rank}</span>}

      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          isVideo ? <Play className="h-5 w-5 text-muted-foreground/40" /> : <Image className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 px-1.5 py-0.5 rounded font-medium">
            {isVideo ? "Video" : "Imagen"}
          </span>
          <span className="text-xs text-muted-foreground">{date}</span>
          {item.engagementRate > 0 && (
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
              {item.engagementRate}% eng.
            </span>
          )}
        </div>
        {item.caption && (
          <p className="text-sm text-muted-foreground truncate">{item.caption}</p>
        )}
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <Metric icon={<Eye className="h-3.5 w-3.5" />} value={item.reach} label="Alcance" color="text-emerald-600" />
        <Metric icon={<TrendingUp className="h-3.5 w-3.5" />} value={item.impressions} label="Impresiones" color="text-indigo-600" />
        <Metric icon={<Heart className="h-3.5 w-3.5" />} value={item.likes} label="Likes" color="text-rose-500" />
        <Metric icon={<MessageCircle className="h-3.5 w-3.5" />} value={item.comments} label="Comentarios" color="text-blue-500" />
        {item.saved > 0 && <Metric icon={<Bookmark className="h-3.5 w-3.5" />} value={item.saved} label="Guardados" color="text-amber-500" />}
        {item.plays > 0 && <Metric icon={<Play className="h-3.5 w-3.5" />} value={item.plays} label="Reproducciones" color="text-purple-500" />}
      </div>

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

/* ─── Email Report Panel ─────────────────────────────────────────── */
function EmailReportPanel({
  clientId,
  network,
  range,
}: {
  clientId: string;
  network: "INSTAGRAM" | "FACEBOOK";
  range: "7d" | "14d" | "30d" | "90d";
}) {
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [schedFreq, setSchedFreq] = useState<"weekly" | "monthly">("weekly");
  const [schedEmail, setSchedEmail] = useState("");
  const [schedRange, setSchedRange] = useState<"7d" | "14d" | "30d" | "90d">("30d");
  const [schedEnabled, setSchedEnabled] = useState(true);

  const networkLabel = network === "INSTAGRAM" ? "Instagram" : "Facebook";

  const { data: schedule, refetch: refetchSchedule } =
    trpc.socialInsights.getReportSchedule.useQuery(
      { clientId, network },
      { enabled: scheduleOpen }
    );

  const sendMutation = trpc.socialInsights.sendAnalyticsReport.useMutation({
    onSuccess: () => {
      setSendSuccess(true);
      setTimeout(() => { setSendSuccess(false); setSendEmail(""); setOpen(false); }, 3000);
    },
  });

  const scheduleMutation = trpc.socialInsights.setReportSchedule.useMutation({
    onSuccess: () => { refetchSchedule(); },
  });

  // Prefill schedule form from fetched config
  const prevScheduleRef = { loaded: false };
  if (schedule && !prevScheduleRef.loaded) {
    prevScheduleRef.loaded = true;
    if (schedEmail === "" && schedule.emails.length > 0) {
      // We can't call setState here safely, so we use defaults
    }
  }

  return (
    <div className="print-hide">
      {/* Divider */}
      <div className="border-t pt-4 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Reportes por email</h3>
            <p className="text-xs text-muted-foreground">
              Envía el resumen actual o configura un reporte automático
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { setOpen(!open); setScheduleOpen(false); }}
            >
              <Download className="h-3.5 w-3.5" />
              Enviar ahora
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { setScheduleOpen(!scheduleOpen); setOpen(false); }}
            >
              <Clock className="h-3.5 w-3.5" />
              Programar
              {schedule?.enabled && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </Button>
          </div>
        </div>

        {/* Send Now panel */}
        {open && (
          <div className="mt-3 p-4 rounded-lg border bg-muted/30 space-y-3">
            <p className="text-xs font-medium">
              Envía el resumen de {networkLabel} ({range}) al email indicado:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="flex-1 h-8 rounded-md border bg-background px-3 text-sm"
              />
              <Button
                size="sm"
                disabled={!sendEmail || sendMutation.isPending}
                onClick={() => sendMutation.mutate({ clientId, network, range, emails: [sendEmail] })}
              >
                {sendMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
            {sendSuccess && (
              <p className="text-xs text-emerald-600 font-medium">✓ Reporte enviado correctamente</p>
            )}
            {sendMutation.error && (
              <p className="text-xs text-rose-600">{sendMutation.error.message}</p>
            )}
          </div>
        )}

        {/* Schedule panel */}
        {scheduleOpen && (
          <div className="mt-3 p-4 rounded-lg border bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Reporte automático de {networkLabel}</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-muted-foreground">
                  {schedEnabled ? "Activo" : "Inactivo"}
                </span>
                <button
                  onClick={() => setSchedEnabled(!schedEnabled)}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    schedEnabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                      schedEnabled ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Frecuencia</label>
                <select
                  value={schedFreq}
                  onChange={(e) => setSchedFreq(e.target.value as any)}
                  className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="weekly">Semanal (lunes)</option>
                  <option value="monthly">Mensual (día 1)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Período de datos</label>
                <select
                  value={schedRange}
                  onChange={(e) => setSchedRange(e.target.value as any)}
                  className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="7d">Últimos 7 días</option>
                  <option value="14d">Últimas 2 semanas</option>
                  <option value="30d">Últimos 30 días</option>
                  <option value="90d">Últimos 90 días</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Email destinatario</label>
              <input
                type="email"
                value={schedEmail}
                onChange={(e) => setSchedEmail(e.target.value)}
                placeholder={schedule?.emails?.[0] ?? "correo@ejemplo.com"}
                className="w-full h-8 rounded-md border bg-background px-3 text-sm"
              />
            </div>

            {schedule && (
              <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded">
                Config actual: <strong>{schedule.frequency === "weekly" ? "Semanal" : "Mensual"}</strong> →{" "}
                {schedule.emails.join(", ")} · {schedule.enabled ? "✓ activo" : "⏸ pausado"}
                <br />
                Última actualización: {new Date(schedule.updatedAt).toLocaleDateString("es-MX")}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setScheduleOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={scheduleMutation.isPending || !schedEmail}
                onClick={() =>
                  scheduleMutation.mutate({
                    clientId,
                    network,
                    enabled: schedEnabled,
                    frequency: schedFreq,
                    emails: [schedEmail],
                    range: schedRange,
                  })
                }
              >
                {scheduleMutation.isPending ? "Guardando..." : "Guardar configuración"}
              </Button>
            </div>

            {scheduleMutation.isSuccess && (
              <p className="text-xs text-emerald-600 font-medium">✓ Configuración guardada</p>
            )}
            {scheduleMutation.error && (
              <p className="text-xs text-rose-600">{scheduleMutation.error.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
