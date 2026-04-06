"use client";

import { useParams } from "next/navigation";
import { StoryEditorContent } from "@/components/story-editor/story-editor-content";
import { Loader2 } from "lucide-react";

export default function EditorEditStoryPage() {
  const params = useParams();
  const id = params?.id as string;

  if (!id) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <StoryEditorContent id={id} basePath="/editor/contenido" />;
}
