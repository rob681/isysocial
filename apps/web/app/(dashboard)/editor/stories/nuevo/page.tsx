"use client";

import { Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { StoryEditor } from "@/components/story-editor/story-editor";
import { StoryEditorErrorBoundary } from "@/components/story-editor/error-boundary";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

function NewStoryContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? null;
  const network = searchParams.get("network") || "INSTAGRAM";
  const { toast } = useToast();
  const router = useRouter();
  const [postId, setPostId] = useState<string | null>(null);
  const creatingRef = useRef(false);

  const createPost = trpc.posts.create.useMutation();
  const clientQuery = trpc.clients.get.useQuery({ id: clientId ?? "" }, { enabled: !!clientId });

  useEffect(() => {
    if (!clientId || postId || creatingRef.current) return;
    creatingRef.current = true;
    createPost
      .mutateAsync({
        clientId: clientId!,
        network: network as any,
        postType: "STORY",
        title: "Nueva historia",
        initialStatus: "DRAFT",
      })
      .then((post) => setPostId(post.id))
      .catch(() => {
        creatingRef.current = false;
        toast({ title: "Error", description: "No se pudo crear la historia", variant: "destructive" });
        router.push("/editor/contenido");
      });
  }, [clientId]);

  // Guard: no clientId provided — show user-friendly error instead of a blank spinner
  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-lg font-semibold">Selecciona un cliente</p>
          <p className="text-sm text-muted-foreground">
            Para crear una historia, primero selecciona un cliente desde el panel lateral.
          </p>
          <button
            onClick={() => router.push("/editor/contenido")}
            className="text-sm text-primary underline"
          >
            Volver a contenido
          </button>
        </div>
      </div>
    );
  }

  if (!postId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StoryEditorErrorBoundary basePath="/editor/contenido">
      <StoryEditor
        postId={postId}
        clientId={clientId!}
        network={network}
        clientName={clientQuery.data?.companyName}
        basePath="/editor/contenido"
      />
    </StoryEditorErrorBoundary>
  );
}

export default function NewStoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-4rem)]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <NewStoryContent />
    </Suspense>
  );
}
