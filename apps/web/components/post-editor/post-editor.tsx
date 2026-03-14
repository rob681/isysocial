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
import { Loader2, Save, Send, ArrowLeft, LayoutTemplate, ChevronDown, ChevronUp, Sparkles, PanelRightOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { AiAssistant } from "./ai-assistant";

const formSchema = z.object({
  clientId: z.string().min(1, "Selecciona un cliente"),
  network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]),
  postType: z.enum(["IMAGE", "CAROUSEL", "STORY", "REEL", "VIDEO", "TEXT"]),
  categoryId: z.string().optional(),
  title: z.string().optional(),
  copy: z.string().optional(),
  hashtags: z.string().optional(),
  scheduledAt: z.string().optional(),
  revisionsLimit: z.number().int().min(1).max(10).default(3),
  referenceLink: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PostEditorProps {
  postId?: string;
  defaultValues?: Partial<FormValues>;
  defaultMedia?: MockupMedia[];
}

export function PostEditor({ postId, defaultValues, defaultMedia }: PostEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploadedMedia, setUploadedMedia] = useState<
    { url: string; storagePath: string; fileName: string; mimeType: string; fileSize: number }[]
  >([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

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
      toast({ title: "Publicación creada", description: "El borrador se guardó correctamente." });
      router.push("/admin/contenido");
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
      scheduledAt: "",
      revisionsLimit: 3,
      referenceLink: "",
      ...defaultValues,
    },
  });

  const watchedValues = form.watch();

  // Get selected client info
  const selectedClient = clients?.find((c) => c.id === watchedValues.clientId);

  // Available post types for selected network
  const availablePostTypes = NETWORK_POST_TYPES[watchedValues.network as SocialNetwork] || [];

  // Build mockup media from uploaded files
  const mockupMedia: MockupMedia[] = uploadedMedia.length > 0
    ? uploadedMedia.map((m) => ({
        url: m.url,
        type: m.mimeType.startsWith("video/") ? "video" as const : "image" as const,
      }))
    : defaultMedia || [];

  const onSubmit = (data: FormValues) => {
    if (postId) {
      updateContent.mutate({
        id: postId,
        title: data.title,
        copy: data.copy,
        hashtags: data.hashtags,
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
        categoryId: data.categoryId || undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        revisionsLimit: data.revisionsLimit,
        referenceLink: data.referenceLink,
      });
    }
  };

  const handleMediaUpload = useCallback((files: typeof uploadedMedia) => {
    setUploadedMedia((prev) => [...prev, ...files]);
  }, []);

  const handleMediaRemove = useCallback((index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
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
    <div className="flex flex-col lg:flex-row gap-6 h-full">
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Client selector */}
          {!postId && (
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Controller
                name="clientId"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(val) => {
                    field.onChange(val);
                    // Reset network/postType if client changes
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
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin categoría</SelectItem>
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
              rows={5}
              className="resize-none"
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

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Media</Label>
            <MediaUploader
              media={uploadedMedia}
              onUpload={handleMediaUpload}
              onRemove={handleMediaRemove}
              postType={watchedValues.postType as PostType}
            />
          </div>

          {/* Schedule & Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha programada</Label>
              <Input
                type="datetime-local"
                {...form.register("scheduledAt")}
              />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {postId ? "Guardar cambios" : "Guardar borrador"}
            </Button>
          </div>
        </form>
      </div>

      {/* ─── Right: Live Preview ───────────────────────────────────── */}
      <div className={`${showAiAssistant ? "lg:w-[320px]" : "lg:w-[380px] xl:w-[420px]"} flex-shrink-0 transition-all`}>
        <div className="sticky top-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Vista previa</h3>
          <div className="flex justify-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border">
            <MockupRenderer
              network={watchedValues.network as SocialNetwork}
              postType={watchedValues.postType as PostType}
              clientName={selectedClient?.companyName || "Nombre del cliente"}
              copy={watchedValues.copy}
              hashtags={watchedValues.hashtags}
              media={mockupMedia}
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
