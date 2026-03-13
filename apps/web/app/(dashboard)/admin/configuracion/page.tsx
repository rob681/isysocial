"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Building2, Palette, Save, Plus, Pencil, Trash2, Tag, Upload, X, ImageIcon, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─── CategoriesSection ──────────────────────────────────────────── */
function CategoriesSection() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#3b82f6");

  const { data: categories, isLoading } = trpc.categories.listAll.useQuery();

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast({ title: "Categoría creada" });
      utils.categories.listAll.invalidate();
      closeDialog();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast({ title: "Categoría actualizada" });
      utils.categories.listAll.invalidate();
      closeDialog();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Categoría eliminada" });
      utils.categories.listAll.invalidate();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormName("");
    setFormColor("#3b82f6");
  };

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormColor("#3b82f6");
    setDialogOpen(true);
  };

  const openEdit = (cat: { id: string; name: string; color: string }) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormColor(cat.color);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    if (editingId) {
      updateCategory.mutate({ id: editingId, name: formName.trim(), color: formColor });
    } else {
      createCategory.mutate({ name: formName.trim(), color: formColor });
    }
  };

  const isSaving = createCategory.isLoading || updateCategory.isLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categorías de contenido
              </CardTitle>
              <CardDescription>
                Organiza las publicaciones con etiquetas de color
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !categories || categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay categorías. Crea la primera para organizar tu contenido.
            </p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-medium">{cat.name}</span>
                    {!cat.isActive && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-muted-foreground mr-2">
                      {(cat as any)._count?.posts ?? 0} posts
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("¿Eliminar esta categoría?")) {
                          deleteCategory.mutate({ id: cat.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Promociones"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
                <div
                  className="w-8 h-8 rounded-full ring-1 ring-black/10 flex-shrink-0"
                  style={{ backgroundColor: formColor }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!formName.trim() || isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── LogoUploadSection ──────────────────────────────────────────── */
function LogoUploadSection({
  label,
  description,
  currentLogoUrl,
  onLogoChange,
  disabled,
  previewBg,
}: {
  label: string;
  description: string;
  currentLogoUrl: string;
  onLogoChange: (url: string) => void;
  disabled: boolean;
  previewBg?: string;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Formato no permitido", description: "Usa PNG, JPG, SVG o WebP", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "El logo debe pesar menos de 2 MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "logos");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Error al subir");
      const data = await res.json();
      onLogoChange(data.url);
      toast({ title: "Logo subido correctamente" });
    } catch {
      toast({ title: "Error al subir el logo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: previewBg || undefined }}
        >
          {currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt="Logo"
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {currentLogoUrl ? "Cambiar logo" : "Subir logo"}
              </>
            )}
          </Button>
          {currentLogoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive justify-start"
              onClick={() => onLogoChange("")}
              disabled={disabled || uploading}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Eliminar logo
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            PNG, JPG, SVG o WebP. Máximo 2 MB.
          </p>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Timezone options ────────────────────────────────────────────── */
const TIMEZONES = [
  { value: "America/Mexico_City", label: "Ciudad de M\u00e9xico (GMT-6)" },
  { value: "America/Monterrey", label: "Monterrey (GMT-6)" },
  { value: "America/Cancun", label: "Canc\u00fan (GMT-5)" },
  { value: "America/Bogota", label: "Bogot\u00e1 (GMT-5)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Sao_Paulo", label: "S\u00e3o Paulo (GMT-3)" },
  { value: "America/New_York", label: "Nueva York (GMT-5)" },
  { value: "America/Chicago", label: "Chicago (GMT-6)" },
  { value: "America/Denver", label: "Denver (GMT-7)" },
  { value: "America/Los_Angeles", label: "Los \u00c1ngeles (GMT-8)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "Europe/London", label: "Londres (GMT+0)" },
];

/* ─── ConfiguracionPage ──────────────────────────────────────────── */
export default function ConfiguracionPage() {
  const { toast } = useToast();
  const { data: agency, isLoading } = trpc.agencies.get.useQuery();
  const utils = trpc.useUtils();

  const updateAgency = trpc.agencies.update.useMutation({
    onSuccess: () => {
      toast({ title: "Configuración guardada", description: "Los cambios se aplicaron correctamente." });
      utils.agencies.get.invalidate();
      utils.agencies.getAgencyLogo.invalidate();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [logoUrl, setLogoUrl] = useState("");
  const [logoDarkUrl, setLogoDarkUrl] = useState("");
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [logoInitialized, setLogoInitialized] = useState(false);

  // Sync logos and timezone from agency data when it loads
  if (agency && !logoInitialized) {
    setLogoUrl(agency.logoUrl ?? "");
    setLogoDarkUrl((agency as any).logoDarkUrl ?? "");
    setTimezone((agency as any).timezone ?? "America/Mexico_City");
    setLogoInitialized(true);
  }

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    values: agency
      ? {
          name: agency.name,
          primaryColor: agency.primaryColor ?? "#2563eb",
          accentColor: agency.accentColor ?? "",
        }
      : undefined,
  });

  const onSubmit = async (data: any) => {
    await updateAgency.mutateAsync({
      name: data.name,
      logoUrl,
      logoDarkUrl,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      timezone,
    });
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Configuración" />
      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold">Configuración de agencia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ajusta los datos y apariencia de tu agencia en la plataforma
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* General */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Información general
                </CardTitle>
                <CardDescription>
                  Datos básicos de tu agencia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la agencia</Label>
                  <Input
                    id="name"
                    placeholder="Mi Agencia Digital"
                    {...register("name")}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-6">
                  <LogoUploadSection
                    label="Logo (modo claro)"
                    description="Se muestra en el sidebar cuando el tema claro está activo."
                    currentLogoUrl={logoUrl}
                    onLogoChange={setLogoUrl}
                    disabled={isSubmitting}
                  />
                  <div className="border-t pt-6">
                    <LogoUploadSection
                      label="Logo (modo oscuro)"
                      description="Se muestra en el sidebar cuando el tema oscuro está activo. Usa una versión en blanco o claro."
                      currentLogoUrl={logoDarkUrl}
                      onLogoChange={setLogoDarkUrl}
                      disabled={isSubmitting}
                      previewBg="#1c1c1e"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colores de marca
                </CardTitle>
                <CardDescription>
                  Los colores de tu agencia (disponibles en la personalización white-label)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Color primario</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        className="w-12 h-10 p-1 cursor-pointer"
                        {...register("primaryColor")}
                        disabled={isSubmitting}
                      />
                      <Input
                        type="text"
                        placeholder="#2563eb"
                        {...register("primaryColor")}
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Color de acento</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        className="w-12 h-10 p-1 cursor-pointer"
                        {...register("accentColor")}
                        disabled={isSubmitting}
                      />
                      <Input
                        type="text"
                        placeholder="#10b981"
                        {...register("accentColor")}
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timezone */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Zona horaria
                </CardTitle>
                <CardDescription>
                  Define la zona horaria para las fechas de programaci&oacute;n de contenido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona horaria de la agencia</Label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    disabled={isSubmitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <CategoriesSection />

            {/* Plan info */}
            {agency && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Plan actual</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {agency.planTier}
                        {agency.trialEndsAt && (
                          <span className="ml-2 text-amber-600">
                            · Trial hasta {new Date(agency.trialEndsAt).toLocaleDateString("es-MX")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <p>Hasta {agency.maxClients} clientes</p>
                      <p>Hasta {agency.maxEditors} editores</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save */}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="gradient-primary text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
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
          </form>
        )}
      </main>
    </div>
  );
}
