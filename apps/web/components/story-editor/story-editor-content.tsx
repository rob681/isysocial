"use client";

import { trpc } from "@/lib/trpc/client";
import { StoryEditor } from "@/components/story-editor/story-editor";
import { StoryEditorErrorBoundary } from "@/components/story-editor/error-boundary";
import { Loader2 } from "lucide-react";
import type { StoryData } from "@/components/story-editor/types";

interface StoryEditorContentProps {
  id: string;
  basePath: string;
}

export function StoryEditorContent({ id, basePath }: StoryEditorContentProps) {
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
    <StoryEditorErrorBoundary basePath={basePath}>
      <StoryEditor
        postId={post.id}
        clientId={post.clientId}
        network={post.network}
        initialStoryData={(post.storyData as unknown as StoryData) ?? undefined}
        postTitle={post.title || "Historia"}
        clientName={post.client?.companyName}
        basePath={basePath}
      />
    </StoryEditorErrorBoundary>
  );
}
