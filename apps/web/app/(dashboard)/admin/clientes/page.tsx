"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { createClientSchema } from "@isysocial/shared";
import { NETWORK_LABELS } from "@isysocial/shared";
import type { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCircle,
  Plus,
  Search,
  Loader2,
  FileImage,
  Lightbulb,
  CheckCircle2,
  Pencil,
  Save,
  FolderOpen,
  Folder,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CreateClientForm = z.infer<typeof createClientSchema>;

const SOCIAL_NETWORKS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "X", label: "X (Twitter)" },
] as const;

function NetworkBadge({ network }: { network: string }) {
  const colors: Record<string, string> = {
    FACEBOOK: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    INSTAGRAM: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
    LINKEDIN: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    TIKTOK: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    X: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[network] ?? ""}`}>
      {NETWORK_LABELS[network as keyof typeof NETWORK_LABELS] ?? network}
    </span>
  );
}

function CreateClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast({ title: "Cliente creado", description: "El cliente fue creado y recibirá su invitación por email." });
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { networks: [] },
  });

  const selectedNetworks = watch("networks") ?? [];

  const toggleNetwork = (network: string) => {
    const current = selectedNetworks as string[];
    if (current.includes(network)) {
      setValue(
        "networks",
        current.filter((n) => n !== network) as any,
        { shouldValidate: true }
      );
    } else {
      setValue("networks", [...current, network] as any, { shouldValidate: true });
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: CreateClientForm) => {
    await createClient.mutateAsync(data);
    reset();
  };

  if (!open) return null;

  return (
    <SimpleDialog open={open} onOpenChange={handleClose} title="Nuevo cliente">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Empresa *</Label>
            <Input
              id="companyName"
              placeholder="Nombre de la empresa"
              {...register("companyName")}
              disabled={isSubmitting}
            />
            {errors.companyName && (
              <p className="text-xs text-destructive">{errors.companyName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del contacto *</Label>
            <Input
              id="name"
              placeholder="Nombre completo"
              {...register("name")}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="cliente@empresa.com"
              {...register("email")}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+52 55 1234 5678"
              {...register("phone")}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Redes sociales activas *</Label>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_NETWORKS.map((net) => {
              const selected = (selectedNetworks as string[]).includes(net.value);
              return (
                <button
                  key={net.value}
                  type="button"
                  onClick={() => toggleNetwork(net.value)}
                  disabled={isSubmitting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selected
                      ? "gradient-primary text-white border-transparent shadow-sm"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {net.label}
                </button>
              );
            })}
          </div>
          {errors.networks && (
            <p className="text-xs text-destructive">{errors.networks.message}</p>
          )}
        </div>

        {createClient.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {createClient.error.message}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="gradient-primary text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear cliente"
            )}
          </Button>
        </div>
      </form>
    </SimpleDialog>
  );
}

/* ─── Edit Client Dialog ─────────────────────────────────────────────────── */

function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast({ title: "Cliente actualizado", description: "Los datos se guardaron correctamente." });
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
  const updateNetworks = trpc.clients.updateNetworks.useMutation({
    onError: (err) => {
      toast({ title: "Error al actualizar redes", description: err.message, variant: "destructive" });
    },
  });

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: groups } = trpc.clientGroups.list.useQuery();
  const assignToGroup = trpc.clientGroups.assignClient.useMutation();

  useEffect(() => {
    if (client && open) {
      setCompanyName(client.companyName ?? "");
      setName(client.user?.name ?? "");
      setPhone(client.user?.phone ?? "");
      setSelectedGroupId(client.group?.id ?? null);
      setSelectedNetworks(
        client.socialNetworks?.map((sn: any) => sn.network) ?? []
      );
    }
  }, [client, open]);

  const toggleNetwork = (network: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(network) ? prev.filter((n) => n !== network) : [...prev, network]
    );
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      toast({ title: "Error", description: "El nombre de empresa es requerido", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Error", description: "El nombre del contacto es requerido", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await updateClient.mutateAsync({
        id: client.id,
        companyName: companyName.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      // Update networks if changed
      const currentNets = client.socialNetworks?.map((sn: any) => sn.network) ?? [];
      const netsChanged =
        selectedNetworks.length !== currentNets.length ||
        selectedNetworks.some((n: string) => !currentNets.includes(n));
      if (netsChanged) {
        await updateNetworks.mutateAsync({
          clientId: client.id,
          networks: selectedNetworks.map((network) => ({ network: network as any, isActive: true })),
        });
      }

      // Update group if changed
      const currentGroupId = client.group?.id ?? null;
      if (selectedGroupId !== currentGroupId) {
        await assignToGroup.mutateAsync({
          clientId: client.id,
          groupId: selectedGroupId,
        });
      }
      onSuccess();
    } catch {
      // errors handled by mutation callbacks
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !client) return null;

  return (
    <SimpleDialog open={open} onOpenChange={onOpenChange} title="Editar cliente">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Empresa *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nombre de la empresa"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre del contacto *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={client.user?.email ?? ""} disabled className="bg-muted" />
            <p className="text-[11px] text-muted-foreground">El email no se puede cambiar</p>
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 1234 5678"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Group assignment */}
        {groups && groups.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Folder className="h-3.5 w-3.5" />
              Grupo
            </Label>
            <Select
              value={selectedGroupId ?? "none"}
              onValueChange={(v) => setSelectedGroupId(v === "none" ? null : v)}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin grupo</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Redes sociales activas</Label>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_NETWORKS.map((net) => {
              const selected = selectedNetworks.includes(net.value);
              return (
                <button
                  key={net.value}
                  type="button"
                  onClick={() => toggleNetwork(net.value)}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selected
                      ? "gradient-primary text-white border-transparent shadow-sm"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {net.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="gradient-primary text-white"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}

/* ─── Client Card ────────────────────────────────────────────────────────── */

function ClientCard({
  client,
  onEdit,
}: {
  client: any;
  onEdit: (client: any) => void;
}) {
  const router = useRouter();
  const initials = client.companyName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/admin/clientes/${client.id}`)}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {client.logoUrl ? (
              <img
                src={client.logoUrl}
                alt={client.companyName}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{client.companyName}</h3>
                <p className="text-sm text-muted-foreground truncate">{client.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{client.user.email}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(client);
                }}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Editar cliente"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Social Networks */}
            {client.socialNetworks.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {client.socialNetworks.map((sn: any) => (
                  <NetworkBadge key={sn.id} network={sn.network} />
                ))}
              </div>
            )}

            {/* Group + Stats */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              {client.group && (
                <span className="flex items-center gap-1 text-accent-foreground bg-accent px-1.5 py-0.5 rounded-full">
                  <Folder className="h-3 w-3" />
                  {client.group.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileImage className="h-3 w-3" />
                {client._count.posts} posts
              </span>
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                {client._count.ideas} ideas
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Group Manager (inline section above client grid) ─────────────────── */

const GROUP_COLORS = ["#6B7280", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];

function ColorPicker({
  value,
  onChange,
  size = "sm",
}: {
  value: string;
  onChange: (color: string) => void;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <div className="flex items-center gap-1">
      {GROUP_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`${dim} rounded-full border-2 transition-all flex-shrink-0 ${
            value === color
              ? "border-foreground scale-110 ring-1 ring-foreground/20"
              : "border-transparent hover:border-muted-foreground/50"
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

function GroupManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);

  const { data: groups, isLoading } = trpc.clientGroups.list.useQuery();

  const createGroup = trpc.clientGroups.create.useMutation({
    onSuccess: () => {
      toast({ title: "Grupo creado" });
      utils.clientGroups.list.invalidate();
      utils.clients.getForSidebar.invalidate();
      setNewGroupName("");
      setNewGroupColor(GROUP_COLORS[0]);
      setShowCreate(false);
    },
    onError: (err) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateGroup = trpc.clientGroups.update.useMutation({
    onSuccess: () => {
      toast({ title: "Grupo actualizado" });
      utils.clientGroups.list.invalidate();
      utils.clients.getForSidebar.invalidate();
      setEditingGroup(null);
    },
    onError: (err) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteGroup = trpc.clientGroups.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Grupo eliminado",
        description: "Los clientes del grupo ahora aparecen sin agrupar.",
      });
      utils.clientGroups.list.invalidate();
      utils.clients.list.invalidate();
      utils.clients.getForSidebar.invalidate();
    },
    onError: (err) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <FolderOpen className="h-3.5 w-3.5" />
          Grupos:
        </span>
        {groups?.map((group) => {
          const isEditing = editingGroup?.id === group.id;
          const groupColor = (group as any).color || "#6B7280";

          return (
            <div key={group.id} className="relative">
              <div
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium group/tag border transition-colors cursor-pointer"
                style={{
                  borderColor: groupColor + "40",
                  backgroundColor: groupColor + "15",
                }}
                onClick={() => {
                  if (!isEditing) {
                    setEditingGroup({
                      id: group.id,
                      name: group.name,
                      color: groupColor,
                    });
                  }
                }}
                title="Click para editar"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: groupColor }}
                />
                <span>{group.name}</span>
                <span className="text-muted-foreground ml-0.5">
                  {group._count.clients}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        `Eliminar el grupo "${group.name}"? Los clientes no se eliminaran.`
                      )
                    ) {
                      deleteGroup.mutate({ id: group.id });
                    }
                  }}
                  className="ml-0.5 opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Inline edit popover */}
              {isEditing && (
                <div className="absolute top-full left-0 mt-1.5 z-50 bg-popover border rounded-xl shadow-lg p-3 space-y-3 min-w-[220px]">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                      Nombre
                    </label>
                    <Input
                      autoFocus
                      value={editingGroup.name}
                      onChange={(e) =>
                        setEditingGroup({ ...editingGroup, name: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingGroup.name.trim()) {
                          updateGroup.mutate({
                            id: group.id,
                            name: editingGroup.name.trim(),
                            color: editingGroup.color,
                          });
                        }
                        if (e.key === "Escape") setEditingGroup(null);
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Color
                    </label>
                    <ColorPicker
                      value={editingGroup.color}
                      onChange={(c) =>
                        setEditingGroup({ ...editingGroup, color: c })
                      }
                      size="md"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={() => {
                        if (editingGroup.name.trim()) {
                          updateGroup.mutate({
                            id: group.id,
                            name: editingGroup.name.trim(),
                            color: editingGroup.color,
                          });
                        }
                      }}
                      disabled={!editingGroup.name.trim() || updateGroup.isLoading}
                    >
                      {updateGroup.isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Guardar"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingGroup(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {showCreate ? (
          <div className="relative">
            <div className="bg-popover border rounded-xl shadow-lg p-3 space-y-3 min-w-[220px]">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                  Nombre
                </label>
                <Input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Nombre del grupo"
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newGroupName.trim()) {
                      createGroup.mutate({
                        name: newGroupName.trim(),
                        color: newGroupColor,
                      });
                    }
                    if (e.key === "Escape") {
                      setShowCreate(false);
                      setNewGroupName("");
                      setNewGroupColor(GROUP_COLORS[0]);
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Color
                </label>
                <ColorPicker value={newGroupColor} onChange={setNewGroupColor} size="md" />
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => {
                    if (newGroupName.trim()) {
                      createGroup.mutate({
                        name: newGroupName.trim(),
                        color: newGroupColor,
                      });
                    }
                  }}
                  disabled={!newGroupName.trim() || createGroup.isLoading}
                >
                  {createGroup.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Crear grupo"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowCreate(false);
                    setNewGroupName("");
                    setNewGroupColor(GROUP_COLORS[0]);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Nuevo grupo
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data, isLoading, isError } = trpc.clients.list.useQuery({
    search: debouncedSearch,
    page: 1,
    limit: 50,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as any).__searchTimer);
    (window as any).__searchTimer = setTimeout(() => setDebouncedSearch(value), 300);
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Clientes" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Clientes</h1>
            {data && (
              <p className="text-sm text-muted-foreground">
                {data.total} cliente{data.total !== 1 ? "s" : ""} activo{data.total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Button
            className="gradient-primary text-white self-start sm:self-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo cliente
          </Button>
        </div>

        {/* Groups */}
        <GroupManager />

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<UserCircle className="h-10 w-10 text-muted-foreground" />}
            title="Error al cargar clientes"
            description="Hubo un problema al cargar la lista de clientes. Intenta de nuevo."
          />
        ) : data?.clients.length === 0 ? (
          <EmptyState
            icon={<UserCircle className="h-10 w-10 text-muted-foreground" />}
            title={debouncedSearch ? "No se encontraron clientes" : "Sin clientes aún"}
            description={
              debouncedSearch
                ? `No hay clientes que coincidan con "${debouncedSearch}"`
                : "Crea tu primer cliente para comenzar a gestionar su contenido en redes sociales."
            }
            action={
              !debouncedSearch ? { label: "Crear primer cliente", onClick: () => setCreateOpen(true) } : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data!.clients.map((client) => (
              <ClientCard key={client.id} client={client} onEdit={setEditClient} />
            ))}
          </div>
        )}
      </main>

      <CreateClientDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => utils.clients.list.invalidate()}
      />

      <EditClientDialog
        open={!!editClient}
        onOpenChange={(open) => { if (!open) setEditClient(null); }}
        client={editClient}
        onSuccess={() => {
          utils.clients.list.invalidate();
          utils.clients.getForSidebar.invalidate();
          utils.clientGroups.list.invalidate();
          setEditClient(null);
        }}
      />
    </div>
  );
}
