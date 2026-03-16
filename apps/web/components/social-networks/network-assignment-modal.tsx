"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SocialNetwork = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "TIKTOK" | "X";

interface NetworkAssignmentModalProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
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
// Component
// ---------------------------------------------------------------------------

export function NetworkAssignmentModal({
  clientId,
  clientName,
  open,
  onOpenChange,
  onAssigned,
}: NetworkAssignmentModalProps) {
  const { toast } = useToast();
  const [selectedPages, setSelectedPages] = useState<
    Map<SocialNetwork, Set<string>>
  >(new Map());

  const { data, isLoading } = trpc.clients.getSocialNetworksDashboard.useQuery(
    undefined,
    { enabled: open }
  );

  const assignMutation = trpc.clients.assignNetworksToClient.useMutation({
    onSuccess: () => {
      toast({ title: "Páginas asignadas exitosamente" });
      setSelectedPages(new Map());
      onAssigned();
      onOpenChange(false);
    },
    onError: (err) =>
      toast({
        title: "Error al asignar",
        description: err.message,
        variant: "destructive",
      }),
  });

  // Build a set of already-assigned account IDs for quick lookup
  const alreadyAssigned = useMemo(() => {
    const set = new Set<string>();
    if (!data?.dashboard) return set;
    for (const [, networkData] of Object.entries(data.dashboard)) {
      for (const [cId, clientData] of Object.entries(networkData.clientAssignments)) {
        if (cId === clientId) {
          for (const pg of clientData.pages) {
            if (pg.pageId) set.add(pg.pageId);
          }
        }
      }
    }
    return set;
  }, [data, clientId]);

  // Count new selections (not already assigned)
  const newSelectionCount = useMemo(() => {
    let count = 0;
    selectedPages.forEach((pageIds) => {
      pageIds.forEach((pid) => {
        if (!alreadyAssigned.has(pid)) count++;
      });
    });
    return count;
  }, [selectedPages, alreadyAssigned]);

  const togglePage = (network: SocialNetwork, pageId: string) => {
    if (alreadyAssigned.has(pageId)) return;

    setSelectedPages((prev) => {
      const next = new Map(prev);
      const networkSet = new Set(next.get(network) ?? []);
      if (networkSet.has(pageId)) {
        networkSet.delete(pageId);
      } else {
        networkSet.add(pageId);
      }
      if (networkSet.size === 0) {
        next.delete(network);
      } else {
        next.set(network, networkSet);
      }
      return next;
    });
  };

  const handleAssign = () => {
    const assignments: { network: SocialNetwork; pageIds: string[] }[] = [];
    selectedPages.forEach((pageIds, network) => {
      const newIds = Array.from(pageIds).filter(
        (pid) => !alreadyAssigned.has(pid)
      );
      if (newIds.length > 0) {
        assignments.push({ network, pageIds: newIds });
      }
    });

    if (assignments.length === 0) {
      toast({ title: "Selecciona al menos una página nueva" });
      return;
    }

    assignMutation.mutate({ clientId, assignments });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Redes Sociales</DialogTitle>
          <DialogDescription>
            Selecciona las páginas que deseas vincular a{" "}
            <span className="font-medium text-foreground">{clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {isLoading ? (
          <div className="space-y-4 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="space-y-2 ml-4">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.dashboard || Object.keys(data.dashboard).length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm font-medium">
              No hay cuentas de redes sociales disponibles
            </p>
            <p className="text-xs mt-1">
              Conecta cuentas desde Configuración primero
            </p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {Object.entries(data.dashboard)
              .filter(([, netData]) => netData.accounts.length > 0)
              .map(([networkKey, networkData]) => {
                const network = networkKey as SocialNetwork;
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
                        {networkData.accounts.length}
                      </Badge>
                    </div>

                    <div className="space-y-2 ml-5">
                      {networkData.accounts.map((account) => {
                        const pageId = account.accountId;
                        const isAlready = alreadyAssigned.has(pageId);
                        const isSelected =
                          selectedPages.get(network)?.has(pageId) ?? false;

                        return (
                          <label
                            key={account.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isAlready
                                ? "opacity-60 cursor-default bg-muted/20"
                                : isSelected
                                ? "border-primary/50 bg-primary/5"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isAlready || isSelected}
                              disabled={isAlready}
                              onChange={() => togglePage(network, pageId)}
                              className="h-4 w-4 shrink-0"
                            />
                            <Avatar className="h-7 w-7">
                              {account.profilePic ? (
                                <AvatarImage
                                  src={account.profilePic}
                                  alt={account.accountName}
                                />
                              ) : null}
                              <AvatarFallback
                                className="text-[10px]"
                                style={{
                                  backgroundColor: meta.color + "20",
                                  color: meta.color,
                                }}
                              >
                                {account.accountName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm flex-1 truncate">
                              {account.accountName}
                            </span>
                            {isAlready && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] shrink-0"
                              >
                                Ya asignado
                              </Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={newSelectionCount === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Asignando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Asignar {newSelectionCount > 0 ? newSelectionCount : ""} Página
                {newSelectionCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
