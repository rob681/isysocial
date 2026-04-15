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
  ImagePlus,
  X,
} from "lucide-react";
import {
  NETWORK_LABELS,
  POST_TYPE_LABELS,
  NETWORK_POST_TYPES,
  NETWORK_COLORS,
} from "@isysocial/shared";
import { IdeaSketchMockup } from "@/components/mockups/idea-sketch";
import { uploadFileToStorage } from "@/lib/upload";
import type { SocialNetwork, PostType } from "@isysocial/shared";
import { useToast } from "@/hooks/use-toast";

interface IdeaFormProps {
  redirectPath: string; // Where to go after creation
  initialClientId?: string;
}

export function IdeaForm({ redirectPath, initialClientId }: IdeaFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [copyIdeas, setCopyIdeas] = useState("");
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [postType, setPostType] = useState<string>("");
  const [clientId, setClientId] = useState<string>(initialClientId ?? "");
  const [tentativeDate, setTentativeDate] = useState<string>("");

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: clients } = trpc.ideas.getClientsForSelect.useQuery();

  const create = trpc.ideas.create.useMutation();
  const addMedia = trpc.ideas.addMedia.useMutation();

  // Available post types — intersection of selected networks' post types
  const availablePostTypes = selectedNetworks.length > 0
    ? selectedNetworks.reduce<PostType[]>((common, net, i) => {
        const types = NETWORK_POST_TYPES[net as SocialNetwork] || [];
        return i === 0 ? types : common.filter((t) => types.includes(t));
      }, [])
    : (Object.keys(POST_TYPE_LABELS) as PostType[]);

  const toggleNetwork = (net: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(net) ? prev.filter((n) => n !== net) : [...prev, net]
    );
  };

  const selectedClient = clients?.find((c) => c.id === clientId);

  // ── Media handlers ──

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const isVideo = (file: File) => file.type.startsWith("video/");

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({ title: "Solo se permiten imágenes y videos", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "El archivo no puede superar 50MB", variant: "destructive" });
      return;
    }
    setImageFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      // Video — use object URL for preview
      setImagePreview(URL.createObjectURL(file));
    }
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
        networks: selectedNetworks.length > 0 ? selectedNetworks as any : undefined,
        network: selectedNetworks[0] as SocialNetwork || undefined,
        postType: (postType as PostType) || undefined,
        tentativeDate: tentativeDate ? new Date(tentativeDate) : undefined,
      });

      // Step 2: Upload image if selected (direct to Supabase — bypasses Vercel limit)
      if (imageFile) {
        try {
          const upload = await uploadFileToStorage(imageFile, "ideas");
          await addMedia.mutateAsync({
            ideaId: idea.id,
            files: [{
              fileName: upload.fileName,
              fileUrl: upload.url,
              storagePath: upload.storagePath,
              mimeType: upload.mimeType,
            }],
          });
        } catch (err: any) {
          // Non-blocking: idea was already created, but warn the user
          console.error("Error uploading image:", err);
          toast({
            title: "Idea creada, pero la imagen no se pudo guardar",
            description: err.message,
            variant: "destructive",
          });
        }
      }

      toast({ title: "Idea creada" });
      // Build detail URL preserving clientId if present
      const baseIdeasPath = redirectPath.split("?")[0] ?? redirectPath;
      const clientParam = initialClientId ? `?clientId=${initialClientId}` : "";
      router.push(`${baseIdeasPath}/${idea.id}${clientParam}`);
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

                {/* Image Upload Zone — compact thumbnail */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Imagen o video de referencia
                  </label>

                  {imagePreview ? (
                    /* Compact thumbnail strip */
                    <div className="flex items-center gap-3 p-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      {/* Thumbnail */}
                      <div
                        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-200 dark:bg-zinc-700 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {imageFile && isVideo(imageFile) ? (
                          <video
                            src={imagePreview}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{imageFile?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {imageFile && isVideo(imageFile) ? "Video" : "Imagen"} ·{" "}
                          {imageFile ? (imageFile.size / 1024 / 1024).toFixed(1) : "?"}MB
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-primary hover:underline mt-0.5"
                        >
                          Cambiar archivo
                        </button>
                      </div>
                      {/* Remove */}
                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    /* Drop zone — compact */
                    <div
                      className="border-2 border-dashed rounded-xl text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors py-5 px-4"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <ImagePlus className="h-7 w-7 mx-auto text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Arrastra o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        PNG, JPG, WebP, MP4, MOV (máx. 50MB)
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
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

                  {/* Networks (multi-select) */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Redes sociales
                      {selectedNetworks.length > 1 && (
                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                          (espejo: se creará en {selectedNetworks.length} redes)
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(NETWORK_LABELS) as [string, string][]).map(
                        ([key, label]) => {
                          const isSelected = selectedNetworks.includes(key);
                          const color = NETWORK_COLORS[key as SocialNetwork] || "#6B7280";
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                toggleNetwork(key);
                                setPostType(""); // Reset when networks change
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                isSelected
                                  ? "text-white border-transparent shadow-sm"
                                  : "border-border hover:bg-accent text-muted-foreground"
                              }`}
                              style={isSelected ? { backgroundColor: color } : undefined}
                            >
                              {label}
                            </button>
                          );
                        }
                      )}
                    </div>
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

              {/* Sketch mockup — always visible, shows real-time data + image */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Vista previa de idea</p>
                <IdeaSketchMockup
                  title={title || undefined}
                  description={description || undefined}
                  networks={selectedNetworks}
                  images={imagePreview ? [imagePreview] : []}
                  isVideo={imageFile ? isVideo(imageFile) : false}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
