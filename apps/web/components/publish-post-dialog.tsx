"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ─── PublishPostDialog ──────────────────────────────────────────── */
const NETWORK_META_MINI: Record<string, { label: string; color: string }> = {
  FACEBOOK: { label: "Facebook", color: "#1877F2" },
  INSTAGRAM: { label: "Instagram", color: "#E1306C" },
  LINKEDIN: { label: "LinkedIn", color: "#0A66C2" },
  X: { label: "X (Twitter)", color: "#000000" },
  TIKTOK: { label: "TikTok", color: "#010101" },
};

export function PublishPostDialog({
  postId,
  postTitle,
  network,
  postType,
  clientId,
  open,
  onOpenChange,
  onPublished,
}: {
  postId: string;
  postTitle: string;
  network: string;
  postType: string;
  clientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPublished: () => void;
}) {
  const { toast } = useToast();
  const [publishResults, setPublishResults] = useState<
    { networkId: string; network: string; status: string; platformUrl?: string; error?: string }[]
  >([]);
  const [isPublished, setIsPublished] = useState(false);

  const { data: networkStatus, isLoading: statusLoading } =
    trpc.publishing.getNetworkStatus.useQuery({ clientId });

  const { data: publishLogs } = trpc.publishing.getPublishLogs.useQuery({ postId });

  const publishMutation = trpc.publishing.publishPost.useMutation({
    onSuccess: (data) => {
      setPublishResults(data.results);
      setIsPublished(true);
      if (data.anySuccess) {
        toast({ title: "¡Publicado exitosamente!" });
        onPublished();
      } else {
        toast({
          title: "Error al publicar",
          description: "No se pudo publicar en ninguna red.",
          variant: "destructive",
        });
      }
    },
    onError: (err) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const retryMutation = trpc.publishing.retryPublish.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Reintento exitoso" });
        onPublished();
      } else {
        toast({ title: "Error al reintentar", description: data.error, variant: "destructive" });
      }
    },
    onError: (err) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Find the connected network for this post's network
  const connectedNetwork = networkStatus?.find(
    (n) => n.network === network && n.connected
  );
  const networkMeta = NETWORK_META_MINI[network];
  const isTikTokNonVideo = network === "TIKTOK" && postType !== "VIDEO" && postType !== "REEL";

  function handlePublish() {
    if (!connectedNetwork) return;
    // Route to correct ID array based on source (client vs agency)
    if (connectedNetwork.source === "agency") {
      publishMutation.mutate({
        postId,
        agencyNetworkIds: [connectedNetwork.id],
      });
    } else {
      publishMutation.mutate({
        postId,
        networkIds: [connectedNetwork.id],
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Publicar en {networkMeta?.label ?? network}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Post summary */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium">{postTitle}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: networkMeta?.color ?? "#888" }}
              >
                {networkMeta?.label ?? network}
              </span>
              <span className="text-xs text-muted-foreground">{postType}</span>
            </div>
          </div>

          {/* Connection status */}
          <div>
            <p className="text-sm font-medium mb-2">Estado de conexión</p>
            {statusLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : connectedNetwork ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {networkMeta?.label} conectado
                  </span>
                  {connectedNetwork.accountName && (
                    <span className="text-xs text-muted-foreground ml-2">
                      — {connectedNetwork.accountName}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-destructive">
                    {networkMeta?.label} no conectado
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex-shrink-0"
                >
                  <a href={`/admin/clientes/${clientId}?tab=redes`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Conectar
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* TikTok warning */}
          {isTikTokNonVideo && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                TikTok solo admite posts de tipo VIDEO o REEL. Este post no puede publicarse en TikTok.
              </p>
            </div>
          )}

          {/* Previous publish logs */}
          {publishLogs && publishLogs.length > 0 && !isPublished && (
            <div>
              <p className="text-sm font-medium mb-2">Historial de publicaciones</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {publishLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/50"
                  >
                    {log.status === "SUCCESS" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    ) : log.status === "FAILED" ? (
                      <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate">
                      {new Date(log.attemptedAt).toLocaleDateString("es", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {log.errorMessage && (
                        <span className="text-destructive ml-1">— {log.errorMessage}</span>
                      )}
                    </span>
                    {log.platformUrl && (
                      <a
                        href={log.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Ver <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {log.status === "FAILED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-2 py-0"
                        disabled={retryMutation.isLoading}
                        onClick={() => retryMutation.mutate({ publishLogId: log.id })}
                      >
                        {retryMutation.isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Reintentar"
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publish results */}
          {isPublished && publishResults.length > 0 && (
            <div className="space-y-2">
              {publishResults.map((r) => (
                <div
                  key={r.networkId}
                  className={`flex items-center gap-2 p-3 rounded-md border ${
                    r.status === "SUCCESS"
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : "bg-destructive/10 border-destructive/20"
                  }`}
                >
                  {r.status === "SUCCESS" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      {r.status === "SUCCESS" ? "Publicado exitosamente" : "Error al publicar"}
                    </span>
                    {r.error && (
                      <p className="text-xs text-muted-foreground mt-0.5">{r.error}</p>
                    )}
                  </div>
                  {r.platformUrl && (
                    <a
                      href={r.platformUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver post <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Warning */}
          {!isPublished && connectedNetwork && !isTikTokNonVideo && (
            <p className="text-xs text-muted-foreground">
              ⚠️ Esta acción publicará en {networkMeta?.label} de forma inmediata. Una vez publicado, el contenido no puede deshacerse desde Isysocial.
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {isPublished ? "Cerrar" : "Cancelar"}
            </Button>
            {!isPublished && connectedNetwork && !isTikTokNonVideo && (
              <Button
                className="gradient-primary text-white"
                disabled={publishMutation.isLoading}
                onClick={handlePublish}
              >
                {publishMutation.isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Publicar en {networkMeta?.label ?? network}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
