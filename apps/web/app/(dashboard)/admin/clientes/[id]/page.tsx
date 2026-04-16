"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  Users,
  LayoutGrid,
  Share2,
  UserPlus,
  Mail,
  MoreVertical,
  ShieldCheck,
  Eye,
  Trash2,
  FileImage,
  Lightbulb,
  Calendar,
  Send,
  CalendarDays,
  Pencil,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Topbar } from "@/components/layout/topbar";
import { ClientPageSelector } from "@/components/social-networks/client-page-selector";
import { ClientSocialNetworksEditor } from "@/components/social-networks/client-social-networks-editor";
import { EmojiPicker } from "@/components/ui/emoji-picker";

// ── Network metadata ──────────────────────────────────────────────────────────
const NETWORK_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode; note?: string; available: boolean }
> = {
  FACEBOOK: {
    label: "Facebook",
    color: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    note: "Publica en tu Página de Facebook",
    available: true,
  },
  INSTAGRAM: {
    label: "Instagram",
    color: "#E1306C",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    note: "Requiere cuenta Business vinculada a una Página de Facebook",
    available: true,
  },
  LINKEDIN: {
    label: "LinkedIn",
    color: "#0A66C2",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    note: "Publica en tu perfil personal o página de empresa",
    available: true,
  },
  X: {
    label: "X (Twitter)",
    color: "#000000",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.737l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    note: "Requiere API Basic ($200/mes) — contactar admin",
    available: false,
  },
  TIKTOK: {
    label: "TikTok",
    color: "#010101",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.76a4.85 4.85 0 01-1.03-.07z"/>
      </svg>
    ),
    note: "Publica videos en TikTok",
    available: true,
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

  // ── Contact invite form state ─────────────────────────────────────────────
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "", email: "", phone: "", role: "REVIEWER" as "APPROVER" | "REVIEWER" | "OBSERVER",
  });
  const [openContactMenu, setOpenContactMenu] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactForm, setEditContactForm] = useState({ name: "", email: "" });

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

  const inviteClientMutation = trpc.clients.invite.useMutation({
    onSuccess: () => toast({
      title: "Invitación enviada",
      description: `Se envió el email de invitación a ${client?.user?.email}`,
    }),
    onError: (err) => toast({ title: "Error al enviar", description: err.message, variant: "destructive" }),
  });

  const {
    data: networkStatus,
    isLoading: networksLoading,
    refetch: refetchNetworks,
  } = trpc.publishing.getNetworkStatus.useQuery(
    { clientId },
    { enabled: activeTab === "redes", staleTime: 30_000 }
  );

  // ── Contacts ──────────────────────────────────────────────────────────────
  const {
    data: contactsData,
    isLoading: contactsLoading,
    refetch: refetchContacts,
  } = trpc.clientContacts.list.useQuery(
    { clientId },
    { enabled: activeTab === "contactos" }
  );

  const inviteContactMutation = trpc.clientContacts.invite.useMutation({
    onSuccess: () => {
      toast({ title: "Invitación enviada", description: "El contacto recibirá un email para crear su contraseña." });
      setShowInviteForm(false);
      setInviteForm({ name: "", email: "", phone: "", role: "REVIEWER" });
      refetchContacts();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateRoleMutation = trpc.clientContacts.updateRole.useMutation({
    onSuccess: () => { toast({ title: "Rol actualizado" }); refetchContacts(); setOpenContactMenu(null); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const setActiveMutation = trpc.clientContacts.setActive.useMutation({
    onSuccess: (_, vars) => {
      toast({ title: vars.isActive ? "Contacto activado" : "Contacto desactivado" });
      refetchContacts(); setOpenContactMenu(null);
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resendInviteMutation = trpc.clientContacts.resendInvite.useMutation({
    onSuccess: () => { toast({ title: "Invitación reenviada" }); setOpenContactMenu(null); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeContactMutation = trpc.clientContacts.remove.useMutation({
    onSuccess: () => { toast({ title: "Contacto eliminado" }); refetchContacts(); setOpenContactMenu(null); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateContactMutation = trpc.clientContacts.updateContact.useMutation({
    onSuccess: () => {
      toast({ title: "Datos actualizados" });
      refetchContacts();
      setEditingContactId(null);
      setOpenContactMenu(null);
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ── Day Themes ─────────────────────────────────────────────────────────────
  const { data: dayThemesData, refetch: refetchDayThemes } = trpc.dayThemes.getForClient.useQuery(
    { clientId },
    { enabled: activeTab === "temas" }
  );
  const [themeForm, setThemeForm] = useState<Record<number, { theme: string; emoji: string }>>({});
  const upsertThemeMutation = trpc.dayThemes.upsert.useMutation({
    onSuccess: () => { toast({ title: "Tema guardado" }); refetchDayThemes(); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const deleteThemeMutation = trpc.dayThemes.delete.useMutation({
    onSuccess: () => { toast({ title: "Tema eliminado" }); refetchDayThemes(); },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

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

      {/* Quick access to client content */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          className="gap-2 gradient-primary text-white"
          onClick={() => router.push(`/admin/contenido?clientId=${clientId}`)}
        >
          <FileImage className="h-4 w-4" />
          Contenido
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => router.push(`/admin/ideas?clientId=${clientId}`)}
        >
          <Lightbulb className="h-4 w-4" />
          Ideas
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => router.push(`/admin/calendario?clientId=${clientId}`)}
        >
          <Calendar className="h-4 w-4" />
          Calendario
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">
            <User className="h-4 w-4 mr-2" />
            Información
          </TabsTrigger>
          <TabsTrigger value="contactos">
            <Users className="h-4 w-4 mr-2" />
            Contactos
          </TabsTrigger>
          <TabsTrigger value="redes">
            <Share2 className="h-4 w-4 mr-2" />
            Redes Sociales
          </TabsTrigger>
          <TabsTrigger value="temas">
            <CalendarDays className="h-4 w-4 mr-2" />
            Temas
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
                    {/* Deduplicate by network type — show one badge per network */}
                    {Array.from(
                      new Map((client as any).socialNetworks.map((sn: any) => [sn.network, sn])).values()
                    ).map((sn: any) => {
                      const meta = NETWORK_META[sn.network];
                      const allForNetwork = (client as any).socialNetworks.filter((n: any) => n.network === sn.network);
                      const anyConnected = allForNetwork.some((n: any) => n.connectedAt);
                      const count = allForNetwork.length;
                      return (
                        <Badge
                          key={sn.network}
                          variant="secondary"
                          className="gap-1.5 text-xs"
                        >
                          <span className="flex items-center justify-center w-3.5 h-3.5">{meta?.icon}</span>
                          {meta?.label ?? sn.network}
                          {count > 1 && <span className="text-[10px] opacity-60">×{count}</span>}
                          {anyConnected ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
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

              {/* Invite / access section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Acceso del cliente</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {client?.user?.passwordHash
                        ? "El cliente ya configuró su contraseña y puede iniciar sesión."
                        : "El cliente aún no ha aceptado la invitación ni creado su contraseña."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!client?.user?.passwordHash && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 gap-1">
                        <Mail className="h-3 w-3" />
                        Pendiente
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={inviteClientMutation.isPending}
                      onClick={() => inviteClientMutation.mutate({ clientId })}
                    >
                      {inviteClientMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                      ) : (
                        <Mail className="h-3.5 w-3.5 mr-2" />
                      )}
                      {client?.user?.passwordHash ? "Reenviar acceso" : "Enviar invitación"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contactos Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="contactos" className="space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Contactos del cliente</h3>
              <p className="text-sm text-muted-foreground">
                Personas adicionales que pueden revisar y aprobar contenido de esta cuenta.
              </p>
            </div>
            <Button size="sm" className="gradient-primary text-white" onClick={() => setShowInviteForm(!showInviteForm)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar contacto
            </Button>
          </div>

          {/* Invite form */}
          {showInviteForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-5 space-y-4">
                <p className="text-sm font-medium">Nuevo contacto</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nombre *</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Nombre completo"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email *</label>
                    <input
                      type="email"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="email@empresa.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Teléfono (opcional)</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="+52 55 1234 5678"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Rol</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value as any }))}
                    >
                      <option value="APPROVER">Aprobador — puede aprobar / rechazar posts</option>
                      <option value="REVIEWER">Revisor — puede ver y comentar</option>
                      <option value="OBSERVER">Observador — solo lectura</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={() => setShowInviteForm(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="gradient-primary text-white"
                    disabled={!inviteForm.name || !inviteForm.email || inviteContactMutation.isPending}
                    onClick={() => inviteContactMutation.mutate({ clientId, ...inviteForm })}
                  >
                    {inviteContactMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar invitación
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Primary user */}
          {contactsData && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contacto principal</p>
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                    {(contactsData.primaryUser?.name ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contactsData.primaryUser?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{contactsData.primaryUser?.email ?? "—"}</p>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0 text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Principal
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Additional contacts */}
          {contactsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (contactsData?.contacts?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contactos adicionales ({contactsData!.contacts.length})
              </p>
              {contactsData!.contacts.map((contact: any) => {
                const roleConfig = {
                  APPROVER: { label: "Aprobador", icon: ShieldCheck, color: "bg-green-100 text-green-700 border-green-200" },
                  REVIEWER: { label: "Revisor", icon: Eye, color: "bg-blue-100 text-blue-700 border-blue-200" },
                  OBSERVER: { label: "Observador", icon: Eye, color: "bg-gray-100 text-gray-700 border-gray-200" },
                }[contact.role as string] ?? { label: contact.role, icon: User, color: "bg-gray-100 text-gray-700 border-gray-200" };
                const RoleIcon = roleConfig.icon;
                const hasPassword = !!contact.user?.passwordHash;
                const isEditing = editingContactId === contact.id;

                return (
                  <Card key={contact.id} className={!contact.isActive ? "opacity-60" : ""}>
                    <CardContent className="py-4 space-y-3">
                      {/* Normal view */}
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm flex-shrink-0">
                          {(contact.user?.name ?? "?")[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{contact.user?.name}</p>
                            {!contact.isActive && (
                              <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">Inactivo</Badge>
                            )}
                            {!hasPassword && (
                              <Badge variant="outline" className="text-[10px] py-0 text-amber-600 border-amber-300 bg-amber-50">
                                Pendiente
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{contact.user?.email}</p>
                        </div>
                        <Badge variant="outline" className={`flex-shrink-0 text-xs gap-1 ${roleConfig.color}`}>
                          <RoleIcon className="h-3 w-3" />
                          {roleConfig.label}
                        </Badge>

                        {/* Menu */}
                        <div className="relative flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setOpenContactMenu(openContactMenu === contact.id ? null : contact.id)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          {openContactMenu === contact.id && (
                            <div className="absolute right-0 top-9 z-50 w-52 rounded-md border bg-popover shadow-md text-sm">
                              {/* Edit data */}
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                                onClick={() => {
                                  setEditContactForm({ name: contact.user?.name ?? "", email: contact.user?.email ?? "" });
                                  setEditingContactId(contact.id);
                                  setOpenContactMenu(null);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar nombre / correo
                              </button>
                              <div className="border-t my-1" />
                              {/* Change role */}
                              <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium">Cambiar rol</div>
                              {(["APPROVER", "REVIEWER", "OBSERVER"] as const).map((r) => (
                                <button
                                  key={r}
                                  className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 ${contact.role === r ? "font-medium text-primary" : ""}`}
                                  onClick={() => updateRoleMutation.mutate({ contactId: contact.id, role: r })}
                                >
                                  {contact.role === r && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                                  {contact.role !== r && <span className="w-3.5" />}
                                  {{ APPROVER: "Aprobador", REVIEWER: "Revisor", OBSERVER: "Observador" }[r]}
                                </button>
                              ))}
                              <div className="border-t my-1" />
                              {/* Resend invite */}
                              {!hasPassword && (
                                <button
                                  className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                                  onClick={() => resendInviteMutation.mutate({ contactId: contact.id })}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  Reenviar invitación
                                </button>
                              )}
                              {/* Toggle active */}
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                                onClick={() => setActiveMutation.mutate({ contactId: contact.id, isActive: !contact.isActive })}
                              >
                                {contact.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {contact.isActive ? "Dar de baja" : "Reactivar"}
                              </button>
                              {/* Remove */}
                              <button
                                className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-destructive"
                                onClick={() => {
                                  setOpenContactMenu(null);
                                  setTimeout(() => {
                                    if (window.confirm(`¿Eliminar a ${contact.user?.name}?\n\nEsta acción eliminará al contacto permanentemente y no se puede deshacer.`)) {
                                      removeContactMutation.mutate({ contactId: contact.id });
                                    }
                                  }, 50);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar contacto
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {isEditing && (
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Editar datos del contacto</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Nombre</label>
                              <Input
                                className="mt-1 h-8 text-sm"
                                value={editContactForm.name}
                                onChange={(e) => setEditContactForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Nombre completo"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Correo electrónico</label>
                              <Input
                                className="mt-1 h-8 text-sm"
                                type="email"
                                value={editContactForm.email}
                                onChange={(e) => setEditContactForm((f) => ({ ...f, email: e.target.value }))}
                                placeholder="correo@empresa.com"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setEditingContactId(null)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={updateContactMutation.isLoading}
                              onClick={() => updateContactMutation.mutate({
                                contactId: contact.id,
                                name: editContactForm.name || undefined,
                                email: editContactForm.email || undefined,
                              })}
                            >
                              {updateContactMutation.isLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              ) : (
                                <Save className="h-3.5 w-3.5 mr-1" />
                              )}
                              Guardar
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : contactsData && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No hay contactos adicionales.</p>
              <p className="text-xs mt-1">Invita a más personas del cliente para que revisen el contenido.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Redes Sociales Tab ────────────────────────────────────────────── */}
        <TabsContent value="redes" className="space-y-6">
          {/* Assigned pages (agency accounts linked to this client) */}
          <div>
            <h3 className="text-base font-semibold mb-1">Páginas asignadas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Páginas de la agencia asignadas a este cliente para publicar contenido.
            </p>
            <ClientSocialNetworksEditor clientId={clientId} />
          </div>

          {/* Connect / disconnect OAuth per network */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold">Conexión directa por red</h3>
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
              Conecta las cuentas de redes sociales directamente a este cliente mediante OAuth.
            </p>
          </div>

          {networksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {ALL_NETWORKS.map((networkKey) => {
                const meta = NETWORK_META[networkKey]!;
                const status = networkStatus?.find((n) => n.network === networkKey);
                const isConnected = status?.connected ?? false;
                const isAvailable = meta.available;

                return (
                  <Card key={networkKey} className={!isAvailable ? "opacity-60" : ""}>
                    <CardContent className="py-4 flex items-center gap-4">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0"
                        style={{ backgroundColor: isAvailable ? meta.color : "#9ca3af" }}
                      >
                        {meta.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{meta.label}</span>
                          {!isAvailable ? (
                            <Badge variant="secondary" className="text-[10px] py-0 bg-amber-100 text-amber-700 border-amber-200">
                              Próximamente
                            </Badge>
                          ) : isConnected ? (
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

                      {/* Action */}
                      <div className="flex-shrink-0">
                        {!isAvailable ? null : isConnected ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConnect(networkKey)}
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
                            Conectar
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

        {/* ── Temas Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="temas" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Temas por Día de la Semana</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define el tema de contenido para cada día. Se mostrarán en el calendario.
                  </p>
                </div>
              </div>
              {(() => {
                const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                // Show Mon–Sun order (1,2,3,4,5,6,0)
                const dayOrder = [1, 2, 3, 4, 5, 6, 0];
                const existingMap: Record<number, any> = {};
                if (dayThemesData) dayThemesData.forEach((t: any) => { existingMap[t.dayOfWeek] = t; });
                return (
                  <div className="space-y-3">
                    {dayOrder.map((dow) => {
                      const existing = existingMap[dow];
                      const formVal = themeForm[dow] ?? { theme: existing?.theme ?? "", emoji: existing?.emoji ?? "" };
                      const isDirty = formVal.theme !== (existing?.theme ?? "") || formVal.emoji !== (existing?.emoji ?? "");
                      return (
                        <div key={dow} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                          <div className="w-24 shrink-0">
                            <p className="text-sm font-medium">{DAY_LABELS[dow]}</p>
                            {existing?.isActive === false && (
                              <span className="text-[10px] text-muted-foreground">Desactivado</span>
                            )}
                          </div>
                          <input
                            type="text"
                            className="h-8 text-sm border rounded-md px-2 flex-1 bg-background"
                            placeholder="ej. Sabías qué...?"
                            value={formVal.theme}
                            onChange={(e) => setThemeForm((prev) => ({ ...prev, [dow]: { ...formVal, theme: e.target.value } }))}
                          />
                          <EmojiPicker
                            value={formVal.emoji}
                            onChange={(emoji) => setThemeForm((prev) => ({ ...prev, [dow]: { ...formVal, emoji } }))}
                          />
                          <Button
                            size="sm"
                            variant={isDirty ? "default" : "outline"}
                            disabled={!formVal.theme.trim() || upsertThemeMutation.isPending}
                            onClick={() => {
                              upsertThemeMutation.mutate({
                                clientId,
                                dayOfWeek: dow,
                                theme: formVal.theme.trim(),
                                emoji: formVal.emoji.trim() || null,
                                isActive: true,
                              }, {
                                onSuccess: () => setThemeForm((prev) => { const n = { ...prev }; delete n[dow]; return n; }),
                              });
                            }}
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                          {existing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={deleteThemeMutation.isPending}
                              onClick={() => deleteThemeMutation.mutate({ id: existing.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
      </main>
    </div>
  );
}
