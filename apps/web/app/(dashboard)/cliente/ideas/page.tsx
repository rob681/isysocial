"use client";

import { IdeaBoard } from "@/components/ideas/idea-board";

export default function ClienteIdeasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ideas de contenido</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualiza las ideas de contenido y colabora con tu agencia
        </p>
      </div>

      <IdeaBoard basePath="/cliente/ideas" canCreate={true} canDrag={false} />
    </div>
  );
}
