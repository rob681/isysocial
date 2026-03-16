"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MockupRenderer } from "@/components/mockups/mockup-renderer";
import {
  ArrowLeft,
  Calendar,
  MessageCircle,
  Send,
  Clock,
  Edit,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_TYPE_LABELS,
  TRANSITION_LABELS,
} from "@isysocial/shared";
import { getAvailableTransitions } from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType, Role } from "@isysocial/shared";
import type { MockupMedia } from "@/components/mockups/types";
import { useToast } from "@/hooks/use-toast";
import { getTimezoneShortLabel } from "@/lib/utils";
import { RevisionHistory } from "@/components/post-editor/revision-history";
import { PublishPostDialog } from "@/components/publish-post-dialog";
import { Topbar } from "@/components/layout/topbar";

export default function EditorPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const postId = params.id as string;
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const userRole = (session?.user as any)?.role as Role;
  const editorPermissions = (session?.user as any)?.permissions as string[] | undefined;
  const canPublish = userRole === "ADMIN" || editorPermissions?.includes("PUBLISH_POSTS");

  const { data: post, isLoading, refetch } = trpc.posts.get.useQuery({ id: postId });
  const { data: agencyTimezone } = trpc.agencies.getTimezone.useQuery();

  const updateStatus = trpc.posts.updateStatus.useMutation({
    onSuccess: () => {
      toast({ title: "Estado actualizado" });
      setStatusNote("");
      refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addComment = trpc.posts.addComment.useMutation({
    onSuccess: () => {
      setComment("");
      refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Detalle de publicación" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-6">
              <Skeleton className="flex-1 h-96" />
              <Skeleton className="w-[380px] h-96" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Detalle de publicación" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="text-center py-16">
            <p className="text-muted-foreground">Publicación no encontrada</p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              Volver
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const statusColor = POST_STATUS_COLORS[post.status as PostStatus] || "";
  const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
  const availableTransitions = userRole
    ? getAvailableTransitions(post.status as PostStatus, userRole)
    : [];

  const mockupMedia: MockupMedia[] = post.media.map((m) => ({
    url: m.fileUrl,
    type: m.mimeType.startsWith("video/") ? ("video" as const) : ("image" as const),
  }));

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Detalle de publicación" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {post.title || post.copy?.slice(0, 60) || "Sin título"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: networkColor }}
            >
              {NETWORK_LABELS[post.network as SocialNetwork]}
            </span>
            <span className="text-xs text-muted-foreground">
              {POST_TYPE_LABELS[post.postType as PostType]}
            </span>
            <span className="text-xs text-muted-foreground">
              · {post.client.companyName}
            </span>
            <Badge variant="secondary" className={statusColor}>
              {POST_STATUS_LABELS[post.status as PostStatus]}
            </Badge>
          </div>
        </div>
        {canPublish && (post.status === "APPROVED" || post.status === "SCHEDULED") && (
          <Button
            size="sm"
            className="gradient-primary text-white"
            onClick={() => setPublishDialogOpen(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            Publicar ahora
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/editor/contenido/${post.id}/editar`)}
          disabled={!["DRAFT", "CLIENT_CHANGES"].includes(post.status)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Details + Comments */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Client changes alert */}
          {post.status === "CLIENT_CHANGES" && (
            <Card className="border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-orange-800 dark:text-orange-300">
                      El cliente solicitó cambios
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                      Revisa los comentarios del cliente, realiza los ajustes y reenvía a revisión.
                    </p>
                    <p className="text-xs text-orange-600 mt-2">
                      Revisiones: {post.revisionsUsed}/{post.revisionsLimit}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Post content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {post.copy && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Copy</p>
                  <p className="text-sm whitespace-pre-wrap">{post.copy}</p>
                </div>
              )}
              {post.hashtags && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Hashtags</p>
                  <p className="text-sm text-blue-600">{post.hashtags}</p>
                </div>
              )}
              {post.scheduledAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Programado:{" "}
                    {new Date(post.scheduledAt).toLocaleDateString("es", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: agencyTimezone ?? "America/Mexico_City",
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {getTimezoneShortLabel(agencyTimezone ?? "America/Mexico_City")}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Revisiones: {post.revisionsUsed}/{post.revisionsLimit}</span>
                {post.revisionsUsed >= post.revisionsLimit && (
                  <span className="flex items-center gap-1 text-orange-500">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Límite alcanzado
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status actions */}
          {availableTransitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cambiar estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Nota (opcional)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {availableTransitions.map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      disabled={updateStatus.isLoading}
                      onClick={() =>
                        updateStatus.mutate({
                          id: post.id,
                          toStatus: status,
                          note: statusNote || undefined,
                        })
                      }
                    >
                      {updateStatus.isLoading && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      )}
                      {TRANSITION_LABELS[status] || status}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Comentarios ({post.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {post.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay comentarios aún
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {post.comments.map((c) => (
                    <div
                      key={c.id}
                      className={`flex gap-3 p-3 rounded-lg ${
                        c.isInternal
                          ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800"
                          : "bg-zinc-50 dark:bg-zinc-800/50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {c.author.avatarUrl ? (
                          <img src={c.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-primary">
                            {c.author.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.author.name}</span>
                          {c.isInternal && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Interno
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString("es", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-3">
                  <Textarea
                    placeholder="Escribe un comentario..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className="resize-none flex-1"
                  />
                  <Button
                    size="icon"
                    disabled={!comment.trim() || addComment.isLoading}
                    onClick={() =>
                      addComment.mutate({
                        postId: post.id,
                        content: comment.trim(),
                        isInternal,
                      })
                    }
                  >
                    {addComment.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded"
                  />
                  Comentario interno (solo visible para la agencia)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Revision History */}
          <RevisionHistory
            postId={post.id}
            currentTitle={post.title}
            currentCopy={post.copy}
            currentHashtags={post.hashtags}
          />

          {/* Status timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {post.statusLogs.map((log, index) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      {index < post.statusLogs.length - 1 && (
                        <div className="absolute top-4 left-[3px] w-0.5 h-6 bg-zinc-200 dark:bg-zinc-700" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{log.changedBy.name}</span>
                        {" → "}
                        <Badge variant="secondary" className={POST_STATUS_COLORS[log.toStatus as PostStatus] || ""}>
                          {POST_STATUS_LABELS[log.toStatus as PostStatus]}
                        </Badge>
                      </p>
                      {log.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{log.note}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.changedAt).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Mockup Preview */}
        <div className="lg:w-[380px] xl:w-[420px] flex-shrink-0">
          <div className="sticky top-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Vista previa</h3>
            <div className="flex justify-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border">
              <MockupRenderer
                network={post.network as SocialNetwork}
                postType={post.postType as PostType}
                clientName={post.client.companyName}
                clientAvatar={post.client.user?.avatarUrl || undefined}
                copy={post.copy || undefined}
                hashtags={post.hashtags || undefined}
                media={mockupMedia}
                scheduledAt={post.scheduledAt ? new Date(post.scheduledAt) : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {publishDialogOpen && (
        <PublishPostDialog
          postId={post.id}
          postTitle={post.title || post.copy?.slice(0, 60) || "Sin título"}
          network={post.network}
          postType={post.postType}
          clientId={post.clientId}
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          onPublished={() => refetch()}
        />
      )}
    </div>
      </main>
    </div>
  );
}
