"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MessageCircle,
  Send,
  Link2,
  Loader2,
  Lightbulb,
  Trash2,
  ExternalLink,
  Sparkles,
  Edit,
  Save,
  X,
  Plus,
  Upload,
  User2,
} from "lucide-react";
import {
  IDEA_STATUS_LABELS,
  IDEA_STATUS_COLORS,
  NETWORK_LABELS,
  NETWORK_COLORS,
  POST_TYPE_LABELS,
  NETWORK_POST_TYPES,
} from "@isysocial/shared";
import { IdeaSketchMockup } from "@/components/mockups/idea-sketch";
import type { SocialNetwork, PostType, IdeaStatus } from "@isysocial/shared";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface IdeaDetailProps {
  basePath: string;
  canEdit?: boolean;
  canConvert?: boolean;
  canDelete?: boolean;
  canUploadMedia?: boolean;
}


export function IdeaDetail({ basePath, canEdit = false, canConvert = false, canDelete = false, canUploadMedia = false }: IdeaDetailProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const ideaId = params.id as string;
  const clientId = searchParams.get("clientId");
  const backPath = clientId ? `${basePath}?clientId=${clientId}` : basePath;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [comment, setComment] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCopyIdeas, setEditCopyIdeas] = useState("");
  const [editNetwork, setEditNetwork] = useState<string>("");
  const [editPostType, setEditPostType] = useState<string>("");
  const [editTentativeDate, setEditTentativeDate] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const { data: idea, isLoading, refetch } = trpc.ideas.get.useQuery({ id: ideaId });

  const addComment = trpc.ideas.addComment.useMutation({ onSuccess: () => { setComment(""); refetch(); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
  const addLink = trpc.ideas.addLink.useMutation({ onSuccess: () => { setNewLinkUrl(""); refetch(); toast({ title: "Enlace agregado" }); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
  const removeLink = trpc.ideas.removeLink.useMutation({ onSuccess: () => { refetch(); toast({ title: "Enlace eliminado" }); } });
  const updateIdea = trpc.ideas.update.useMutation({ onSuccess: () => { setIsEditing(false); refetch(); toast({ title: "Idea actualizada" }); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
  const updateStatus = trpc.ideas.updateStatus.useMutation({ onSuccess: () => { refetch(); toast({ title: "Estado actualizado" }); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
  const convertToPost = trpc.ideas.convertToPost.useMutation({ onSuccess: (post) => { toast({ title: "Idea convertida a post" }); router.push(`${basePath.replace("/ideas", "/contenido")}/${post.id}`); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
  const deleteIdea = trpc.ideas.delete.useMutation({ onSuccess: () => { toast({ title: "Idea eliminada" }); router.push(backPath); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
  const addMedia = trpc.ideas.addMedia.useMutation({ onSuccess: () => { refetch(); toast({ title: "Imagen agregada" }); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
  const removeMedia = trpc.ideas.removeMedia.useMutation({ onSuccess: () => { refetch(); toast({ title: "Imagen eliminada" }); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !idea) return;
    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) { toast({ title: "Error", description: `${file.name} es demasiado grande (máx 50MB)`, variant: "destructive" }); continue; }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "ideas");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Error al subir archivo");
        const data = await res.json();
        uploadedFiles.push({ fileName: file.name, fileUrl: data.url, storagePath: data.storagePath, mimeType: file.type });
      }
      if (uploadedFiles.length > 0) await addMedia.mutateAsync({ ideaId: idea.id, files: uploadedFiles });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudieron subir las imágenes", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) return (<div className="max-w-4xl mx-auto space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /><Skeleton className="h-48" /></div>);
  if (!idea) return (<div className="text-center py-16"><p className="text-muted-foreground">Idea no encontrada</p><Button variant="outline" className="mt-4" onClick={() => router.back()}>Volver</Button></div>);

  const statusColor = IDEA_STATUS_COLORS[idea.status as IdeaStatus] || "";
  const networkColor = idea.network ? NETWORK_COLORS[idea.network as SocialNetwork] : null;
  const isLocked = ["CONVERTED", "DISCARDED"].includes(idea.status);
  const canEditThis = canEdit || (idea.isClientIdea && canUploadMedia);

  const startEditing = () => {
    setEditTitle(idea.title);
    setEditDescription(idea.description || "");
    setEditCopyIdeas(idea.copyIdeas || "");
    setEditNetwork(idea.network || "");
    setEditPostType(idea.postType || "");
    setEditTentativeDate(idea.tentativeDate ? new Date(idea.tentativeDate).toISOString().split("T")[0] : "");
    setIsEditing(true);
  };

  const saveEdit = () => {
    updateIdea.mutate({
      id: idea.id,
      title: editTitle.trim() || undefined,
      description: editDescription.trim() || undefined,
      copyIdeas: editCopyIdeas.trim() || undefined,
      network: editNetwork ? (editNetwork as SocialNetwork) : null,
      postType: editPostType ? (editPostType as PostType) : null,
      tentativeDate: editTentativeDate ? new Date(editTentativeDate) : null,
    });
  };

  const availablePostTypes = editNetwork ? NETWORK_POST_TYPES[editNetwork as SocialNetwork] || [] : (Object.keys(POST_TYPE_LABELS) as PostType[]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(backPath)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{idea.title}</h1>
            {idea.isClientIdea && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700">
                <User2 className="h-3 w-3 mr-1" />
                Idea del cliente
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={statusColor}>{IDEA_STATUS_LABELS[idea.status as IdeaStatus]}</Badge>
            {idea.network && (<span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: networkColor || "#888" }}>{NETWORK_LABELS[idea.network as SocialNetwork]}</span>)}
            {idea.postType && (<span className="text-xs text-muted-foreground">{POST_TYPE_LABELS[idea.postType as PostType]}</span>)}
            {idea.client && (<span className="text-xs text-muted-foreground">· {idea.client.companyName}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEditThis && !isLocked && !isEditing && (<Button variant="outline" size="sm" onClick={startEditing}><Edit className="h-4 w-4 mr-2" />Editar</Button>)}
          {canConvert && idea.status === "READY" && (
            <Button size="sm" disabled={convertToPost.isLoading} onClick={() => convertToPost.mutate({ id: idea.id })}>
              {convertToPost.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Convertir a post
            </Button>
          )}
        </div>
      </div>

      {/* Converted banner */}
      {idea.status === "CONVERTED" && idea.convertedPostId && (
        <Card className="border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
            <div className="flex-1"><p className="text-sm font-medium text-purple-800 dark:text-purple-300">Esta idea fue convertida a publicación</p></div>
            <Button variant="outline" size="sm" onClick={() => router.push(`${basePath.replace("/ideas", "/contenido")}/${idea.convertedPostId}`)}>
              Ver post<ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Content */}
        <div className="flex-1 min-w-0 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4" />Contenido de la idea</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div><label className="text-sm font-medium mb-1.5 block">Título</label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
                  <div><label className="text-sm font-medium mb-1.5 block">Descripción</label><Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="resize-none" /></div>
                  <div><label className="text-sm font-medium mb-1.5 block">Borrador de copy</label><Textarea value={editCopyIdeas} onChange={(e) => setEditCopyIdeas(e.target.value)} rows={3} className="resize-none" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Red social</label>
                      <select value={editNetwork} onChange={(e) => { setEditNetwork(e.target.value); setEditPostType(""); }} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                        <option value="">Sin definir</option>
                        {(Object.entries(NETWORK_LABELS) as [string, string][]).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Tipo</label>
                      <select value={editPostType} onChange={(e) => setEditPostType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                        <option value="">Sin definir</option>
                        {availablePostTypes.map((pt) => (<option key={pt} value={pt}>{POST_TYPE_LABELS[pt]}</option>))}
                      </select>
                    </div>
                  </div>
                  <div><label className="text-sm font-medium mb-1.5 block">Fecha tentativa</label><Input type="date" value={editTentativeDate} onChange={(e) => setEditTentativeDate(e.target.value)} /></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={updateIdea.isLoading}>{updateIdea.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                  </div>
                </>
              ) : (
                <>
                  {idea.description && (<div><p className="text-sm font-medium text-muted-foreground mb-1">Descripción</p><p className="text-sm whitespace-pre-wrap">{idea.description}</p></div>)}
                  {idea.copyIdeas && (<div><p className="text-sm font-medium text-muted-foreground mb-1">Borrador de copy</p><p className="text-sm whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border">{idea.copyIdeas}</p></div>)}
                  {idea.tentativeDate && (<div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Fecha tentativa: {new Date(idea.tentativeDate).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>)}
                  {!idea.description && !idea.copyIdeas && !idea.tentativeDate && (<p className="text-sm text-muted-foreground text-center py-4">Sin detalles adicionales</p>)}
                </>
              )}
            </CardContent>
          </Card>

          {/* Status Actions */}
          {canEdit && !isLocked && !isEditing && (
            <Card>
              <CardHeader><CardTitle className="text-base">Cambiar estado</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(["BACKLOG", "IN_PROGRESS", "READY", "DISCARDED"] as IdeaStatus[]).filter((s) => s !== idea.status).map((status) => (
                    <Button key={status} variant="outline" size="sm" disabled={updateStatus.isLoading} onClick={() => updateStatus.mutate({ id: idea.id, status })} className={cn(status === "DISCARDED" && "text-red-600 hover:text-red-700 hover:border-red-300")}>
                      {updateStatus.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}{IDEA_STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" />Comentarios ({idea.comments.length})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {idea.comments.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-4">No hay comentarios aún</p>) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {idea.comments.map((c) => (
                    <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {c.author.avatarUrl ? <img src={c.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : <span className="text-xs font-bold text-primary">{c.author.name.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="text-sm font-medium">{c.author.name}</span><span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
                        <p className="text-sm mt-1">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 pt-2 border-t">
                <Textarea placeholder="Escribe un comentario..." value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="resize-none flex-1" />
                <Button size="icon" disabled={!comment.trim() || addComment.isLoading} onClick={() => addComment.mutate({ ideaId: idea.id, content: comment.trim() })}>
                  {addComment.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {canDelete && !isLocked && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={deleteIdea.isLoading} onClick={() => { if (confirm("¿Eliminar esta idea? Esta acción no se puede deshacer.")) deleteIdea.mutate({ id: idea.id }); }}>
                {deleteIdea.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}Eliminar idea
              </Button>
            </div>
          )}
        </div>

        {/* Right: Sketch mockup + Media + Links */}
        <div className="lg:w-[380px] flex-shrink-0 space-y-6">
          {/* Sketch mockup — idea visual summary */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-1">Vista de idea</p>
            <IdeaSketchMockup
              title={idea.title}
              description={idea.description || undefined}
              networks={idea.networks?.length ? idea.networks : idea.network ? [idea.network] : []}
              images={idea.media.map((m) => m.fileUrl).filter(Boolean) as string[]}
            />
          </div>

          {/* Media upload — compact, no gallery (images shown in mockup above) */}
          {(canEdit || canUploadMedia) && !isLocked && (
            <div>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Subiendo...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />
                  Agregar imágenes
                  {idea.media.length > 0 && (
                    <span className="ml-1.5 text-xs text-muted-foreground">({idea.media.length})</span>
                  )}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Reference Links */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" />Enlaces de referencia ({idea.links.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {idea.links.map((link) => (
                <div key={link.id} className="group border rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                  {link.ogImage && (<div className="h-32 bg-zinc-100 dark:bg-zinc-800 overflow-hidden"><img src={link.ogImage} alt="" className="w-full h-full object-cover" /></div>)}
                  <div className="p-2.5">
                    <p className="text-sm font-medium line-clamp-1">{link.ogTitle || link.url}</p>
                    {link.ogDescription && (<p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{link.ogDescription}</p>)}
                    <div className="flex items-center gap-2 mt-2">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />Abrir</a>
                      {canEdit && !isLocked && (<button className="text-xs text-red-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeLink.mutate({ linkId: link.id })}>Eliminar</button>)}
                    </div>
                  </div>
                </div>
              ))}
              {idea.links.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Sin enlaces de referencia</p>}
              {canEdit && !isLocked && (
                <div className="flex gap-2 pt-2">
                  <Input placeholder="https://..." value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="text-sm" />
                  <Button size="sm" variant="outline" disabled={!newLinkUrl.trim() || addLink.isLoading} onClick={() => addLink.mutate({ ideaId: idea.id, url: newLinkUrl.trim() })}>
                    {addLink.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
