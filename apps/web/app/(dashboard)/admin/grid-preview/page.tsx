"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid3X3, Instagram } from "lucide-react";
import { InstagramGrid } from "@/components/grid-preview/instagram-grid";
import { NETWORK_LABELS } from "@isysocial/shared";

export default function GridPreviewPage() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<"INSTAGRAM" | "TIKTOK">("INSTAGRAM");

  const { data: clients, isLoading: loadingClients } = trpc.posts.getClientsForSelect.useQuery();

  // Filter clients that have IG or TikTok
  const eligibleClients = clients?.filter((c) =>
    c.networks.includes(selectedNetwork)
  ) || [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Grid3X3 className="h-6 w-6" />
          Grid Preview
        </h1>
        <p className="text-muted-foreground text-sm">
          Vista previa del feed de Instagram o TikTok de tus clientes
        </p>
      </div>

      {/* Selectors */}
      <div className="flex items-center gap-3">
        <Select
          value={selectedNetwork}
          onValueChange={(v) => {
            setSelectedNetwork(v as "INSTAGRAM" | "TIKTOK");
            setSelectedClient(""); // Reset client when network changes
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INSTAGRAM">{NETWORK_LABELS.INSTAGRAM}</SelectItem>
            <SelectItem value="TIKTOK">{NETWORK_LABELS.TIKTOK}</SelectItem>
          </SelectContent>
        </Select>

        {loadingClients ? (
          <Skeleton className="h-10 w-[200px]" />
        ) : (
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {eligibleClients.length === 0 ? (
                <SelectItem value="" disabled>
                  No hay clientes con {NETWORK_LABELS[selectedNetwork]}
                </SelectItem>
              ) : (
                eligibleClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid */}
      {selectedClient ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {selectedNetwork === "INSTAGRAM" ? (
                <Instagram className="h-4 w-4" />
              ) : (
                <Grid3X3 className="h-4 w-4" />
              )}
              {clients?.find((c) => c.id === selectedClient)?.companyName} — {NETWORK_LABELS[selectedNetwork]}
            </CardTitle>
            <CardDescription>
              Posts aprobados, programados y publicados (últimos 12)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-lg">
            <InstagramGrid
              clientId={selectedClient}
              network={selectedNetwork}
              limit={12}
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
  );
}
