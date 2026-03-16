"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Users,
  ChevronRight,
  Unlink,
  CircleDot,
  Share2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SocialNetwork = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "TIKTOK" | "X";

const NETWORKS: SocialNetwork[] = [
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "TIKTOK",
  "X",
];

const NETWORK_META: Record<
  SocialNetwork,
  { label: string; color: string; bg: string }
> = {
  FACEBOOK: { label: "Facebook", color: "#1877f2", bg: "bg-[#1877f2]" },
  INSTAGRAM: { label: "Instagram", color: "#e4405f", bg: "bg-[#e4405f]" },
  LINKEDIN: { label: "LinkedIn", color: "#0a66c2", bg: "bg-[#0a66c2]" },
  TIKTOK: { label: "TikTok", color: "#000000", bg: "bg-black" },
  X: { label: "X (Twitter)", color: "#000000", bg: "bg-black" },
};

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function ColumnSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Network icon badge helper
// ---------------------------------------------------------------------------

function NetworkBadge({
  network,
  size = "md",
}: {
  network: SocialNetwork;
  size?: "sm" | "md";
}) {
  const meta = NETWORK_META[network];
  const sizeClasses = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span
      className={`${sizeClasses} rounded-full text-white font-bold flex items-center justify-center shrink-0`}
      style={{ backgroundColor: meta.color }}
    >
      {meta.label[0]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SocialNetworksDashboard() {
  const [selectedNetwork, setSelectedNetwork] = useState<SocialNetwork>("FACEBOOK");

  const { data, isLoading } = trpc.clients.getSocialNetworksDashboard.useQuery();

  // Derive data for current network from dashboard Record
  const currentNetworkData = data?.dashboard?.[selectedNetwork];
  const accounts = currentNetworkData?.accounts ?? [];
  // Flatten clientAssignments Record into an array for rendering
  const assignments = Object.values(currentNetworkData?.clientAssignments ?? {}).flatMap(
    (client) =>
      client.pages.map((pg) => ({
        clientId: client.clientId,
        clientName: client.companyName ?? "Sin nombre",
        logoUrl: client.logoUrl,
        pageId: pg.pageId,
        accountName: pg.accountName,
      }))
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* ---------------------------------------------------------------- */}
      {/* LEFT COLUMN — Network list                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="md:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Redes Sociales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible">
              {NETWORKS.map((network) => {
                const meta = NETWORK_META[network];
                const isActive = selectedNetwork === network;
                const networkData = data?.dashboard?.[network];
                const accountCount = networkData?.accounts?.length ?? 0;

                return (
                  <button
                    key={network}
                    onClick={() => setSelectedNetwork(network)}
                    className={`flex items-center gap-3 px-4 py-3 text-left w-full transition-colors text-sm whitespace-nowrap ${
                      isActive
                        ? "bg-primary/5 border-l-2 md:border-l-2 border-b-2 md:border-b-0 font-medium"
                        : "hover:bg-muted/50 border-l-2 md:border-l-2 border-b-2 md:border-b-0 border-transparent"
                    }`}
                    style={
                      isActive
                        ? { borderColor: meta.color }
                        : undefined
                    }
                  >
                    <NetworkBadge network={network} size="sm" />
                    <span className="flex-1">{meta.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {accountCount}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* CENTER COLUMN — Agency accounts for selected network             */}
      {/* ---------------------------------------------------------------- */}
      <div className="md:col-span-5">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Cuentas de {NETWORK_META[selectedNetwork].label}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Páginas y cuentas conectadas de la agencia
            </p>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {isLoading ? (
              <ColumnSkeleton />
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CircleDot className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Sin cuentas conectadas</p>
                <p className="text-xs mt-1">
                  Conecta cuentas de {NETWORK_META[selectedNetwork].label} desde
                  Configuración
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      {account.profilePic ? (
                        <AvatarImage
                          src={account.profilePic}
                          alt={account.accountName}
                        />
                      ) : null}
                      <AvatarFallback
                        style={{
                          backgroundColor:
                            NETWORK_META[selectedNetwork].color + "20",
                          color: NETWORK_META[selectedNetwork].color,
                        }}
                      >
                        {account.accountName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {account.accountName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        ID: {account.accountId}
                      </p>
                    </div>
                    <Badge
                      variant={account.isActive ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {account.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* RIGHT COLUMN — Client assignments                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="md:col-span-4">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes Asignados
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Clientes vinculados a {NETWORK_META[selectedNetwork].label}
            </p>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {isLoading ? (
              <ColumnSkeleton rows={3} />
            ) : assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Sin clientes asignados</p>
                <p className="text-xs mt-1">
                  Asigna clientes desde su ficha de detalle
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment, idx) => (
                  <div
                    key={`${assignment.clientId}-${assignment.pageId}-${idx}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      {assignment.logoUrl ? (
                        <AvatarImage
                          src={assignment.logoUrl}
                          alt={assignment.clientName}
                        />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {(assignment.clientName || "??").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {assignment.clientName}
                      </p>
                      {assignment.accountName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {assignment.accountName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
