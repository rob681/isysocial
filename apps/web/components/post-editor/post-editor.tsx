"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MockupRenderer } from "@/components/mockups/mockup-renderer";
import { MediaUploader } from "./media-uploader";
import {
  NETWORK_LABELS,
  POST_TYPE_LABELS,
  NETWORK_POST_TYPES,
} from "@isysocial/shared";
import type { SocialNetwork, PostType } from "@isysocial/shared";
import type { MockupMedia } from "@/components/mockups/types";
import { Loader2, Save, Send, ArrowLeft, LayoutTemplate, ChevronDown, ChevronUp, Sparkles, PanelRightOpen, FileEdit, SendHorizonal, X, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { AiAssistant } from "./ai-assistant";
import { SchedulePopover } from "./schedule-popover";
import { CalendarScheduler } from "./calendar-scheduler";
import { getFormatRequirements } from "@/lib/media-formats";
import { VideoEditor as VideoEditorComponent } from "@/components/video-editor/video-editor";

const formSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]),
  postType: z.enum(["IMAGE", "CAROUSEL", "STORY", "REEL", "VIDEO", "TEXT"]),
  categoryId: z.string().optional(),
  title: z.string().optional(),
  copy: z.string().optional(),
  hashtags: z.string().optional(),
  purpose: z.string().max(1000, "Máximo 1000 caracteres").optional(),
  scheduledAt: z.string().optional(),
  revisionsLimit: z.number().int().min(1).max(10).default(3),
  referenceLink: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExistingMediaItem {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sortOrder: number;
}

interface PostEditorProps {
  postId?: string;
  defaultValues?: Partial<FormValues>;
  defaultMedia?: MockupMedia[];
  existingMedia?: ExistingMediaItem[];
  /** Base path to redirect to after successful creation, e.g. "/admin/contenido" or "/editor/contenido" */
  successRedirectBase?: string;
}

export function PostEditor({ postId, defaultValues, defaultMedia, existingMedia: initialExistingMedia, successRedirectBase = "/admin/contenido" }: PostEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploadedMedia, setUploadedMedia] = useState<
    { url: string; storagePath: string; fileName: string; mimeType: string; fileSize: number }[]
  >([]);
  const [existingMedia, setExistingMedia] = useState<ExistingMediaItem[]>(initialExistingMedia ?? []);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [isycineOpen, setIsycineOpen] = useState(false);
  const [isycineVideoUrl, setIsycineVideoUrl] = useState<string | null>(null);
  const [isycineFileName, setIsycineFileName] = useState<string>("");
  const [showCalendarScheduler, setShowCalendarScheduler] = useState(false);

  const { data: clients } = trpc.posts.getClientsForSelect.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery({}, { enabled: !postId });
  const useTemplate = trpc.templates.use.useMutation();

  const createPost = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      // Upload media to the new post
      if (uploadedMedia.length > 0) {
        addMedia.mutate({
          postId: data.id,
          files: uploadedMedia.map((m) => ({
            fileName: m.fileName,
            fileUrl: m.url,
            storagePath: m.storagePath,
            mimeType: m.mimeType,
            fileSize: m.fileSize,
          })),
        });
      }
      toast({
        title: "Publicación creada",
        description: data.status === "IN_REVIEW"
          ? "Enviada para aprobación del cliente."
          : "El borrador se guardó correctamente.",
      });
      router.push(`${successRedirectBase}/${data.id}`);
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateContent = trpc.posts.updateContent.useMutation({
    onSuccess: () => {
      // Upload any new media for the existing post
      if (postId && uploadedMedia.length > 0) {
        addMedia.mutate({
          postId,
          files: uploadedMedia.map((m) => ({
            fileName: m.fileName,
            fileUrl: m.url,
            storagePath: m.storagePath,
            mimeType: m.mimeType,
            fileSize: m.fileSize,
          })),
        });
      }
      toast({ title: "Cambios guardados", description: "La publicación se actualizó correctamente." });
      router.back();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addMedia = trpc.posts.addMedia.useMutation();
  const deleteMediaMutation = trpc.posts.deleteMedia.useMutation({
    onSuccess: () => toast({ title: "Archivo eliminado" }),
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const reorderMediaMutation = trpc.posts.reorderMedia.useMutation();

  const handleDeleteExistingMedia = useCallback((mediaId: string) => {
    deleteMediaMutation.mutate({ mediaId });
    setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
  }, [deleteMediaMutation]);

  const handleReorderExistingMedia = useCallback((reordered: ExistingMediaItem[]) => {
    setExistingMedia(reordered);
    if (postId) {
      reorderMediaMutation.mutate({
        postId,
        orderedIds: reordered.map((m) => m.id),
      });
    }
  }, [postId, reorderMediaMutation]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      network: "INSTAGRAM",
      postType: "IMAGE",
      categoryId: "",
      title: "",
      copy: "",
      hashtags: "",
      purpose: "",
      scheduledAt: "",
      revisionsLimit: 3,
      referenceLink: "",
      ...defaultValues,
    },
  });

  // Show the "Agregar contexto" panel if a purpose is already set (edit mode)
  const [showPurpose, setShowPurpose] = useState(
    Boolean(defaultValues?.purpose && defaultValues.purpose.trim().length > 0)
  );

  const watchedValues = form.watch();

  // Get selected client info
  const selectedClient = clients?.find((c) => c.id === watchedValues.clientId);

  // Available post types for selected network
  const availablePostTypes = NETWORK_POST_TYPES[watchedValues.network as SocialNetwork] || [];

  // Build mockup media: existing media (editable) + newly uploaded
  const mockupMedia: MockupMedia[] = [
    ...existingMedia.map((m) => ({
      url: m.url,
      type: m.mimeType.startsWith("video/") ? "video" as const : "image" as const,
    })),
    ...uploadedMedia.map((m) => ({
      url: m.url,
      type: m.mimeType.startsWith("video/") ? "video" as const : "image" as const,
    })),
  ];
  // Fallback to defaultMedia only if we have nothing
  const finalMockupMedia = mockupMedia.length > 0 ? mockupMedia : (defaultMedia || []);

  const onSubmit = (data: FormValues, sendForReview = false) => {
    const trimmedPurpose = data.purpose?.trim() || "";
    if (postId) {
      updateContent.mutate({
        id: postId,
        title: data.title,
        copy: data.copy,
        hashtags: data.hashtags,
        // Always send so the user can also clear an existing purpose.
        purpose: trimmedPurpose || null,
        referenceLink: data.referenceLink,
        categoryId: data.categoryId || null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      });
    } else {
      createPost.mutate({
        clientId: data.clientId,
        network: data.network as SocialNetwork,
        postType: data.postType as PostType,
        title: data.title,
        copy: data.copy,
        hashtags: data.hashtags,
        ...(trimmedPurpose && { purpose: trimmedPurpose }),
        categoryId: data.categoryId || undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        revisionsLimit: data.revisionsLimit,
        referenceLink: data.referenceLink,
        initialStatus: sendForReview ? "IN_REVIEW" : "DRAFT",
      });
    }
  };

  const handleMediaUpload = useCallback((files: typeof uploadedMedia) => {
    setUploadedMedia((prev) => [...prev, ...files]);
  }, []);

  const handleMediaRemove = useCallback((index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMediaReorder = useCallback((orderedMedia: typeof uploadedMedia) => {
    setUploadedMedia(orderedMedia);
  }, []);

  const isLoading = createPost.isLoading || updateContent.isLoading;

  const applyTemplate = async (templateId: string) => {
    try {
      const tpl = await useTemplate.mutateAsync({ id: templateId });
      if (tpl.copyTemplate) form.setValue("copy", tpl.copyTemplate);
      if (tpl.hashtags) form.setValue("hashtags", tpl.hashtags);
      if (tpl.network) form.setValue("network", tpl.network as any);
      if (tpl.postType) form.setValue("postType", tpl.postType as any);
      if (tpl.name) form.setValue("title", tpl.name);
      // Apply template media as mockup previews
      if (tpl.media && tpl.media.length > 0) {
        const templateMedia = tpl.media.map((m: any) => ({
          url: m.fileUrl,
          storagePath: m.storagePath,
          fileName: m.fileName,
          mimeType: m.mimeType,
          fileSize: m.fileSize,
        }));
        setUploadedMedia(templateMedia);
      }
      setShowTemplates(false);
      toast({ title: "Plantilla aplicada", description: `Se aplicó "${tpl.name}"` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className={`grid grid-cols-1 gap-6 h-full items-start ${showAiAssistant ? "xl:grid-cols-[1fr_380px_300px]" : "xl:grid-cols-[1fr_420px]"}`}>
      {/* ─── Left: Form ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            {postId ? "Editar publicación" : "Nueva publicación"}
          </h1>
        </div>

        {/* Template Selector (only for new posts) */}
        {!postId && templates && templates.length > 0 && (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Usar una plantilla
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({templates.length} disponible{templates.length !== 1 ? "s" : ""})
                  </span>
                </div>
                {showTemplates ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showTemplates && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      disabled={useTemplate.isLoading}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                    >
                      {tpl.media?.[0] ? (
                        <img
                          src={tpl.media[0].fileUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <LayoutTemplate className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{tpl.name}</p>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                        )}
                        <div className="flex gap-1 mt-1">
                          {tpl.network && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {NETWORK_LABELS[tpl.network as SocialNetwork]}
                            </span>
                          )}
                          {tpl.postType && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {POST_TYPE_LABELS[tpl.postType as PostType]}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="space-y-5">
          {/* Client: banner when pre-selected, dropdown when not */}
          {!postId && (
            defaultValues?.clientId && selectedClient ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {selectedClient.companyName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{selectedClient.companyName}</p>
                  <p className="text-xs text-muted-foreground">{selectedClient.contactName}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Controller
                  name="clientId"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(val) => {
                      field.onChange(val);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.companyName} — {client.contactName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.clientId && (
                  <p className="text-sm text-red-500">{form.formState.errors.clientId.message}</p>
                )}
              </div>
            )
          )}

          {/* Network + Post Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Red social *</Label>
              <Controller
                name="network"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      // Reset postType if new network doesn't support it
                      const types = NETWORK_POST_TYPES[val as SocialNetwork] || [];
                      if (!types.includes(watchedValues.postType as PostType)) {
                        form.setValue("postType", types[0] || "IMAGE");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedClient?.networks || Object.keys(NETWORK_LABELS)).map((net) => (
                        <SelectItem key={net} value={net}>
                          {NETWORK_LABELS[net as SocialNetwork]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de post *</Label>
              <Controller
                name="postType"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePostTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {POST_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Category */}
          {categories && categories.length > 0 && (
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Controller
                name="categoryId"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin categoría</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label>Título interno</Label>
            <Input
              placeholder="Nombre de referencia (no se publica)"
              {...form.register("title")}
            />
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Copy / Caption</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowAiAssistant(!showAiAssistant)}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {showAiAssistant ? "Cerrar IA" : "Asistente IA"}
              </Button>
            </div>
            <Textarea
              placeholder="Escribe el texto de la publicación..."
              rows={7}
              className="resize-none min-h-[140px]"
              {...form.register("copy")}
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <Input
              placeholder="#marketing #branding #diseño"
              {...form.register("hashtags")}
            />
          </div>

          {/* Purpose toggle — optional free-text context for the agent */}
          <div className="space-y-2">
            {!showPurpose ? (
              <button
                type="button"
                onClick={() => setShowPurpose(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
                Agregar contexto (opcional)
              </button>
            ) : (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Label htmlFor="purpose" className="text-xs font-medium flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-primary" />
                      ¿Por qué se está creando esta publicación?
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Ayuda al agente a entender el objetivo (campaña, lanzamiento, respuesta a tendencia…).
                      No es visible para el cliente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("purpose", "");
                      setShowPurpose(false);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Quitar contexto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Textarea
                  id="purpose"
                  placeholder="Ej: Campaña de Día de la Madre — queremos destacar el descuento del 20%"
                  rows={3}
                  maxLength={1000}
                  className="resize-none text-sm bg-background"
                  {...form.register("purpose")}
                />
                <div className="text-[11px] text-muted-foreground text-right">
                  {(watchedValues.purpose?.length ?? 0)}/1000
                </div>
              </div>
            )}
          </div>

          {/* Isystory Studio Button */}
          {watchedValues.postType === "STORY" && watchedValues.network === "INSTAGRAM" && (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center space-y-3">
              <p className="text-sm font-medium">Diseña tu historia con Isystory Studio</p>
              <p className="text-xs text-muted-foreground">Agrega texto, stickers, fondos y más</p>
              <div className="flex items-center gap-2 justify-center">
                <Button
                  type="button"
                  onClick={() => {
                    const cId = watchedValues.clientId;
                    if (!cId) { toast({ title: "Selecciona un cliente primero", variant: "destructive" }); return; }
                    const base = window.location.pathname.startsWith("/admin") ? "/admin" : "/editor";
                    if (postId) {
                      router.push(`${base}/stories/${postId}/editar`);
                    } else {
                      router.push(`${base}/stories/nuevo?clientId=${cId}&network=${watchedValues.network}`);
                    }
                  }}
                  className="gap-2"
                >
                  <FileEdit className="h-4 w-4" />
                  {postId ? "Editar en Isystory Studio" : "Historia individual"}
                </Button>
                {!postId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const cId = watchedValues.clientId;
                      if (!cId) { toast({ title: "Selecciona un cliente primero", variant: "destructive" }); return; }
                      const base = window.location.pathname.startsWith("/admin") ? "/admin" : "/editor";
                      router.push(`${base}/stories/nuevo?clientId=${cId}&network=${watchedValues.network}&mode=batch&count=3`);
                    }}
                    className="gap-2"
                  >
                    <FileEdit className="h-4 w-4" />
                    Batería (3 historias)
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Isycine Studio Button (for any post with video — new or existing) */}
          {(uploadedMedia.some((m) => m.mimeType.startsWith("video/")) ||
            existingMedia.some((m) => m.mimeType.startsWith("video/"))) && (
            <div className="rounded-xl border-2 border-dashed border-violet-400/30 bg-violet-50 dark:bg-violet-950/20 p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">🎬</span>
                <p className="text-sm font-medium">Isycine Studio</p>
              </div>
              <p className="text-xs text-muted-foreground">Edita, recorta y agrega efectos a tu video</p>
              <Button
                type="button"
                onClick={() => {
                  const newVideo = uploadedMedia.find((m) => m.mimeType.startsWith("video/"));
                  const existingVideo = existingMedia.find((m) => m.mimeType.startsWith("video/"));
                  if (newVideo) {
                    setIsycineVideoUrl(newVideo.url);
                    setIsycineFileName(newVideo.fileName);
                  } else if (existingVideo) {
                    setIsycineVideoUrl(existingVideo.url);
                    setIsycineFileName(existingVideo.fileName);
                  } else return;
                  setIsycineOpen(true);
                }}
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <FileEdit className="h-4 w-4" />
                Abrir Isycine Studio
              </Button>
            </div>
          )}

          {/* Existing Media (editable) */}
          {postId && existingMedia.length > 0 && (
            <div className="space-y-2">
              <Label>Archivos actuales</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {existingMedia.map((m, idx) => (
                  <div
                    key={m.id}
                    className="relative group rounded-lg overflow-hidden border bg-zinc-50 dark:bg-zinc-900"
                  >
                    {m.mimeType.startsWith("video/") ? (
                      <video src={m.url} className="w-full h-24 object-cover" muted />
                    ) : (
                      <img src={m.url} alt={m.fileName} className="w-full h-24 object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const reordered = [...existingMedia];
                            const temp = reordered[idx - 1];
                            reordered[idx - 1] = reordered[idx];
                            reordered[idx] = temp;
                            handleReorderExistingMedia(reordered);
                          }}
                          className="p-1 rounded bg-white/90 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-xs"
                          title="Mover a la izquierda"
                        >
                          <ChevronUp className="h-3.5 w-3.5 -rotate-90" />
                        </button>
                      )}
                      {idx < existingMedia.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const reordered = [...existingMedia];
                            const temp = reordered[idx];
                            reordered[idx] = reordered[idx + 1];
                            reordered[idx + 1] = temp;
                            handleReorderExistingMedia(reordered);
                          }}
                          className="p-1 rounded bg-white/90 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-xs"
                          title="Mover a la derecha"
                        >
                          <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingMedia(m.id)}
                        className="p-1 rounded bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-xs"
                        title="Eliminar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white truncate">
                      {m.fileName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Upload (new files) */}
          <div className="space-y-2">
            <Label>{postId && existingMedia.length > 0 ? "Agregar más archivos" : "Media"}</Label>
            <MediaUploader
              media={uploadedMedia}
              onUpload={handleMediaUpload}
              onRemove={handleMediaRemove}
              onReorder={handleMediaReorder}
              postType={watchedValues.postType as PostType}
              network={watchedValues.network}
            />
          </div>

          {/* Format Requirements Banner */}
          {(() => {
            const reqs = getFormatRequirements(watchedValues.network, watchedValues.postType);
            if (!reqs) return null;
            return (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Requisitos para {reqs.label}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                      <span>📐 {reqs.dimensions}</span>
                      {reqs.duration && <span>⏱ {reqs.duration}</span>}
                      {reqs.formats && <span>📁 {reqs.formats}</span>}
                      {reqs.captionLimit && <span>✏️ máx {reqs.captionLimit} chars</span>}
                      {reqs.maxItems && <span>📸 máx {reqs.maxItems} archivos</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Schedule & Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha programada</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => setShowCalendarScheduler(true)}
              >
                {watchedValues.scheduledAt
                  ? new Date(watchedValues.scheduledAt).toLocaleString("es-ES")
                  : "Selecciona una fecha"}
              </Button>
            </div>
            {!postId && (
              <div className="space-y-2">
                <Label>Límite de revisiones</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  {...form.register("revisionsLimit", { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Reference Link */}
          <div className="space-y-2">
            <Label>Link de referencia</Label>
            <Input
              placeholder="https://..."
              {...form.register("referenceLink")}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" variant="outline" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {postId ? "Guardar cambios" : "Guardar como Borrador"}
            </Button>
            {!postId && (
              <Button
                type="button"
                disabled={isLoading}
                onClick={form.handleSubmit((data) => onSubmit(data, true))}
                className="gradient-primary text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar para Aprobación
              </Button>
            )}
          </div>
        
    </form>

      {/* Calendar Scheduler Modal */}
      {showCalendarScheduler && (
        <CalendarScheduler
          value={watchedValues.scheduledAt ? new Date(watchedValues.scheduledAt) : undefined}
          onChange={(date) => {
            // Convert Date to ISO string format for form
            const isoString = date.toISOString().split('T')[0] + 'T' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
            form.setValue("scheduledAt", isoString);
          }}
          onClose={() => setShowCalendarScheduler(false)}
        />
      )}

      {/* Isycine Studio v2 — Full-screen Video Editor (OUTSIDE form to prevent submit) */}
      {isycineOpen && isycineVideoUrl && (
        <div className="fixed inset-0 z-50">
          <VideoEditorComponent
            videoUrl={isycineVideoUrl}
            clientName={selectedClient?.companyName || ""}
            onClose={() => setIsycineOpen(false)}
            onExport={async (blob: Blob) => {
              try {
                const formData = new FormData();
                formData.append("file", new File([blob], `edited-${Date.now()}.webm`, { type: "video/webm" }));
                formData.append("folder", "posts");
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                const data = await res.json();
                if (data.url) {
                  // Replace: remove all existing videos, keep non-video files
                  setUploadedMedia(prev => [
                    ...prev.filter(m => !m.mimeType.startsWith("video/")),
                    { url: data.url, storagePath: data.storagePath, fileName: data.fileName, mimeType: "video/webm", fileSize: data.fileSize },
                  ]);
                  setExistingMedia(prev => prev.filter(m => !m.mimeType.startsWith("video/")));
                  toast({ title: "Video editado", description: "El video original fue reemplazado por la versión editada." });
                }
              } catch {
                toast({ title: "Error", description: "No se pudo subir el video editado.", variant: "destructive" });
              }
            }}
          />
        </div>
      )}
      </div>

      {/* ─── Right: Live Preview ───────────────────────────────────── */}
      <div className="w-full transition-all">
        <div className="sticky top-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Vista previa</h3>
          <div className="flex justify-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border">
            <MockupRenderer
              network={watchedValues.network as SocialNetwork}
              postType={watchedValues.postType as PostType}
              clientName={selectedClient?.companyName || "Nombre del cliente"}
              copy={watchedValues.copy}
              hashtags={watchedValues.hashtags}
              media={finalMockupMedia}
              scheduledAt={watchedValues.scheduledAt ? new Date(watchedValues.scheduledAt) : undefined}
            />
          </div>
        </div>
      </div>

      {/* ─── AI Assistant Panel ────────────────────────────────────── */}
      {showAiAssistant && (
        <AiAssistant
          network={watchedValues.network}
          clientId={watchedValues.clientId}
          mediaUrls={finalMockupMedia.map((m) => m.url)}
          currentCopy={watchedValues.copy}
          postType={watchedValues.postType as PostType}
          onInsert={(text) => {
            // Split text into copy and hashtags
            const hashtagMatch = text.match(/((?:#\w+\s*)+)$/);
            if (hashtagMatch) {
              const hashtags = hashtagMatch[1].trim();
              const copy = text.replace(hashtagMatch[0], "").trim();
              form.setValue("copy", copy);
              form.setValue("hashtags", hashtags);
            } else {
              form.setValue("copy", text);
            }
          }}
          onClose={() => setShowAiAssistant(false)}
        />
      )}
    </div>
  );
}
