"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PostEditor } from "@/components/post-editor/post-editor";
import { Topbar } from "@/components/layout/topbar";

function NuevoPostContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") || undefined;

  return (
    <PostEditor
      defaultValues={clientId ? { clientId } : undefined}
      successRedirectBase={clientId ? `/editor/contenido` : `/editor/contenido`}
    />
  );
}

export default function EditorNuevoPostPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Nueva publicación" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div className="h-96 flex items-center justify-center text-muted-foreground">Cargando...</div>}>
            <NuevoPostContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
