"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Unlink,
  Globe,
  User,
  LayoutGrid,
  Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Topbar } from "@/components/layout/topbar";
import { ClientPageSelector } from "@/components/social-networks/client-page-selector";
import { ClientSocialNetworksEditor } from "@/components/social-networks/client-social-networks-editor";

// ── Network metadata ──────────────────────────────────────────────────────────
const NETWORK_META: Record<
  string,
  { label: string; color: string; icon: string; note?: string }
> = {
  FACEBOOK: {
    label: "Facebook",
    color: "#1877F2",
    icon: "🟦",
    note: "Publica en tu Página de Facebook",
  },
  INSTAGRAM: {
    label: "Instagram",
    color: "#E1306C",
    icon: "📸",
    note: "Requiere cuenta Business vinculada a una Página",
  },
  LINKEDIN: {
    label: "LinkedIn",
    color: "#0A66C2",
    icon: "🔵",
    note: "Publica en perfil personal o página de empresa",
  },
  X: {
    label: "X (Twitter)",
    color: "#000000",
    icon: "𝕏",
    note: "Máx. 280 caracteres · 50 tweets/día (plan gratuito)",
  },
  TIKTOK: {
    label: "TikTok",
    color: "#010101",
    icon: "🎵",
    note: "Solo admite posts de tipo VIDEO",
  },
};

const ALL_NETWORKS = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "X", "TIKTOK"];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const clientId = params.id as string;

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "info");
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Show connection success/error toasts from OAuth redirect
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      const meta = NETWORK_META[connected.toUpperCase()];
      toast({
        title: `${meta?.label ?? connected} conectado`,
        description: "La red social fue conectada exitosamente.",
      });
    }
    if (error) {
      toast({
        title: "Error al conectar",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: clientData, isLoading: clientLoading } =
    trpc.clients.get.useQuery({ id: clientId });
  const client = clientData as any;

  const {
    data: networkStatus,
    isLoading: networksLoading,
    refetch: refetchNetworks,
  } = trpc.publishing.getNetworkStatus.useQuery(
    { clientId },
    { enabled: activeTab === "redes" }
  );

  // ── Disconnect handler ────────────────────────────────────────────────────
  async function handleDisconnect(network: string) {
    setDisconnecting(network);
    try {
      const res = await fetch("/api/social/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, network }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al desconectar");
      }
      toast({ title: `${NETWORK_META[network]?.label} desconectado` });
      refetchNetworks();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDisconnecting(null);
    }
  }

  // ── Connect handler ───────────────────────────────────────────────────────
  function handleConnect(network: string) {
    window.location.href = `/api/social/connect/${network.toLowerCase()}?clientId=${clientId}`;
  }

  if (clientLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Detalle del cliente" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Detalle del cliente" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="text-center py-16">
            <p className="text-muted-foreground">Cliente no encontrado</p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              Volver
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Detalle del cliente" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/clientes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          {client.logoUrl ? (
            <img
              src={client.logoUrl}
              alt={client.companyName}
              className="h-10 w-10 rounded-lg object-cover border"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{client.companyName}</h1>
            <p className="text-sm text-muted-foreground">{client?.user?.email ?? "email@example.com"}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/admin/clientes/${clientId}/marca`)}
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Brand Kit
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">
            <User className="h-4 w-4 mr-2" />
            Información
          </TabsTrigger>
          <TabsTrigger value="paginas">
            <Share2 className="h-4 w-4 mr-2" />
            Páginas Vinculadas
          </TabsTrigger>
          <TabsTrigger value="redes">
            <Globe className="h-4 w-4 mr-2" />
            Conexiones OAuth
          </TabsTrigger>
        </TabsList>

        {/* ── Info Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                  <p className="text-sm mt-1">{client.companyName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contacto</p>
                  <p className="text-sm mt-1">{client?.user?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm mt-1">{client?.user?.email ?? "-"}</p>
                </div>
                {client?.user?.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                    <p className="text-sm mt-1">{client?.user?.phone}</p>
                  </div>
                )}
              </div>

              {/* Social networks configured */}
              {((client as any)?.socialNetworks?.length ?? 0) > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Redes configuradas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(client as any).socialNetworks.map((sn: any) => {
                      const meta = NETWORK_META[sn.network];
                      return (
                        <Badge
                          key={sn.network}
                          variant={sn.isActive ? "default" : "outline"}
                          className="gap-1"
                        >
                          {meta?.icon} {meta?.label ?? sn.network}
                          {sn.connectedAt ? (
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>{(client as any)._count?.posts ?? 0} posts</span>
                <span>·</span>
                <span>{(client as any)._count?.ideas ?? 0} ideas</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Páginas Vinculadas Tab ─────────────────────────────────────── */}
        <TabsContent value="paginas" className="space-y-4">
          <ClientSocialNetworksEditor clientId={clientId} />
        </TabsContent>

        {/* ── Redes Sociales Tab ────────────────────────────────────────────── */}
        <TabsContent value="redes" className="space-y-6">
          {/* Page Assignment Section */}
          <div>
            <h3 className="text-base font-semibold mb-2">Asignar Páginas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona las páginas que este cliente puede usar para publicar contenido.
            </p>
            <ClientPageSelector clientId={clientId} />
          </div>

          {/* Connect New Networks Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Conectar Nuevas Redes</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchNetworks()}
                disabled={networksLoading}
              >
                <RefreshCw className={`h-4 w-4 ${networksLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Conecta páginas de redes sociales a nivel de agencia (disponible para todos los clientes).
            </p>
          </div>

          {networksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {ALL_NETWORKS.map((networkKey) => {
                const meta = NETWORK_META[networkKey]!;
                const status = networkStatus?.find((n) => n.network === networkKey);
                const isConnected = status?.connected ?? false;

                return (
                  <Card key={networkKey}>
                    <CardContent className="py-4 flex items-center gap-4">
                      {/* Icon + Name */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{meta.label}</span>
                          {isConnected ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-500 text-white text-[10px] py-0">
                              ✓ Conectado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                              No conectado
                            </Badge>
                          )}
                        </div>

                        {isConnected && status?.accountName ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {status.accountName}
                            {status.expiresAt && (
                              <span className="ml-2 text-yellow-600">
                                · Expira {new Date(status.expiresAt).toLocaleDateString("es")}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">{meta.note}</p>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="flex-shrink-0">
                        {isConnected ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConnect(networkKey)}
                              title="Reconectar"
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                              Reconectar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={disconnecting === networkKey}
                              onClick={() => handleDisconnect(networkKey)}
                            >
                              {disconnecting === networkKey ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Unlink className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="gradient-primary text-white"
                            onClick={() => handleConnect(networkKey)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            Conectar {meta.label}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
      </main>
    </div>
  );
}
