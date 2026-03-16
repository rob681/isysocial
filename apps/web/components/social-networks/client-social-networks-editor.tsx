"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Unlink,
  FileEdit,
  Clock,
  Send,
  Globe,
  CalendarDays,
} from "lucide-react";
import { NetworkAssignmentModal } from "./network-assignment-modal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SocialNetwork = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "TIKTOK" | "X";

interface ClientSocialNetworksEditorProps {
  clientId: string;
  clientName?: string;
}

const NETWORK_META: Record<
  SocialNetwork,
  { label: string; color: string }
> = {
  FACEBOOK: { label: "Facebook", color: "#1877f2" },
  INSTAGRAM: { label: "Instagram", color: "#e4405f" },
  LINKEDIN: { label: "LinkedIn", color: "#0a66c2" },
  TIKTOK: { label: "TikTok", color: "#000000" },
  X: { label: "X (Twitter)", color: "#000000" },
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, gi) => (
        <div key={gi} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border"
            >
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClientSocialNetworksEditor({
  clientId,
  clientName = "Cliente",
}: ClientSocialNetworksEditorProps) {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    data,
    isLoading,
    refetch,
  } = trpc.clients.getClientSocialNetworksDetail.useQuery({ clientId });

  // pages from API is already grouped by network: Record<string, Page[]>
  const groupedPages = (data?.pages ?? {}) as Record<SocialNetwork, Array<{
    id: string;
    pageId: string | null;
    accountName: string | null;
    profilePic: string | null;
    isActive: boolean;
    assignedAt: Date;
  }>>;

  const totalPages = data?.total ?? 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Redes Sociales
              {totalPages > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {totalPages}
                </Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Agregar Más Páginas
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {isLoading ? (
            <EditorSkeleton />
          ) : totalPages === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Globe className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                No hay redes sociales vinculadas
              </p>
              <p className="text-xs mt-1">
                Vincula páginas de redes sociales a este cliente
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Agregar Páginas
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {(
                Object.entries(groupedPages) as [
                  SocialNetwork,
                  (typeof groupedPages)[SocialNetwork],
                ][]
              ).map(([network, pages]) => {
                const meta = NETWORK_META[network];
                if (!meta) return null;

                return (
                  <div key={network}>
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <p className="text-sm font-medium">{meta.label}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {pages.length}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {pages.map((page) => (
                        <PageCard
                          key={page.id}
                          page={page}
                          network={network}
                          color={meta.color}
                          clientId={clientId}
                          postCounts={data?.postCounts}
                          lastPublishedAt={data?.lastPublishedAt}
                          onRemoved={() => refetch()}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <NetworkAssignmentModal
        clientId={clientId}
        clientName={clientName}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAssigned={() => refetch()}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page card sub-component
// ---------------------------------------------------------------------------

interface PageCardProps {
  page: {
    id: string;
    accountName: string | null;
    profilePic: string | null;
    isActive: boolean;
    pageId: string | null;
    assignedAt: Date;
  };
  network: SocialNetwork;
  color: string;
  clientId: string;
  postCounts?: Record<string, number>;
  lastPublishedAt?: Date | string | null;
  onRemoved: () => void;
}

function PageCard({ page, network, color, clientId, postCounts, lastPublishedAt, onRemoved }: PageCardProps) {
  const { toast } = useToast();

  // We reuse assignNetworksToClient with empty pageIds to unlink,
  // or use a dedicated removePage mutation if available.
  // For now we call assignNetworksToClient with the page removed.
  // If there's a removePage mutation it would be preferable.
  const removeMutation = trpc.clients.assignNetworksToClient.useMutation({
    onSuccess: () => {
      toast({ title: "Página desvinculada" });
      onRemoved();
    },
    onError: (err) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const handleRemove = () => {
    // Assign with empty array effectively unlinks
    removeMutation.mutate({
      clientId,
      assignments: [{ network, pageIds: [] }],
    });
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <Avatar className="h-9 w-9 shrink-0">
        {page.profilePic ? (
          <AvatarImage src={page.profilePic} alt={page.accountName ?? undefined} />
        ) : null}
        <AvatarFallback
          className="text-xs"
          style={{
            backgroundColor: color + "20",
            color,
          }}
        >
          {(page.accountName || "??").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium truncate">{page.accountName || "Sin nombre"}</p>
          <Badge
            variant={page.isActive ? "default" : "secondary"}
            className="text-[10px] shrink-0"
          >
            {page.isActive ? "Activa" : "Inactiva"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(postCounts?.DRAFT ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 font-normal">
              <FileEdit className="h-3 w-3" />
              {postCounts?.DRAFT} borrador{(postCounts?.DRAFT ?? 0) !== 1 ? "es" : ""}
            </Badge>
          )}
          {(postCounts?.SCHEDULED ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 font-normal">
              <Clock className="h-3 w-3" />
              {postCounts?.SCHEDULED} programado{(postCounts?.SCHEDULED ?? 0) !== 1 ? "s" : ""}
            </Badge>
          )}
          {(postCounts?.PUBLISHED ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 font-normal">
              <Send className="h-3 w-3" />
              {postCounts?.PUBLISHED} publicado{(postCounts?.PUBLISHED ?? 0) !== 1 ? "s" : ""}
            </Badge>
          )}
          {lastPublishedAt && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(lastPublishedAt).toLocaleDateString("es", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        disabled={removeMutation.isPending}
        title="Desvincular página"
      >
        <Unlink className="h-4 w-4" />
      </Button>
    </div>
  );
}
