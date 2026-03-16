"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Save, Lightbulb, Upload, X, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Topbar } from "@/components/layout/topbar";

export default function ClienteNuevaIdeaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [copyIdeas, setCopyIdeas] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([]);

  const createIdea = trpc.ideas.createClientIdea.useMutation({
    onSuccess: async (idea) => {
      // Upload pending files if any
      if (pendingFiles.length > 0) {
        try {
          const uploadedFiles = [];
          for (const pf of pendingFiles) {
            const formData = new FormData();
            formData.append("file", pf.file);
            formData.append("folder", "ideas");
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) continue;
            const data = await res.json();
            uploadedFiles.push({
              fileName: pf.file.name,
              fileUrl: data.url,
              storagePath: data.storagePath,
              mimeType: pf.file.type,
            });
          }
          if (uploadedFiles.length > 0) {
            await addMedia.mutateAsync({ ideaId: idea.id, files: uploadedFiles });
          }
        } catch {
          // Non-critical - idea was still created
        }
      }
      toast({ title: "Idea creada" });
      router.push(`/cliente/ideas/${idea.id}`);
    },
    onError: (err) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addMedia = trpc.ideas.addMedia.useMutation();

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createIdea.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      copyIdeas: copyIdeas.trim() || undefined,
    });
  };

  const isSaving = createIdea.isLoading;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Nueva idea" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Proponer una idea</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Tu idea
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Título <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ej: Idea para campaña de verano, Foto del nuevo producto..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Descripción</label>
                <Textarea
                  placeholder="Describe tu idea en detalle..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notas adicionales</label>
                <Textarea
                  placeholder="Texto que quieras incluir, hashtags, inspiración..."
                  value={copyIdeas}
                  onChange={(e) => setCopyIdeas(e.target.value)}
                  rows={3}
                  className="resize-none"
                  disabled={isSaving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4" />
                Imágenes de referencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pendingFiles.map((pf, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 group">
                      <img src={pf.preview} alt={pf.file.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(idx)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddFiles}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="h-4 w-4 mr-2" />
                {pendingFiles.length > 0 ? "Agregar más imágenes" : "Seleccionar imágenes"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Adjunta fotos, capturas de pantalla o imágenes de inspiración
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || isSaving} className="gradient-primary text-white">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Crear idea
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
      </main>
    </div>
  );
}
