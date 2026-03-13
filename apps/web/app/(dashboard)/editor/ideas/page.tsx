"use client";

import { IdeaBoard } from "@/components/ideas/idea-board";

export default function EditorIdeasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ideas & Blueprint</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Planifica y organiza ideas de contenido
        </p>
      </div>

      <IdeaBoard basePath="/editor/ideas" canCreate canDrag />
    </div>
  );
}
