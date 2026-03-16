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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MockupRenderer } from "@/components/mockups/mockup-renderer";
import {
  ArrowLeft,
  Calendar,
  MessageCircle,
  Send,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import {
  POST_STATUS_LABELS,
  POST_STATUS_COLORS,
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_TYPE_LABELS,
} from "@isysocial/shared";
import type { SocialNetwork, PostStatus, PostType, Role } from "@isysocial/shared";
import type { MockupMedia } from "@/components/mockups/types";
import { useToast } from "@/hooks/use-toast";
import { cn, getTimezoneShortLabel } from "@/lib/utils";
import { Topbar } from "@/components/layout/topbar";

export default function ClientePostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const postId = params.id as string;
  const [comment, setComment] = useState("");
  const [changesNote, setChangesNote] = useState("");
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [lastRevisionWarningOpen, setLastRevisionWarningOpen] = useState(false);
  const [guidedReviewDialogOpen, setGuidedReviewDialogOpen] = useState(false);
  const [guidedReviewNotes, setGuidedReviewNotes] = useState("");

  const userRole = (session?.user as any)?.role as Role;

  const { data: post, isLoading, refetch } = trpc.posts.get.useQuery({ id: postId });
  const { data: agencyTimezone } = trpc.agencies.getTimezone.useQuery();

  const updateStatus = trpc.posts.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      setChangesNote("");
      setShowChangesForm(false);
      refetch();

      // Show special alert if post was approved and has scheduledAt
      if (variables.toStatus === "APPROVED" && post?.scheduledAt) {
        const scheduledDate = new Date(post.scheduledAt).toLocaleDateString("es-MX", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        toast({
          title: "✅ Publicación aprobada",
          description: `Tu contenido se publicará automáticamente el ${scheduledDate}`,
          variant: "default",
        });
      } else if (variables.toStatus === "APPROVED") {
        toast({ title: "✅ Publicación aprobada", description: "Tu agencia ha sido notificada." });
      } else {
        toast({ title: "Cambios solicitados", description: "Tu agencia revisará tus comentarios." });
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

  const requestGuidedReview = trpc.posts.requestGuidedReview.useMutation({
    onSuccess: () => {
      toast({
        title: "Revisión guiada solicitada",
        description: "Tu agencia se pondrá en contacto contigo pronto para agendar la sesión.",
      });
      setGuidedReviewDialogOpen(false);
      setGuidedReviewNotes("");
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
  const isInReview = post.status === "IN_REVIEW";
  const isClientChanges = post.status === "CLIENT_CHANGES";
  const revisionsExhausted = post.revisionsUsed >= post.revisionsLimit;
  const revisionsLow = !revisionsExhausted && post.revisionsLimit - post.revisionsUsed === 1;

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
            <Badge variant="secondary" className={statusColor}>
              {POST_STATUS_LABELS[post.status as PostStatus]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Details + Approval + Comments */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Approval Banner */}
          {isInReview && (
            <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                      Esta publicación necesita tu revisión
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                      Revisa el contenido y el mockup de vista previa. Puedes aprobarla o solicitar cambios.
                    </p>

                    {/* Approval Actions */}
                    <div className="flex flex-col gap-3 mt-4">
                      {!showChangesForm ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={updateStatus.isLoading}
                              onClick={() => setApproveDialogOpen(true)}
                            >
                              {updateStatus.isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <ThumbsUp className="h-4 w-4 mr-2" />
                              )}
                              Aprobar publicación
                            </Button>

                            {!revisionsExhausted && (
                              <Button
                                variant="outline"
                                className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                                onClick={() => {
                                  if (revisionsLow) {
                                    setLastRevisionWarningOpen(true);
                                  } else {
                                    setShowChangesForm(true);
                                  }
                                }}
                              >
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Solicitar cambios
                              </Button>
                            )}

                            {revisionsExhausted && !post.hasRequestedGuidedReview && (
                              <Button
                                variant="outline"
                                className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/30"
                                onClick={() => setGuidedReviewDialogOpen(true)}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Agendar revisión guiada con creativo
                              </Button>
                            )}

                            {revisionsExhausted && post.hasRequestedGuidedReview && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                <p className="text-xs text-purple-700 dark:text-purple-400">
                                  Revisión guiada solicitada. El equipo se contactará pronto para agendar la sesión.
                                </p>
                              </div>
                            )}

                            {revisionsExhausted && !post.hasRequestedGuidedReview && (
                              <p className="text-xs text-orange-600 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Se alcanzó el límite de revisiones ({post.revisionsLimit})
                              </p>
                            )}
                          </div>

                          {revisionsLow && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Te queda solo 1 revisión disponible ({post.revisionsUsed} de {post.revisionsLimit} usadas)
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Describe los cambios que necesitas..."
                            value={changesNote}
                            onChange={(e) => setChangesNote(e.target.value)}
                            rows={3}
                            className="resize-none bg-white dark:bg-zinc-900"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                              disabled={!changesNote.trim() || updateStatus.isLoading}
                              onClick={() =>
                                updateStatus.mutate({
                                  id: post.id,
                                  toStatus: "CLIENT_CHANGES",
                                  note: changesNote.trim(),
                                })
                              }
                            >
                              {updateStatus.isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Enviar solicitud de cambios
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowChangesForm(false);
                                setChangesNote("");
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Revisiones usadas: {post.revisionsUsed} de {post.revisionsLimit}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status info for non-review states */}
          {isClientChanges && (
            <Card className="border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-orange-800 dark:text-orange-300">
                      Cambios en proceso
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                      Tu agencia está trabajando en los cambios que solicitaste. Te notificaremos cuando esté lista para revisión.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {post.status === "APPROVED" && (
            <Card className="border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-300">
                      Publicación aprobada
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Esta publicación ha sido aprobada y está lista para ser publicada.
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">Copy / Caption</p>
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
              {post.referenceLink && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Link de referencia</p>
                  <a
                    href={post.referenceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {post.referenceLink}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments section removed — comments are internal-only for team use */}

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

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar publicación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres aprobar esta publicación? Tu agencia será notificada y podrá proceder a publicarla.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                updateStatus.mutate({ id: post.id, toStatus: "APPROVED" });
                setApproveDialogOpen(false);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Last Revision Warning Dialog */}
      <Dialog open={lastRevisionWarningOpen} onOpenChange={setLastRevisionWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Última revisión disponible
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Esta es tu <strong className="text-foreground">última revisión</strong> para esta publicación.
              Has usado {post.revisionsUsed} de {post.revisionsLimit} revisiones permitidas.
              <br /><br />
              Si necesitas más cambios después de esta revisión, podrás solicitar una
              <strong className="text-foreground"> revisión guiada con un creativo</strong> de tu agencia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLastRevisionWarningOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => {
                setLastRevisionWarningOpen(false);
                setShowChangesForm(true);
              }}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Entendido, solicitar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guided Review Request Dialog */}
      <Dialog open={guidedReviewDialogOpen} onOpenChange={setGuidedReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Agendar revisión guiada
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Has agotado tus revisiones para esta publicación. Puedes solicitar una
              sesión de revisión guiada con un creativo de tu agencia para resolver
              los cambios pendientes juntos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">
              Notas o cambios que necesitas (opcional)
            </label>
            <Textarea
              placeholder="Describe brevemente qué cambios necesitas o qué aspectos quieres revisar..."
              value={guidedReviewNotes}
              onChange={(e) => setGuidedReviewNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setGuidedReviewDialogOpen(false);
                setGuidedReviewNotes("");
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={requestGuidedReview.isLoading}
              onClick={() => {
                requestGuidedReview.mutate({
                  postId: post.id,
                  notes: guidedReviewNotes.trim() || undefined,
                });
              }}
            >
              {requestGuidedReview.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Solicitar revisión guiada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
      </main>
    </div>
  );
}
