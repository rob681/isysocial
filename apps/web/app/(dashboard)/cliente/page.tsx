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
  AlertCircle,
  Clock,
  ArrowRight,
  MessageCircle,
  CalendarDays,
  TrendingUp,
  Palette,
  Star,
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

// ── Time formatting helper ───────────────────────────────────────────────────
function formatScheduledDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) {
    return "Hoy " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }
  if (isTomorrow) {
    return "Mañana " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClienteDashboardPage() {
  const { data: session } = useSession();
  const name = session?.user?.name?.split(" ")[0] ?? "Cliente";

  // Existing queries
  const { data: allPosts, isLoading } = trpc.posts.list.useQuery({ page: 1, limit: 100 });
  const { data: reviewPosts } = trpc.posts.list.useQuery({ status: "IN_REVIEW" as any, page: 1, limit: 5 });
  // Upcoming scheduled posts (next 14 days)
  const { data: upcomingPosts } = trpc.calendar.getUpcoming.useQuery({ days: 14 });
  // Best post of the month
  const { data: bestPost } = trpc.socialInsights.getBestPostThisMonth.useQuery();

  const pendingCount = allPosts?.posts.filter((p) => p.status === "IN_REVIEW").length ?? 0;
  const approvedCount = allPosts?.posts.filter((p) => ["APPROVED", "SCHEDULED", "PUBLISHED"].includes(p.status)).length ?? 0;
  const totalCount = allPosts?.total ?? 0;
  const publishedCount = allPosts?.posts.filter((p) => p.status === "PUBLISHED").length ?? 0;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 px-6 py-5">
        <h1 className="text-2xl font-bold">Bienvenido, {name} 👋</h1>
        <p className="text-muted-foreground mt-1">
          Aquí encontrarás el contenido de redes sociales preparado por tu agencia
        </p>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 text-sm font-medium px-3 py-1 rounded-full">
              <AlertCircle className="h-4 w-4" />
              {pendingCount} publicación{pendingCount > 1 ? "es" : ""} esperan tu revisión
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/cliente/contenido?status=IN_REVIEW">
          <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${pendingCount > 0 ? "ring-2 ring-yellow-400/50" : ""}`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-950/40 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "—" : pendingCount}</p>
                <p className="text-sm text-muted-foreground">Por revisar</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/cliente/contenido?status=APPROVED">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "—" : approvedCount}</p>
                <p className="text-sm text-muted-foreground">Aprobados</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/cliente/contenido">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "—" : publishedCount}</p>
                <p className="text-sm text-muted-foreground">Publicados</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/cliente/contenido">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                <FileImage className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "—" : totalCount}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pending Reviews + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending reviews */}
        <Card className={pendingCount > 0 ? "border-yellow-200 dark:border-yellow-800" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Pendientes de tu revisión
            </CardTitle>
            <CardDescription>Revisa y aprueba el contenido preparado por tu equipo</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : pendingCount === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">No hay contenido pendiente de revisión</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reviewPosts?.posts.slice(0, 4).map((post) => {
                  const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
                  const thumbnail = post.media?.[0]?.fileUrl;

                  return (
                    <Link key={post.id} href={`/cliente/contenido/${post.id}`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="w-11 h-11 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {post.title || post.copy?.slice(0, 50) || "Sin título"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: networkColor }}
                            >
                              {NETWORK_LABELS[post.network as SocialNetwork]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {POST_TYPE_LABELS[post.postType as PostType]}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="flex-shrink-0">
                          Revisar
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </Link>
                  );
                })}
                {pendingCount > 4 && (
                  <Link href="/cliente/contenido?status=IN_REVIEW">
                    <p className="text-sm text-primary text-center pt-2 hover:underline cursor-pointer">
                      Ver todas ({pendingCount}) →
                    </p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming scheduled */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Próximas publicaciones
              </CardTitle>
              <Link href="/cliente/calendario">
                <Button variant="ghost" size="sm" className="text-xs">
                  Calendario
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>Posts programados para los próximos días</CardDescription>
          </CardHeader>
          <CardContent>
            {!upcomingPosts ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : upcomingPosts.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No hay publicaciones programadas próximamente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingPosts.slice(0, 5).map((post: any) => {
                  const thumbnail = post.media?.[0]?.fileUrl;
                  const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";

                  return (
                    <Link key={post.id} href={`/cliente/contenido/${post.id}`}>
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
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: networkColor }}
                          >
                            {NETWORK_LABELS[post.network as SocialNetwork]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex-shrink-0">
                          {post.scheduledAt ? formatScheduledDate(post.scheduledAt) : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best post of the month */}
      {bestPost && (
        <Link href={`/cliente/contenido/${bestPost.postId}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-yellow-200 dark:border-yellow-800 bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                  <Star className="h-6 w-6 text-yellow-600 fill-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-0.5">
                    Mejor publicación del mes
                  </p>
                  <p className="text-sm font-medium truncate">
                    {bestPost.title || "Ver publicación"}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {bestPost.engagementRate !== null && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                        <TrendingUp className="h-3 w-3" />
                        {bestPost.engagementRate.toFixed(2)}% engagement
                      </span>
                    )}
                    {bestPost.reach > 0 && (
                      <span>{bestPost.reach.toLocaleString("es")} alcance</span>
                    )}
                  </div>
                </div>
                {bestPost.thumbnail && (
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={bestPost.thumbnail} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/cliente/calendario">
          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-950/60 transition-colors">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Calendario editorial</h3>
                <p className="text-sm text-muted-foreground">
                  Vista mensual de contenidos
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/cliente/contenido">
          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-950/60 transition-colors">
                <FileImage className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Todas mis publicaciones</h3>
                <p className="text-sm text-muted-foreground">
                  Historial completo
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/cliente/marca">
          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-pink-200 dark:group-hover:bg-pink-950/60 transition-colors">
                <Palette className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold">Mi Marca</h3>
                <p className="text-sm text-muted-foreground">
                  Identidad visual y tono
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>
      </main>
    </div>
  );
}
