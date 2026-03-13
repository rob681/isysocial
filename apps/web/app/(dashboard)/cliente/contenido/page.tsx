"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileImage,
  Calendar,
  MessageCircle,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType } from "@isysocial/shared";

export default function ClienteContenidoPage() {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.posts.list.useQuery({
    status: filterStatus !== "ALL" ? (filterStatus as PostStatus) : undefined,
    page,
    limit: 20,
  });

  // Count posts needing attention
  const pendingCount = data?.posts.filter((p) => p.status === "IN_REVIEW").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mis Publicaciones</h1>
        <p className="text-muted-foreground text-sm">
          Revisa y aprueba el contenido preparado por tu agencia
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFilterStatus("IN_REVIEW"); setPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-950/40 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{data?.posts.filter((p) => p.status === "IN_REVIEW").length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Pendientes de revisión</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFilterStatus("APPROVED"); setPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{data?.posts.filter((p) => p.status === "APPROVED").length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Aprobados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFilterStatus("ALL"); setPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
              <FileImage className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{data?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            <SelectItem value="IN_REVIEW">Pendientes de revisión</SelectItem>
            <SelectItem value="CLIENT_CHANGES">Con cambios solicitados</SelectItem>
            <SelectItem value="APPROVED">Aprobados</SelectItem>
            <SelectItem value="SCHEDULED">Programados</SelectItem>
            <SelectItem value="PUBLISHED">Publicados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Post list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : !data || data.posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileImage className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No hay publicaciones
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Tu agencia aún no ha compartido contenido contigo
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.posts.map((post) => {
            const statusColor = POST_STATUS_COLORS[post.status as PostStatus] || "";
            const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
            const thumbnail = post.media?.[0]?.fileUrl;
            const needsAction = post.status === "IN_REVIEW";

            return (
              <Link key={post.id} href={`/cliente/contenido/${post.id}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${needsAction ? "ring-2 ring-yellow-400/50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {thumbnail ? (
                          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FileImage className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {post.title || post.copy?.slice(0, 60) || "Sin título"}
                          </p>
                          {needsAction && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                              Requiere tu aprobación
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: networkColor }}
                          >
                            {NETWORK_LABELS[post.network as SocialNetwork]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {POST_TYPE_LABELS[post.postType as PostType]}
                          </span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {post.scheduledAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {new Date(post.scheduledAt).toLocaleDateString("es", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                        )}
                        {post._count.comments > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>{post._count.comments}</span>
                          </div>
                        )}
                        <Badge variant="secondary" className={statusColor}>
                          {POST_STATUS_LABELS[post.status as PostStatus]}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
