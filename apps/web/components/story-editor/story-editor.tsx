"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send, Undo2, Redo2, Download, Loader2 } from "lucide-react";
import { useStoryEditor } from "./use-story-editor";
import { ToolPanel } from "./tool-panel";
import { PropertiesPanel } from "./properties-panel";
import { exportStoryToImage, uploadStoryImage } from "./export";
import { loadAllFonts } from "./fonts";
import type { StoryData } from "./types";
import type { StoryTemplate } from "./templates";

// Dynamic import for Konva canvas (SSR not supported)
const StoryCanvas = dynamic(() => import("./canvas").then((m) => m.StoryCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-900/50">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface StoryEditorProps {
  postId?: string;
  clientId?: string;
  network?: string;
  initialStoryData?: StoryData;
  postTitle?: string;
  clientName?: string;
  basePath: string; // e.g., "/admin/contenido" or "/editor/contenido"
}

export function StoryEditor({
  postId,
  clientId,
  network,
  initialStoryData,
  postTitle,
  clientName,
  basePath,
}: StoryEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    state,
    stageRef,
    selectedElement,
    canUndo,
    canRedo,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    setBackground,
    reorderElement,
    undo,
    redo,
    load,
    markClean,
  } = useStoryEditor(initialStoryData);

  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateContent = trpc.posts.updateContent.useMutation();
  const addMedia = trpc.posts.addMedia.useMutation();
  const changeStatus = trpc.posts.updateStatus.useMutation();

  // Load fonts on mount
  useEffect(() => {
    loadAllFonts();
  }, []);

  // Auto-save every 5 seconds when dirty
  useEffect(() => {
    if (!postId || !state.isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await updateContent.mutateAsync({
          id: postId,
          storyData: state.storyData as any,
        });
        markClean();
      } catch {
        // silent auto-save failure
      }
    }, 5000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [postId, state.isDirty, state.storyData, markClean]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElement && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "SELECT") {
        e.preventDefault();
        deleteElement(selectedElement.id);
      }
      if (mod && e.key === "d" && selectedElement) {
        e.preventDefault();
        addElement(selectedElement.type, selectedElement.props, {
          x: selectedElement.x + 30,
          y: selectedElement.y + 30,
          width: selectedElement.width,
          height: selectedElement.height,
          rotation: selectedElement.rotation,
          opacity: selectedElement.opacity,
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, deleteElement, selectedElement, addElement]);

  // Save draft
  const handleSave = useCallback(async () => {
    if (!postId) return;
    setSaving(true);
    try {
      await updateContent.mutateAsync({
        id: postId,
        storyData: state.storyData as any,
      });
      markClean();
      toast({ title: "Guardado", description: "Historia guardada como borrador" });
    } catch {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [postId, state.storyData, markClean, toast]);

  // Export & save
  const handleExport = useCallback(async () => {
    if (!postId || !stageRef.current) return;
    setExporting(true);
    try {
      // Save storyData first
      await updateContent.mutateAsync({
        id: postId,
        storyData: state.storyData as any,
      });

      // Export canvas to image
      const blob = await exportStoryToImage(stageRef.current);
      const uploadResult = await uploadStoryImage(blob);

      // Add as media to the post
      await addMedia.mutateAsync({
        postId,
        files: [
          {
            fileName: uploadResult.fileName,
            fileUrl: uploadResult.url,
            storagePath: uploadResult.storagePath,
            mimeType: uploadResult.mimeType,
            fileSize: uploadResult.fileSize,
          },
        ],
      });

      markClean();
      toast({ title: "Exportado", description: "Historia exportada y guardada" });
    } catch (err) {
      toast({ title: "Error", description: "No se pudo exportar", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [postId, state.storyData, stageRef, markClean, toast]);

  // Send for review
  const handleSendForReview = useCallback(async () => {
    if (!postId) return;
    setExporting(true);
    try {
      // Export & save first
      await handleExport();

      // Change status to IN_REVIEW
      await changeStatus.mutateAsync({
        id: postId,
        toStatus: "IN_REVIEW",
      });

      toast({ title: "Enviado", description: "Historia enviada para aprobación del cliente" });
      router.push(basePath);
    } catch (err) {
      toast({ title: "Error", description: "No se pudo enviar para revisión", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [postId, handleExport, basePath, router, toast]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b bg-card flex items-center px-3 gap-2 flex-shrink-0">
        {/* Left: Back + Title */}
        <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => router.push(basePath)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold truncate">
              {postTitle || "Isystory Studio"}
            </h1>
            {state.isDirty && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">Sin guardar</span>
            )}
          </div>
          {clientName && (
            <p className="text-[11px] text-muted-foreground truncate">{clientName}</p>
          )}
        </div>

        {/* Center: Undo/Redo */}
        <div className="flex items-center gap-1 mx-2">
          <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} className="h-8 w-8" title="Deshacer (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} className="h-8 w-8" title="Rehacer (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-7 bg-border" />

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving || !postId} className="h-8 text-xs">
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Guardar
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || !postId} className="h-8 text-xs">
            {exporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            Exportar
          </Button>

          <Button size="sm" onClick={handleSendForReview} disabled={exporting || !postId} className="h-8 text-xs">
            <Send className="h-3 w-3 mr-1" />
            Enviar
          </Button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 flex overflow-hidden">
        <ToolPanel
          onAddElement={addElement}
          onShowBackgrounds={() => setShowBackgrounds(true)}
          onLoadTemplate={(template: StoryTemplate) => load(template.storyData)}
          hasElements={state.storyData.elements.length > 0}
        />

        <StoryCanvas
          storyData={state.storyData}
          selectedElementId={state.selectedElementId}
          stageRef={stageRef}
          onSelectElement={selectElement}
          onUpdateElement={updateElement}
        />

        <PropertiesPanel
          selectedElement={selectedElement}
          background={state.storyData.background}
          showBackgrounds={showBackgrounds}
          onUpdateElement={updateElement}
          onDeleteElement={deleteElement}
          onReorderElement={reorderElement}
          onSetBackground={setBackground}
          onCloseBackgrounds={() => setShowBackgrounds(false)}
        />
      </div>
    </div>
  );
}
