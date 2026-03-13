"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  ArrowLeft,
  Save,
  Lightbulb,
  Calendar as CalendarIcon,
  ImagePlus,
  X,
} from "lucide-react";
import {
  NETWORK_LABELS,
  POST_TYPE_LABELS,
  NETWORK_POST_TYPES,
  NETWORK_COLORS,
} from "@isysocial/shared";
import type { SocialNetwork, PostType } from "@isysocial/shared";
import { useToast } from "@/hooks/use-toast";

interface IdeaFormProps {
  redirectPath: string; // Where to go after creation
}

export function IdeaForm({ redirectPath }: IdeaFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [copyIdeas, setCopyIdeas] = useState("");
  const [network, setNetwork] = useState<string>("");
  const [postType, setPostType] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [tentativeDate, setTentativeDate] = useState<string>("");

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: clients } = trpc.ideas.getClientsForSelect.useQuery();

  const create = trpc.ideas.create.useMutation();
  const addMedia = trpc.ideas.addMedia.useMutation();

  // Available post types based on selected network
  const availablePostTypes = network
    ? NETWORK_POST_TYPES[network as SocialNetwork] || []
    : (Object.keys(POST_TYPE_LABELS) as PostType[]);

  const selectedClient = clients?.find((c) => c.id === clientId);

  // ── Image handlers ──

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Solo se permiten imágenes", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "La imagen no puede superar 50MB", variant: "destructive" });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit ──

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Step 1: Create the idea
      const idea = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        copyIdeas: copyIdeas.trim() || undefined,
        clientId: clientId || undefined,
        network: (network as SocialNetwork) || undefined,
        postType: (postType as PostType) || undefined,
        tentativeDate: tentativeDate ? new Date(tentativeDate) : undefined,
      });

      // Step 2: Upload image if selected
      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append("file", imageFile);
          formData.append("folder", "ideas");
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          if (res.ok) {
            const upload = await res.json();
            await addMedia.mutateAsync({
              ideaId: idea.id,
              files: [{
                fileName: upload.fileName,
                fileUrl: upload.url,
                storagePath: upload.storagePath,
                mimeType: upload.mimeType,
              }],
            });
          }
        } catch (err) {
          // Non-blocking: idea was already created
          console.error("Error uploading image:", err);
        }
      }

      toast({ title: "Idea creada" });
      router.push(`${redirectPath}/${idea.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Nueva idea</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column: Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Ej: Campaña de primavera, Post educativo sobre SEO..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Descripción</label>
                  <Textarea
                    placeholder="Describe la idea en detalle..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Copy Ideas */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Borrador de copy / Notas
                  </label>
                  <Textarea
                    placeholder="Ideas de texto, frases, CTAs..."
                    value={copyIdeas}
                    onChange={(e) => setCopyIdeas(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Image Upload Zone */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Imagen de referencia
                  </label>
                  <div
                    className="border-2 border-dashed rounded-xl text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {imagePreview ? (
                      <div className="relative group">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-h-64 object-contain bg-zinc-50 dark:bg-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 px-4">
                        <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground mt-3">
                          Arrastra una imagen o haz clic para seleccionar
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          PNG, JPG, WebP (máx. 50MB)
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!title.trim() || isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Crear idea
              </Button>
            </div>
          </div>

          {/* Right column: Classification + Preview */}
          <div className="lg:w-[380px] xl:w-[420px] flex-shrink-0">
            <div className="sticky top-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clasificación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Client */}
                  {clients && clients.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Cliente</label>
                      <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                      >
                        <option value="">Sin asignar</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Network */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Red social</label>
                    <select
                      value={network}
                      onChange={(e) => {
                        setNetwork(e.target.value);
                        setPostType(""); // Reset post type when network changes
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    >
                      <option value="">Sin definir</option>
                      {(Object.entries(NETWORK_LABELS) as [string, string][]).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Post Type */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Tipo de publicación
                    </label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    >
                      <option value="">Sin definir</option>
                      {availablePostTypes.map((pt) => (
                        <option key={pt} value={pt}>
                          {POST_TYPE_LABELS[pt]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tentative Date */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Fecha tentativa
                    </label>
                    <Input
                      type="date"
                      value={tentativeDate}
                      onChange={(e) => setTentativeDate(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Preview card */}
              {title.trim() && (
                <Card className="bg-muted/50 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Vista previa</CardTitle>
                  </CardHeader>

                  {/* Image preview in card */}
                  {imagePreview && (
                    <div className="px-4">
                      <div className="rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <CardContent className="space-y-3 pt-2">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
                      <p className="text-sm font-medium leading-tight">{title}</p>
                    </div>

                    {description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {selectedClient && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {selectedClient.companyName}
                        </span>
                      )}
                      {network && (
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full text-white font-medium"
                          style={{
                            backgroundColor:
                              NETWORK_COLORS[network as SocialNetwork] || "#6b7280",
                          }}
                        >
                          {NETWORK_LABELS[network as SocialNetwork]}
                        </span>
                      )}
                      {postType && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                          {POST_TYPE_LABELS[postType as PostType]}
                        </span>
                      )}
                    </div>

                    {tentativeDate && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        <span>
                          {new Date(tentativeDate + "T12:00:00").toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
