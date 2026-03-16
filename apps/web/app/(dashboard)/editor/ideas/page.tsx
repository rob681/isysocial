"use client";

import { IdeaBoard } from "@/components/ideas/idea-board";
import { Topbar } from "@/components/layout/topbar";

export default function EditorIdeasPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Ideas" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ideas & Blueprint</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Planifica y organiza ideas de contenido
        </p>
      </div>

      <IdeaBoard basePath="/editor/ideas" canCreate canDrag />
      </main>
    </div>
  );
}
