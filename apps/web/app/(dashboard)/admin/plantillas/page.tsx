"use client";

import { useState, useRef } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutTemplate,
  Plus,
  Search,
  Pencil,
  Trash2,
  ImageIcon,
  Upload,
  X,
  FileImage,
  Copy,
  Hash,
  ChevronDown,
  Loader2,
} from "lucide-react";

/* ─── Constants ───────────────────────────────────────────────────── */
const NETWORKS = [
  { value: "", label: "Todas" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "X", label: "X" },
] as const;

const POST_TYPES = [
  { value: "", label: "Todos" },
  { value: "IMAGE", label: "Imagen" },
  { value: "CAROUSEL", label: "Carrusel" },
  { value: "STORY", label: "Story" },
  { value: "REEL", label: "Reel" },
  { value: "VIDEO", label: "Video" },
  { value: "TEXT", label: "Texto" },
] as const;

const NETWORK_COLORS: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  FACEBOOK: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  LINKEDIN: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  TIKTOK: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  X: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const TYPE_LABELS: Record<string, string> = {
  IMAGE: "Imagen",
  CAROUSEL: "Carrusel",
  STORY: "Story",
  REEL: "Reel",
  VIDEO: "Video",
  TEXT: "Texto",
};

/* ─── Template Form Modal ─────────────────────────────────────────── */
function TemplateFormModal({
  open,
  onClose,
  editId,
}: {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
}) {
  const utils = trpc.useUtils();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: existing, isLoading: loadingExisting } = trpc.templates.get.useQuery(
    { id: editId! },
    { enabled: !!editId }
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyTemplate, setCopyTemplate] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [network, setNetwork] = useState("");
  const [postType, setPostType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{ fileUrl: string; fileName: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Populate form when editing
  if (editId && existing && !initialized) {
    setName(existing.name);
    setDescription(existing.description || "");
    setCopyTemplate(existing.copyTemplate || "");
    setHashtags(existing.hashtags || "");
    setNetwork(existing.network || "");
    setPostType(existing.postType || "");
    setCategoryId(existing.categoryId || "");
    setMediaFiles(existing.media.map((m) => ({ fileUrl: m.fileUrl, fileName: m.fileName })));
    setInitialized(true);
  }

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      onClose();
      resetForm();
    },
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      onClose();
      resetForm();
    },
  });

  const addMediaMutation = trpc.templates.addMedia.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });

  function resetForm() {
    setName("");
    setDescription("");
    setCopyTemplate("");
    setHashtags("");
    setNetwork("");
    setPostType("");
    setCategoryId("");
    setMediaFiles([]);
    setInitialized(false);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "templates");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setMediaFiles((prev) => [...prev, { fileUrl: data.url, fileName: data.fileName }]);
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return;

    const payload = {
      name,
      description: description || undefined,
      copyTemplate: copyTemplate || undefined,
      hashtags: hashtags || undefined,
      network: network || undefined,
      postType: postType || undefined,
      categoryId: categoryId || undefined,
    } as any;

    if (editId) {
      await updateMutation.mutateAsync({ id: editId, ...payload });
    } else {
      const created = await createMutation.mutateAsync(payload);
      // Add media to created template
      for (const m of mediaFiles) {
        await addMediaMutation.mutateAsync({
          templateId: created.id,
          fileName: m.fileName,
          fileUrl: m.fileUrl,
          storagePath: m.fileUrl.split("/storage/v1/object/public/")[1] || m.fileUrl,
          mimeType: "image/jpeg",
        });
      }
    }
  }

  const saving = createMutation.isLoading || updateMutation.isLoading;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">
            {editId ? "Editar plantilla" : "Nueva plantilla"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => { onClose(); resetForm(); }}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {editId && loadingExisting ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              {/* Name */}
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Post de producto semanal"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descripción de cuándo usar esta plantilla"
                />
              </div>

              {/* Network + Type row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Red social</Label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Sin especificar</option>
                    {NETWORKS.filter((n) => n.value).map((n) => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de post</Label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Sin especificar</option>
                    {POST_TYPES.filter((t) => t.value).map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Sin categoría</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Copy Template */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Texto base (copy)
                </Label>
                <textarea
                  value={copyTemplate}
                  onChange={(e) => setCopyTemplate(e.target.value)}
                  placeholder="Escribe el copy base de la plantilla. Puedes usar {cliente}, {producto}, etc."
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background resize-none"
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Hashtags
                </Label>
                <Input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#marketing #socialmedia #branding"
                />
              </div>

              {/* Media preview */}
              {!editId && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Imágenes de referencia
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {mediaFiles.map((m, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                        <img src={m.fileUrl} alt={m.fileName} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setMediaFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>
                  Cancelar
                </Button>
                <Button
                  className="gradient-primary text-white"
                  onClick={handleSubmit}
                  disabled={!name.trim() || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : editId ? (
                    "Guardar cambios"
                  ) : (
                    "Crear plantilla"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Template Card ───────────────────────────────────────────────── */
function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const thumbnail = template.media?.[0]?.fileUrl;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
      {/* Thumbnail */}
      <div className="h-40 bg-muted relative overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileImage className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {template.network && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${NETWORK_COLORS[template.network] || "bg-muted text-muted-foreground"}`}>
              {template.network}
            </span>
          )}
          {template.postType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/90 text-gray-700 font-medium">
              {TYPE_LABELS[template.postType] || template.postType}
            </span>
          )}
        </div>
        {/* Actions overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 shadow"
            onClick={() => onEdit(template.id)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 shadow text-destructive hover:text-destructive"
            onClick={() => onDelete(template.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-1">{template.name}</h3>
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
        )}
        {template.copyTemplate && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            &quot;{template.copyTemplate}&quot;
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          {template.category && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: template.category.color + "20",
                color: template.category.color,
              }}
            >
              {template.category.name}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {template.usageCount} {template.usageCount === 1 ? "uso" : "usos"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function PlantillasPage() {
  const [search, setSearch] = useState("");
  const [filterNetwork, setFilterNetwork] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: templates, isLoading } = trpc.templates.list.useQuery({
    search: search || undefined,
    network: filterNetwork || undefined,
    postType: filterType || undefined,
  } as any);

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });

  function handleEdit(id: string) {
    setEditId(id);
    setShowForm(true);
  }

  function handleDelete(id: string) {
    if (confirm("¿Eliminar esta plantilla?")) {
      deleteMutation.mutate({ id });
    }
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditId(null);
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Plantillas" />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutTemplate className="h-6 w-6 text-primary" />
              Plantillas
            </h1>
            <p className="text-muted-foreground mt-1">
              Crea plantillas reutilizables para agilizar la creación de contenido
            </p>
          </div>
          <Button
            className="gradient-primary text-white"
            onClick={() => { setEditId(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva plantilla
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantillas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterNetwork}
            onChange={(e) => setFilterNetwork(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {NETWORKS.map((n) => (
              <option key={n.value} value={n.value}>{n.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {POST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Template Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-lg font-medium text-muted-foreground">
                No hay plantillas
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crea tu primera plantilla para agilizar la creación de contenido
              </p>
              <Button
                className="mt-4 gradient-primary text-white"
                onClick={() => { setEditId(null); setShowForm(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear plantilla
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Form Modal */}
      <TemplateFormModal
        open={showForm}
        onClose={handleCloseForm}
        editId={editId}
      />
    </div>
  );
}
