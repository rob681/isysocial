"use client";

import { Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { StoryEditor } from "@/components/story-editor/story-editor";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

function AdminNewStoryContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") || "";
  const network = searchParams.get("network") || "INSTAGRAM";
  const mode = searchParams.get("mode"); // "batch" for batch creation
  const batchCount = parseInt(searchParams.get("count") || "3", 10);
  const { toast } = useToast();
  const router = useRouter();
  const [postId, setPostId] = useState<string | null>(null);
  const creatingRef = useRef(false);

  const createPost = trpc.posts.create.useMutation();
  const createBatch = trpc.posts.createStoryBatch.useMutation();
  const clientQuery = trpc.clients.get.useQuery({ id: clientId }, { enabled: !!clientId });

  useEffect(() => {
    if (!clientId || postId || creatingRef.current) return;
    creatingRef.current = true;

    if (mode === "batch") {
      createBatch
        .mutateAsync({ clientId, network, count: Math.min(Math.max(batchCount, 2), 10) })
        .then((result) => {
          router.replace(`/admin/stories/batch/${result.batchId}`);
        })
        .catch(() => {
          creatingRef.current = false;
          toast({ title: "Error", description: "No se pudo crear la batería", variant: "destructive" });
          router.push("/admin/contenido");
        });
      return;
    }

    createPost
      .mutateAsync({
        clientId,
        network: network as any,
        postType: "STORY",
        title: "Nueva historia",
        initialStatus: "DRAFT",
      })
      .then((post) => setPostId(post.id))
      .catch(() => {
        creatingRef.current = false;
        toast({ title: "Error", description: "No se pudo crear la historia", variant: "destructive" });
        router.push("/admin/contenido");
      });
  }, [clientId]);

  if (!postId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StoryEditor
      postId={postId}
      clientId={clientId}
      network={network}
      clientName={clientQuery.data?.companyName}
      basePath="/admin/contenido"
    />
  );
}

export default function AdminNewStoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-4rem)]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <AdminNewStoryContent />
    </Suspense>
  );
}
