"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  FileImage,
  Calendar,
  MessageCircle,
  Filter,
  Archive,
} from "lucide-react";
import {
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType } from "@isysocial/shared";

export default function EditorArchivoPage() {
  const [search, setSearch] = useState("");
  const [filterNetwork, setFilterNetwork] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.posts.archive.useQuery({
    search: search || undefined,
    network: filterNetwork !== "ALL" ? (filterNetwork as SocialNetwork) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Archive className="h-6 w-6" />
          Archivo
        </h1>
        <p className="text-muted-foreground text-sm">
          Historial de publicaciones publicadas y canceladas
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en archivo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <Select value={filterNetwork} onValueChange={(v) => { setFilterNetwork(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Red social" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las redes</SelectItem>
            {Object.entries(NETWORK_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Rango:</span>
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-[160px]" />
        <span className="text-muted-foreground">a</span>
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-[160px]" />
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Post list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : !data || data.posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Archive className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No hay publicaciones en el archivo</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Las publicaciones publicadas y canceladas aparecerán aquí</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.posts.map((post) => {
            const statusColor = POST_STATUS_COLORS[post.status as PostStatus] || "";
            const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
            const thumbnail = post.media?.[0]?.fileUrl;

            return (
              <Link key={post.id} href={`/editor/contenido/${post.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {thumbnail ? (
                          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FileImage className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate mb-1">
                          {post.title || post.copy?.slice(0, 60) || "Sin título"}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: networkColor }}>
                            {NETWORK_LABELS[post.network as SocialNetwork]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {POST_TYPE_LABELS[post.postType as PostType]}
                          </span>
                          <span className="text-xs text-muted-foreground">· {post.client.companyName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {post.publishedAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{new Date(post.publishedAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span>
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

          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {data.pages} ({data.total} resultados)
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
