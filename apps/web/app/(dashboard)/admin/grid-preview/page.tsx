"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid3X3, Instagram } from "lucide-react";
import { InstagramGrid } from "@/components/grid-preview/instagram-grid";
import { NETWORK_LABELS } from "@isysocial/shared";
import { Topbar } from "@/components/layout/topbar";

function GridPreviewContent() {
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId");

  const [selectedClient, setSelectedClient] = useState<string>(clientIdParam || "");
  const [selectedNetwork, setSelectedNetwork] = useState<"INSTAGRAM" | "TIKTOK">("INSTAGRAM");

  const { data: clients, isLoading: loadingClients } = trpc.posts.getClientsForSelect.useQuery();

  // Auto-select client from URL and detect available networks
  useEffect(() => {
    if (clientIdParam) setSelectedClient(clientIdParam);
  }, [clientIdParam]);

  // Auto-detect which networks the selected client has
  const clientData = clients?.find((c) => c.id === selectedClient);
  const hasInstagram = clientData?.networks.includes("INSTAGRAM");
  const hasTikTok = clientData?.networks.includes("TIKTOK");

  // Auto-switch network if current one isn't available
  useEffect(() => {
    if (selectedClient && clientData) {
      if (selectedNetwork === "INSTAGRAM" && !hasInstagram && hasTikTok) {
        setSelectedNetwork("TIKTOK");
      } else if (selectedNetwork === "TIKTOK" && !hasTikTok && hasInstagram) {
        setSelectedNetwork("INSTAGRAM");
      }
    }
  }, [selectedClient, clientData, hasInstagram, hasTikTok, selectedNetwork]);

  // Get client name for header
  const clientName = clientData?.companyName;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={clientName ? `Grid — ${clientName}` : "Grid Preview"} />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Network tabs (only if client has both) */}
          {selectedClient && hasInstagram && hasTikTok && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedNetwork("INSTAGRAM")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedNetwork === "INSTAGRAM"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </button>
              <button
                onClick={() => setSelectedNetwork("TIKTOK")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedNetwork === "TIKTOK"
                    ? "bg-black text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
                TikTok
              </button>
            </div>
          )}

          {/* Client selector (only if no clientId from URL) */}
          {!clientIdParam && (
            <div className="flex items-center gap-3">
              {loadingClients ? (
                <Skeleton className="h-10 w-[250px]" />
              ) : (
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-background w-[280px]"
                >
                  <option value="">Selecciona un cliente</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Grid */}
          {selectedClient ? (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {selectedNetwork === "INSTAGRAM" ? (
                    <Instagram className="h-4 w-4" />
                  ) : (
                    <Grid3X3 className="h-4 w-4" />
                  )}
                  {selectedNetwork === "INSTAGRAM" ? "Instagram" : "TikTok"} Grid
                </CardTitle>
                <CardDescription>
                  Así se verá el perfil con el contenido programado y publicado
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden rounded-b-lg">
                <InstagramGrid
                  clientId={selectedClient}
                  network={selectedNetwork}
                  limit={18}
                  linkPrefix="/admin/contenido"
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Grid3X3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  Selecciona un cliente
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Elige un cliente para ver la vista previa de su feed
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function GridPreviewPage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1"><Topbar title="Grid Preview" /><main className="flex-1 p-8"><Skeleton className="h-96 w-full" /></main></div>}>
      <GridPreviewContent />
    </Suspense>
  );
}
