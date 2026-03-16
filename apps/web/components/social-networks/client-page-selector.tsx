"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NETWORK_COLORS: Record<string, string> = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#E1306C",
  LINKEDIN: "#0A66C2",
  TIKTOK: "#010101",
  X: "#000000",
};

interface ClientPageSelectorProps {
  clientId: string;
  onAssignSuccess?: () => void;
}

export function ClientPageSelector({ clientId, onAssignSuccess }: ClientPageSelectorProps) {
  const { toast } = useToast();
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: availableData, isLoading } = trpc.clients.getAvailablePagesToAssign.useQuery({
    clientId,
  });

  const { data: currentData, refetch: refetchCurrent } = trpc.clients.getClientPages.useQuery({
    clientId,
  });

  const assignPages = trpc.clients.assignPagesToClient.useMutation({
    onSuccess: () => {
      toast({ title: "✅ Páginas asignadas exitosamente" });
      setSelectedPages(new Set());
      refetchCurrent();
      onAssignSuccess?.();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removePage = trpc.clients.removePageFromClient.useMutation({
    onSuccess: () => {
      toast({ title: "✅ Página desvinculada" });
      refetchCurrent();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleAssign = async () => {
    if (selectedPages.size === 0) {
      toast({ title: "Selecciona al menos una página", variant: "default" });
      return;
    }

    setIsAssigning(true);
    try {
      await assignPages.mutateAsync({
        clientId,
        pageIds: Array.from(selectedPages),
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const groupedPages = availableData?.availablePages.reduce(
    (acc, page) => {
      if (!acc[page.network]) {
        acc[page.network] = [];
      }
      acc[page.network].push(page);
      return acc;
    },
    {} as Record<string, typeof availableData.availablePages>
  ) || {};

  return (
    <div className="space-y-6">
      {/* Currently assigned pages */}
      {currentData && currentData.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Páginas Asignadas ({currentData.total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(currentData.pages).map(([network, pages]: [string, any]) => (
              <div key={network}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{network}</p>
                <div className="space-y-2">
                  {pages.map((page: any) => (
                    <div key={page.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        {page.profilePic && (
                          <img src={page.profilePic} alt={page.accountName} className="h-6 w-6 rounded-full" />
                        )}
                        <div className="text-sm">{page.accountName}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePage.mutate({ clientId, pageId: page.pageId })}
                        disabled={removePage.isPending}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Available pages to assign */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asignar Nuevas Páginas</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">Selecciona las páginas que deseas vincular a este cliente</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(groupedPages).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay páginas disponibles</p>
              <p className="text-xs mt-1">Conecta páginas desde Configuración → Meta primero</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedPages).map(([network, pages]) => (
                <div key={network}>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: NETWORK_COLORS[network] }}
                    />
                    {network}
                  </p>
                  <div className="space-y-2 ml-5">
                    {pages.map((page) => (
                      <div key={page.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={page.id}
                          checked={selectedPages.has(page.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedPages);
                            if (e.target.checked) {
                              newSelected.add(page.id);
                            } else {
                              newSelected.delete(page.id);
                            }
                            setSelectedPages(newSelected);
                          }}
                          disabled={page.alreadyAssigned}
                          className="h-4 w-4 cursor-pointer"
                        />
                        <label
                          htmlFor={page.id}
                          className="text-sm cursor-pointer flex items-center gap-2 flex-1"
                        >
                          {page.profilePic && (
                            <img src={page.profilePic} alt={page.accountName} className="h-5 w-5 rounded-full" />
                          )}
                          {page.accountName}
                          {page.alreadyAssigned && <Badge variant="secondary" className="ml-auto text-xs">Asignada</Badge>}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Button
                onClick={handleAssign}
                disabled={selectedPages.size === 0 || isAssigning}
                className="w-full mt-6"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Asignar {selectedPages.size} página{selectedPages.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
