"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileImage,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostType } from "@isysocial/shared";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

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
  if (diffDays < 30) return `hace ${diffDays}d`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function WaitBadge({ date }: { date: Date | string }) {
  const d = new Date(date);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));

  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let className = "text-xs";

  if (diffHours >= 48) {
    className += " bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  } else if (diffHours >= 24) {
    className += " bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
  } else {
    className += " bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
  }

  return (
    <Badge variant="outline" className={className}>
      <Clock className="h-3 w-3 mr-1" />
      {timeAgo(date)}
    </Badge>
  );
}

export default function ApprovalQueuePage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [clientFilter, setClientFilter] = useState<string>("");
  const [networkFilter, setNetworkFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"oldest" | "newest" | "client">("oldest");
  const [page, setPage] = useState(1);

  // Fetch clients for filter
  const { data: clientsData } = trpc.posts.getClientsForSelect.useQuery();

  // Fetch approval queue
  const { data, isLoading, isFetching } = trpc.posts.getApprovalQueue.useQuery({
    clientId: clientFilter && clientFilter !== "all" ? clientFilter : undefined,
    network: networkFilter && networkFilter !== "all" ? networkFilter as any : undefined,
    sortBy,
    page,
    limit: 15,
  });

  // Mutations for quick actions
  const updateStatus = trpc.posts.updateStatus.useMutation({
    onSuccess: () => {
      utils.posts.getApprovalQueue.invalidate();
      utils.agencies.getDashboardData.invalidate();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleApprove = (postId: string) => {
    updateStatus.mutate(
      { id: postId, toStatus: "APPROVED" },
      { onSuccess: () => toast({ title: "Post aprobado" }) }
    );
  };

  const handleRequestChanges = (postId: string) => {
    updateStatus.mutate(
      { id: postId, toStatus: "CLIENT_CHANGES" },
      { onSuccess: () => toast({ title: "Cambios solicitados" }) }
    );
  };

  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Cola de aprobación" />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Cola de aprobación
              {total > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {total}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Posts pendientes de revisión y aprobación del cliente
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-3 flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clientsData?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={networkFilter} onValueChange={(v) => { setNetworkFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Todas las redes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las redes</SelectItem>
                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                <SelectItem value="FACEBOOK">Facebook</SelectItem>
                <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                <SelectItem value="TIKTOK">TikTok</SelectItem>
                <SelectItem value="X">X</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Más antiguos primero</SelectItem>
                <SelectItem value="newest">Más recientes primero</SelectItem>
                <SelectItem value="client">Por cliente</SelectItem>
              </SelectContent>
            </Select>

            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardContent>
        </Card>

        {/* Posts list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <h3 className="font-semibold text-lg">No hay posts pendientes</h3>
              <p className="text-muted-foreground mt-1">
                Todos los posts han sido revisados. ¡Excelente!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => {
              const thumbnail = post.media?.[0]?.fileUrl;
              const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
              const submittedLog = post.statusLogs?.[0];
              const submittedAt = submittedLog?.changedAt || post.updatedAt;
              const submittedBy = submittedLog?.changedBy?.name || "Editor";
              const isActing = (updateStatus.isLoading || updateStatus.isPending) && updateStatus.variables?.id === post.id;

              return (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <Link href={`/admin/contenido/${post.id}`}>
                        <div className="w-20 h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="h-6 w-6 text-muted-foreground/40" />
                          )}
                        </div>
                      </Link>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/admin/contenido/${post.id}`}>
                              <h3 className="font-semibold text-sm hover:text-primary transition-colors truncate cursor-pointer">
                                {post.title || post.copy?.slice(0, 60) || "Sin título"}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: networkColor }}
                              >
                                {NETWORK_LABELS[post.network as SocialNetwork]}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {POST_TYPE_LABELS[post.postType as PostType]}
                              </span>
                              <span className="text-xs font-medium">
                                {post.client?.companyName}
                              </span>
                              {post._count?.comments > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <MessageSquare className="h-3 w-3" />
                                  {post._count.comments}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Enviado por {submittedBy}
                            </p>
                          </div>

                          {/* Wait time badge */}
                          <WaitBadge date={submittedAt} />
                        </div>

                        {/* Copy preview */}
                        {post.copy && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {post.copy}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(post.id)}
                            disabled={isActing}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isActing && updateStatus.variables?.toStatus === "APPROVED" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            )}
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestChanges(post.id)}
                            disabled={isActing}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950"
                          >
                            {isActing && updateStatus.variables?.toStatus === "CLIENT_CHANGES" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                            )}
                            Pedir cambios
                          </Button>
                          <Link href={`/admin/contenido/${post.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ver detalle
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
