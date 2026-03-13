"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteEditorSchema, EDITOR_PERMISSION_LABELS, EDITOR_PERMISSION_PRESETS } from "@isysocial/shared";
import type { z } from "zod";
import {
  Users,
  Plus,
  Search,
  Loader2,
  Mail,
  CheckCircle2,
  Clock,
  UserCheck,
  Pencil,
  Save,
  X,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type InviteEditorForm = z.infer<typeof inviteEditorSchema>;

const PERMISSIONS = Object.entries(EDITOR_PERMISSION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function InviteEditorDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const inviteEditor = trpc.editors.invite.useMutation({
    onSuccess: () => {
      toast({
        title: "Invitación enviada",
        description: "El editor recibirá un email con su invitación para configurar su contraseña.",
      });
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
  } = useForm<InviteEditorForm>({
    resolver: zodResolver(inviteEditorSchema),
    defaultValues: { permissions: [] },
  });

  const selectedPermissions = watch("permissions") ?? [];

  const togglePermission = (perm: string) => {
    const current = [...(selectedPermissions as string[])];
    if (current.includes(perm)) {
      setValue("permissions", current.filter((p) => p !== perm), { shouldValidate: true });
    } else {
      setValue("permissions", [...current, perm], { shouldValidate: true });
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: InviteEditorForm) => {
    await inviteEditor.mutateAsync(data);
    reset();
  };

  if (!open) return null;

  return (
    <SimpleDialog open={open} onOpenChange={handleClose} title="Invitar editor">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
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
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="editor@agencia.com"
              {...register("email")}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Rol predefinido</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(EDITOR_PERMISSION_PRESETS).map(([key, preset]) => {
              const isActive =
                preset.permissions.length === (selectedPermissions as string[]).length &&
                preset.permissions.every((p) => (selectedPermissions as string[]).includes(p));
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValue("permissions", preset.permissions, { shouldValidate: true })}
                  disabled={isSubmitting}
                  className={`rounded-lg px-3 py-2.5 text-left border transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <p className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>
                    {preset.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Permisos detallados</Label>
          <p className="text-xs text-muted-foreground">
            Personaliza los permisos individuales o usa un rol predefinido arriba.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSIONS.map((perm) => {
              const selected = (selectedPermissions as string[]).includes(perm.value);
              return (
                <button
                  key={perm.value}
                  type="button"
                  onClick={() => togglePermission(perm.value)}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 flex-shrink-0 ${selected ? "text-primary" : "text-muted-foreground/30"}`}
                  />
                  {perm.label}
                </button>
              );
            })}
          </div>
        </div>

        {inviteEditor.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {inviteEditor.error.message}
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
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar invitación
              </>
            )}
          </Button>
        </div>
      </form>
    </SimpleDialog>
  );
}

/* ─── Edit Editor Dialog ─────────────────────────────────────────────────── */

function EditEditorDialog({
  open,
  onOpenChange,
  editor,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const updatePermissions = trpc.editors.updatePermissions.useMutation();
  const assignClients = trpc.editors.assignClients.useMutation();

  // Fetch all agency clients for the selector
  const { data: sidebarClients } = trpc.clients.getForSidebar.useQuery(undefined, {
    enabled: open,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editor && open) {
      const rawPerms = editor.editorProfile?.permissions;
      setSelectedPermissions(Array.isArray(rawPerms) ? rawPerms : []);
      // Initialize from current assigned clients
      const currentIds = (editor.editorProfile?.assignedClients ?? [])
        .map((a: any) => a.client?.id)
        .filter(Boolean);
      setSelectedClientIds(currentIds);
    }
  }, [editor, open]);

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const applyPreset = (permissions: string[]) => {
    setSelectedPermissions(permissions);
  };

  const addClient = (clientId: string) => {
    if (!selectedClientIds.includes(clientId)) {
      setSelectedClientIds((prev) => [...prev, clientId]);
    }
  };

  const removeClient = (clientId: string) => {
    setSelectedClientIds((prev) => prev.filter((id) => id !== clientId));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePermissions.mutateAsync({
        editorId: editor.id,
        permissions: selectedPermissions,
      });
      await assignClients.mutateAsync({
        editorId: editor.id,
        clientIds: selectedClientIds,
      });
      toast({ title: "Editor actualizado", description: "Los cambios se guardaron correctamente." });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !editor) return null;

  // Build map of selected clients for display
  const selectedClientObjects = (sidebarClients ?? []).filter((c: any) =>
    selectedClientIds.includes(c.id)
  );
  const availableClients = (sidebarClients ?? []).filter(
    (c: any) => !selectedClientIds.includes(c.id)
  );

  return (
    <SimpleDialog open={open} onOpenChange={onOpenChange} title="Editar editor">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={editor.name ?? ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={editor.email ?? ""} disabled className="bg-muted" />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Rol predefinido</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(EDITOR_PERMISSION_PRESETS).map(([key, preset]) => {
              const isActive =
                preset.permissions.length === selectedPermissions.length &&
                preset.permissions.every((p) => selectedPermissions.includes(p));
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(preset.permissions)}
                  disabled={isSaving}
                  className={`rounded-lg px-3 py-2.5 text-left border transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <p className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>
                    {preset.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Permisos detallados</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSIONS.map((perm) => {
              const selected = selectedPermissions.includes(perm.value);
              return (
                <button
                  key={perm.value}
                  type="button"
                  onClick={() => togglePermission(perm.value)}
                  disabled={isSaving}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 flex-shrink-0 ${selected ? "text-primary" : "text-muted-foreground/30"}`}
                  />
                  {perm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Client Assignment Section ──────────────────────────────── */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Clientes asignados</Label>
            <span className="text-xs text-muted-foreground">(vacío = ve todos)</span>
          </div>

          {/* Chips of assigned clients */}
          <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-md border bg-muted/30">
            {selectedClientObjects.length === 0 ? (
              <span className="text-xs text-muted-foreground py-1 px-1">
                Sin restricciones — ve todos los clientes
              </span>
            ) : (
              selectedClientObjects.map((client: any) => (
                <Badge
                  key={client.id}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  {client.companyName}
                  <button
                    type="button"
                    onClick={() => removeClient(client.id)}
                    disabled={isSaving}
                    className="ml-0.5 hover:text-destructive rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>

          {/* Selector to add a client */}
          {availableClients.length > 0 && (
            <Select onValueChange={addClient} value="">
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Agregar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {availableClients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id} className="text-sm">
                    {client.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

/* ─── Editor Card ────────────────────────────────────────────────────────── */

function EditorCard({
  editor,
  onEdit,
}: {
  editor: any;
  onEdit: (editor: any) => void;
}) {
  const initials = (editor.name as string)
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const assignedCount = editor.editorProfile?.assignedClients?.length ?? 0;
  const rawPerms = editor.editorProfile?.permissions;
  const permissions: string[] = Array.isArray(rawPerms) ? rawPerms : [];
  const hasPassword = !!editor.passwordHash;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {editor.avatarUrl ? (
              <img
                src={editor.avatarUrl}
                alt={editor.name}
                className="w-11 h-11 rounded-full object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{editor.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{editor.email}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(editor)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {hasPassword ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendiente
                  </Badge>
                )}
              </div>
            </div>

            {/* Assigned clients */}
            {assignedCount === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">
                Ve todos los clientes
              </p>
            ) : (
              <div className="flex flex-wrap gap-1 mt-2">
                {(editor.editorProfile?.assignedClients ?? []).slice(0, 3).map((a: any) => (
                  <span
                    key={a.client?.id}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border"
                  >
                    {a.client?.companyName}
                  </span>
                ))}
                {assignedCount > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    +{assignedCount - 3} más
                  </span>
                )}
              </div>
            )}

            {/* Permissions */}
            {permissions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(permissions as string[]).slice(0, 3).map((perm) => (
                  <span
                    key={perm}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
                  >
                    {EDITOR_PERMISSION_LABELS[perm] ?? perm}
                  </span>
                ))}
                {permissions.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    +{permissions.length - 3} más
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EquipoPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editEditor, setEditEditor] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data, isLoading, isError } = trpc.editors.list.useQuery({
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
      <Topbar title="Equipo" />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Equipo</h1>
            {data && (
              <p className="text-sm text-muted-foreground">
                {data.total} editor{data.total !== 1 ? "es" : ""} en tu agencia
              </p>
            )}
          </div>
          <Button
            className="gradient-primary text-white self-start sm:self-auto"
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Invitar editor
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar editores..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<Users className="h-10 w-10 text-muted-foreground" />}
            title="Error al cargar el equipo"
            description="Hubo un problema al cargar la lista de editores."
          />
        ) : data?.editors.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10 text-muted-foreground" />}
            title={debouncedSearch ? "No se encontraron editores" : "Sin editores aún"}
            description={
              debouncedSearch
                ? `No hay editores que coincidan con "${debouncedSearch}"`
                : "Invita a tu equipo para que comiencen a crear contenido para tus clientes."
            }
            action={
              !debouncedSearch ? { label: "Invitar primer editor", onClick: () => setInviteOpen(true) } : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data!.editors.map((editor) => (
              <EditorCard key={editor.id} editor={editor} onEdit={setEditEditor} />
            ))}
          </div>
        )}
      </main>

      <InviteEditorDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => utils.editors.list.invalidate()}
      />

      <EditEditorDialog
        open={!!editEditor}
        onOpenChange={(open) => { if (!open) setEditEditor(null); }}
        editor={editEditor}
        onSuccess={() => {
          utils.editors.list.invalidate();
          setEditEditor(null);
        }}
      />
    </div>
  );
}
