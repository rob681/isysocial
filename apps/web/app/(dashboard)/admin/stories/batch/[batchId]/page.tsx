"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileEdit, Send, Loader2, FileImage, Share2 } from "lucide-react";
import { POST_STATUS_LABELS, POST_STATUS_COLORS } from "@isysocial/shared";
import type { PostStatus } from "@isysocial/shared";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Topbar } from "@/components/layout/topbar";

export default function StoryBatchPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const { data: posts, isLoading } = trpc.posts.getStoryBatch.useQuery({ batchId });
  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.posts.updateBatchStatus.useMutation({
    onSuccess: () => {
      utils.posts.getStoryBatch.invalidate({ batchId });
      toast({ title: "Estado actualizado" });
    },
  });

  const publishBatchMutation = trpc.publishing.publishBatch.useMutation({
    onSuccess: () => {
      utils.posts.getStoryBatch.invalidate({ batchId });
      toast({ title: "Batería publicada exitosamente" });
      router.push("/admin/contenido");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Batería de historias" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Batería de historias" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Batería no encontrada</p>
        </div>
      </div>
    );
  }

  const clientName = posts[0]?.client?.companyName || "";
  const allDraft = posts.every((p) => p.status === "DRAFT");
  const allApproved = posts.every((p) => p.status === "APPROVED");
  const allExported = posts.every((p) => p.media && p.media.length > 0);

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Batería de historias" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin/contenido")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Batería de historias</h1>
              <p className="text-sm text-muted-foreground">
                {posts.length} historias · {clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allDraft && (
              <Button
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ batchId, status: "IN_REVIEW" })}
                disabled={updateStatusMutation.isLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar batería a revisión
              </Button>
            )}
            {allApproved && (
              <Button
                className="gradient-primary text-white"
                onClick={() => setShowPublishDialog(true)}
                disabled={publishBatchMutation.isLoading}
              >
                <Share2 className="h-4 w-4 mr-2" />
                {publishBatchMutation.isLoading ? "Publicando..." : "Publicar batería"}
              </Button>
            )}
          </div>
        </div>

        {/* Story cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {posts.map((post, i) => {
            const thumbnail = post.media?.[0]?.fileUrl;
            const hasStoryData = !!(post as any).storyData;

            return (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Sequence number */}
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow">
                    {i + 1}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "absolute top-2 right-2 z-10 text-[10px]",
                      POST_STATUS_COLORS[post.status as PostStatus]
                    )}
                  >
                    {POST_STATUS_LABELS[post.status as PostStatus]}
                  </Badge>

                  {/* Thumbnail / Preview */}
                  <div className="aspect-[9/16] bg-gradient-to-b from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                    {thumbnail ? (
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center space-y-2">
                        <FileImage className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                        <p className="text-xs text-muted-foreground">
                          {hasStoryData ? "Diseñada" : "Sin diseñar"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate mb-2">{post.title}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/admin/stories/${post.id}/editar`)}
                  >
                    <FileEdit className="h-3 w-3 mr-1.5" />
                    {hasStoryData ? "Editar" : "Diseñar"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info */}
        <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            <strong>Flujo:</strong> Diseña cada historia en Isystory Studio → Exporta cada una → Envía la batería completa a revisión → El cliente aprueba → Se publican todas juntas.
          </p>
        </div>

        {/* Publish Dialog */}
        {showPublishDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-lg font-bold mb-4">Publicar batería de historias</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Se publicarán todas las {posts?.length} historias. ¿Deseas continuar?
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowPublishDialog(false)}
                    disabled={publishBatchMutation.isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="gradient-primary text-white"
                    onClick={() => {
                      publishBatchMutation.mutate({
                        batchId,
                        networkIds: [],
                        agencyNetworkIds: [],
                      });
                      setShowPublishDialog(false);
                    }}
                    disabled={publishBatchMutation.isLoading}
                  >
                    {publishBatchMutation.isLoading ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
