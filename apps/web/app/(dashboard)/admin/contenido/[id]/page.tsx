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
  Link2,
  Copy,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { MediaVersionComparator } from "@/components/post-editor/media-version-comparator";
import { MediaVersionUploadModal } from "@/components/post-editor/media-version-upload-modal";
import { PublishPostDialog } from "@/components/publish-post-dialog";
import { Topbar } from "@/components/layout/topbar";
import { VideoReviewPanel } from "@/components/video/video-review-panel";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const postId = params.id as string;
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [mirrorDialogOpen, setMirrorDialogOpen] = useState(false);
  const [mirrorNetworks, setMirrorNetworks] = useState<string[]>([]);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [versionUpload, setVersionUpload] = useState<{
    mediaId: string;
    fileName: string;
    currentFileUrl: string;
    commentId?: string;
    changeNotes?: string;
  } | null>(null);

  const userRole = (session?.user as any)?.role as Role;

  const { data: post, isLoading, refetch } = trpc.posts.get.useQuery({ id: postId });
  const { data: agencyTimezone } = trpc.agencies.getTimezone.useQuery();
  const { data: publishLogs } = trpc.publishing.getPublishLogs.useQuery(
    { postId },
    { enabled: !!postId }
  );

  const updateStatus = trpc.posts.updateStatus.useMutation({
    onSuccess: (data, variables) => {
      setStatusNote("");
      refetch();

      // Show special alert if post was approved and has scheduledAt
      // (will auto-schedule to SCHEDULED status)
      if (variables.toStatus === "APPROVED" && post?.scheduledAt) {
        const scheduledDate = new Date(post.scheduledAt).toLocaleDateString("es-MX", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        toast({
          title: "✓ Contenido aprobado y programado",
          description: `Tu post se publicará automáticamente el ${scheduledDate}`,
          variant: "default",
        });
      } else {
        toast({ title: "Estado actualizado" });
      }
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

  const createMirror = trpc.posts.createMirror.useMutation({
    onSuccess: (data) => {
      toast({ title: "Mirror creado", description: `${data.created} publicación(es) creada(s)` });
      setMirrorDialogOpen(false);
      setMirrorNetworks([]);
      refetch();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const syncMirrorCopy = trpc.posts.syncMirrorCopy.useMutation({
    onSuccess: (data) => {
      toast({ title: "Copy sincronizado", description: `${data.synced} post(s) actualizado(s)` });
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
    type: m.mimeType.startsWith("video/") ? "video" as const : "image" as const,
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
            {post.mirrorGroupId && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Link2 className="h-3 w-3" />
                Mirror
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userRole === "ADMIN" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Pre-select all networks except the current one
                const allNets = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"];
                setMirrorNetworks(allNets.filter((n) => n !== post.network));
                setMirrorDialogOpen(true);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Mirror
            </Button>
          )}
          {(userRole === "ADMIN") && (post.status === "APPROVED" || post.status === "SCHEDULED") && (
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
            onClick={() => router.push(`/admin/contenido/${post.id}/editar`)}
            disabled={!["DRAFT", "CLIENT_CHANGES"].includes(post.status)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Details + Comments */}
        <div className="flex-1 min-w-0 space-y-6">
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
                    Programado: {new Date(post.scheduledAt).toLocaleDateString("es", {
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
              {/* Comment list */}
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
                {userRole !== "CLIENTE" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    Comentario interno (solo visible para la agencia)
                  </label>
                )}
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

          {/* Image Version History */}
          {post.media.some((m) => m.mimeType.startsWith("image/")) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Historial de Imágenes
                  </CardTitle>
                  {(userRole === "ADMIN" || userRole === "EDITOR" || userRole === "SUPER_ADMIN") && (
                    <div className="relative">
                      <select
                        className="text-xs border rounded-lg px-3 py-1.5 bg-white cursor-pointer hover:bg-gray-50 appearance-none pr-7"
                        defaultValue=""
                        onChange={(e) => {
                          const mediaId = e.target.value;
                          if (!mediaId) return;
                          const media = post.media.find((m) => m.id === mediaId);
                          if (media) {
                            setVersionUpload({
                              mediaId: media.id,
                              fileName: media.fileName,
                              currentFileUrl: media.fileUrl,
                            });
                          }
                          e.target.value = "";
                        }}
                      >
                        <option value="" disabled>
                          + Subir nueva versión
                        </option>
                        {post.media
                          .filter((m) => m.mimeType.startsWith("image/"))
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fileName}
                            </option>
                          ))}
                      </select>
                      <Upload className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {post.media
                  .filter((m) => m.mimeType.startsWith("image/"))
                  .map((media) => (
                    <MediaVersionComparator
                      key={media.id}
                      mediaId={media.id}
                      currentFileUrl={media.fileUrl}
                      fileName={media.fileName}
                    />
                  ))}
              </CardContent>
            </Card>
          )}

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

          {/* Publish logs */}
          {publishLogs && publishLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Registro de publicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {publishLogs.map((log) => {
                    const isSuccess = log.status === "SUCCESS";
                    const networkLabel = NETWORK_LABELS[(log.network as SocialNetwork)] || log.network;
                    const accountName = log.socialNetwork?.accountName || log.agencyAccount?.accountName || "";
                    return (
                      <div
                        key={log.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                          isSuccess
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                            : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: NETWORK_COLORS[log.network as SocialNetwork] || "#888" }}
                            >
                              {networkLabel}
                            </span>
                            {accountName && (
                              <span className="text-xs text-muted-foreground">{accountName}</span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(log.attemptedAt).toLocaleDateString("es", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {log.errorMessage && (
                            <p className="text-xs text-red-700 dark:text-red-400 mt-1.5 font-mono bg-red-100 dark:bg-red-950/40 rounded px-2 py-1 break-all">
                              {log.errorMessage}
                            </p>
                          )}
                          {isSuccess && log.platformUrl && (
                            <a
                              href={log.platformUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-green-700 dark:text-green-400 mt-1 flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver publicación
                            </a>
                          )}
                          {isSuccess && !log.platformUrl && log.platformPostId && (
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                              ID: {log.platformPostId}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mirror group */}
          {post.mirrorGroupId && (
            <MirrorGroupSection
              mirrorGroupId={post.mirrorGroupId}
              currentPostId={post.id}
              onSync={() =>
                syncMirrorCopy.mutate({
                  sourcePostId: post.id,
                  mirrorGroupId: post.mirrorGroupId!,
                })
              }
              isSyncing={syncMirrorCopy.isLoading}
            />
          )}
        </div>

        {/* Right: Mockup Preview (always shown) */}
        <div className="lg:w-[420px] xl:w-[460px] flex-shrink-0">
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

      {/* Publish Dialog */}
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

      {/* Mirror Dialog */}
      <Dialog open={mirrorDialogOpen} onOpenChange={setMirrorDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Crear Mirror Posts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Selecciona las redes donde quieres duplicar esta publicación.
              El copy y hashtags se copiarán automáticamente.
            </p>
            <div className="space-y-2">
              {(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"] as const)
                .filter((n) => n !== post.network)
                .map((net) => (
                  <label key={net} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mirrorNetworks.includes(net)}
                      onChange={(e) =>
                        setMirrorNetworks((prev) =>
                          e.target.checked ? [...prev, net] : prev.filter((n) => n !== net)
                        )
                      }
                      className="rounded"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: NETWORK_COLORS[net] }}
                    />
                    <span className="text-sm">{NETWORK_LABELS[net]}</span>
                  </label>
                ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMirrorDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  createMirror.mutate({
                    sourcePostId: post.id,
                    networks: mirrorNetworks as SocialNetwork[],
                  })
                }
                disabled={mirrorNetworks.length === 0 || createMirror.isLoading}
              >
                {createMirror.isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Crear {mirrorNetworks.length} mirror{mirrorNetworks.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Version Upload Modal */}
      {versionUpload && (
        <MediaVersionUploadModal
          mediaId={versionUpload.mediaId}
          mediaFileName={versionUpload.fileName}
          currentFileUrl={versionUpload.currentFileUrl}
          relatedCommentId={versionUpload.commentId}
          changeNotes={versionUpload.changeNotes}
          onClose={() => setVersionUpload(null)}
          onSuccess={() => refetch()}
        />
      )}
      </div>
      </main>
    </div>
  );
}

/* PublishPostDialog is now imported from @/components/publish-post-dialog */

/* ─── MirrorGroupSection ─────────────────────────────────────────── */
function MirrorGroupSection({
  mirrorGroupId,
  currentPostId,
  onSync,
  isSyncing,
}: {
  mirrorGroupId: string;
  currentPostId: string;
  onSync: () => void;
  isSyncing: boolean;
}) {
  const { data: mirrors } = trpc.posts.getMirrorGroup.useQuery({ mirrorGroupId });

  if (!mirrors || mirrors.length <= 1) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Grupo Mirror ({mirrors.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            Sincronizar copy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {mirrors.map((m) => (
            <a
              key={m.id}
              href={`/admin/contenido/${m.id}`}
              className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                m.id === currentPostId
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: NETWORK_COLORS[m.network as SocialNetwork] }}
              />
              <span className="text-sm font-medium flex-1">
                {NETWORK_LABELS[m.network as SocialNetwork]}
              </span>
              <Badge
                variant="secondary"
                className={`text-[10px] ${POST_STATUS_COLORS[m.status as PostStatus] || ""}`}
              >
                {POST_STATUS_LABELS[m.status as PostStatus]}
              </Badge>
              {m.id === currentPostId && (
                <span className="text-[10px] text-primary font-medium">Actual</span>
              )}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
