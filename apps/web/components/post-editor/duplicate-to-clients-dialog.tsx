"use client";

import * as React from "react";
import { Copy, Loader2, Search, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { NETWORK_COLORS, NETWORK_LABELS } from "@isysocial/shared";
import type { SocialNetwork } from "@isysocial/shared";
import { cn } from "@/lib/utils";

interface DuplicateToClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePostId: string;
  sourceClientId: string;
  sourceClientName: string;
  sourceNetwork: SocialNetwork;
  sourceHasSchedule: boolean;
  onSuccess?: () => void;
}

/**
 * Dialog that lets an admin/editor duplicate the current post into one or more
 * OTHER clients in the same agency. Each destination client gets an independent
 * Post (DRAFT) — no linking, no cascade on future edits.
 *
 * The target network for each duplicate is resolved server-side: the source
 * network if the destination has it, otherwise the client's first connected
 * network. Clients with zero connected networks are skipped.
 */
export function DuplicateToClientsDialog({
  open,
  onOpenChange,
  sourcePostId,
  sourceClientId,
  sourceClientName,
  sourceNetwork,
  sourceHasSchedule,
  onSuccess,
}: DuplicateToClientsDialogProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [keepSchedule, setKeepSchedule] = React.useState(false);
  const [sendForReview, setSendForReview] = React.useState(false);

  const { data: clients, isLoading } = trpc.posts.getClientsForSelect.useQuery(
    undefined,
    { enabled: open }
  );

  const duplicate = trpc.posts.duplicateToClients.useMutation({
    onSuccess: (res) => {
      const { created, skipped } = res;
      toast({
        title: "Publicaciones duplicadas",
        description:
          `Se crearon ${created} borrador${created === 1 ? "" : "es"}` +
          (skipped > 0 ? ` · ${skipped} omitido${skipped === 1 ? "" : "s"} (sin redes o cliente origen)` : ""),
      });
      onOpenChange(false);
      setSelectedIds([]);
      setSearch("");
      setKeepSchedule(false);
      setSendForReview(false);
      onSuccess?.();
    },
    onError: (err) =>
      toast({
        title: "Error al duplicar",
        description: err.message,
        variant: "destructive",
      }),
  });

  // Exclude the source client and anything without networks, from the selectable list.
  const selectableClients = React.useMemo(() => {
    if (!clients) return [];
    return clients.filter((c) => c.id !== sourceClientId);
  }, [clients, sourceClientId]);

  const filteredClients = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return selectableClients;
    return selectableClients.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        (c.contactName ?? "").toLowerCase().includes(q)
    );
  }, [selectableClients, search]);

  const toggleClient = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map((c) => c.id));
    }
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) return;
    duplicate.mutate({
      sourcePostId,
      targetClientIds: selectedIds,
      keepScheduledAt: keepSchedule,
      initialStatus: sendForReview ? "IN_REVIEW" : "DRAFT",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Compartir con otros clientes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary of what we're duplicating */}
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Origen: </span>
              <span className="font-medium">{sourceClientName}</span>
              <Badge
                className="ml-2"
                style={{ backgroundColor: NETWORK_COLORS[sourceNetwork], color: "white" }}
              >
                {NETWORK_LABELS[sourceNetwork]}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              Se creará una copia independiente (borrador) en cada cliente destino.
              El copy, hashtags y media se duplican. La red destino es automática
              (misma red si está conectada, o la primera disponible).
            </p>
          </div>

          {/* Search + select-all */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAll}
              disabled={filteredClients.length === 0}
            >
              {selectedIds.length === filteredClients.length && filteredClients.length > 0
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </Button>
          </div>

          {/* Client list */}
          <div className="max-h-[280px] overflow-y-auto rounded-md border divide-y">
            {isLoading && (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando clientes…
              </div>
            )}
            {!isLoading && filteredClients.length === 0 && (
              <div className="flex flex-col items-center justify-center p-6 text-sm text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-50" />
                {selectableClients.length === 0
                  ? "No hay otros clientes disponibles en tu agencia."
                  : "Ningún cliente coincide con tu búsqueda."}
              </div>
            )}
            {filteredClients.map((c) => {
              const checked = selectedIds.includes(c.id);
              const hasNetworks = c.networks.length > 0;
              const hasSourceNetwork = c.networks.includes(sourceNetwork);
              return (
                <label
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                    checked ? "bg-primary/5" : "hover:bg-muted/40",
                    !hasNetworks && "opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleClient(c.id)}
                    disabled={!hasNetworks}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{c.companyName}</span>
                      {!hasNetworks && (
                        <Badge variant="outline" className="text-xs">
                          Sin redes
                        </Badge>
                      )}
                    </div>
                    {c.contactName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {c.contactName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end max-w-[220px]">
                    {c.networks.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    ) : (
                      c.networks.slice(0, 5).map((n) => (
                        <span
                          key={n}
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] rounded text-white font-medium",
                            n === sourceNetwork && hasSourceNetwork && "ring-2 ring-offset-1 ring-offset-background ring-primary"
                          )}
                          style={{ backgroundColor: NETWORK_COLORS[n as SocialNetwork] }}
                        >
                          {NETWORK_LABELS[n as SocialNetwork]}
                        </span>
                      ))
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Options */}
          <div className="space-y-2 rounded-md border p-3">
            {sourceHasSchedule && (
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Mantener fecha de programación</Label>
                  <p className="text-xs text-muted-foreground">
                    Si está desactivado, las copias quedan sin fecha (borrador).
                  </p>
                </div>
                <Switch checked={keepSchedule} onCheckedChange={setKeepSchedule} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Enviar a revisión</Label>
                <p className="text-xs text-muted-foreground">
                  Los clientes destino reciben notificación y pueden aprobar directamente.
                </p>
              </div>
              <Switch checked={sendForReview} onCheckedChange={setSendForReview} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || duplicate.isLoading}
          >
            {duplicate.isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Duplicar en {selectedIds.length} cliente{selectedIds.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
