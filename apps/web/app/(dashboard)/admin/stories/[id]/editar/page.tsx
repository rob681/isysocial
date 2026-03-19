"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { StoryEditor } from "@/components/story-editor/story-editor";
import { Loader2 } from "lucide-react";
import type { StoryData } from "@/components/story-editor/types";

export default function AdminEditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const postQuery = trpc.posts.get.useQuery({ id });

  if (postQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!postQuery.data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Historia no encontrada</p>
      </div>
    );
  }

  const post = postQuery.data;

  return (
    <StoryEditor
      postId={post.id}
      clientId={post.clientId}
      network={post.network}
      initialStoryData={(post.storyData as unknown as StoryData) ?? undefined}
      postTitle={post.title || "Historia"}
      clientName={post.client?.companyName}
      basePath="/admin/contenido"
    />
  );
}
