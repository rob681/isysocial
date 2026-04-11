"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PostEditor } from "@/components/post-editor/post-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Topbar } from "@/components/layout/topbar";
import type { MockupMedia } from "@/components/mockups/types";

export default function EditPostEditorPage() {
  const params = useParams();
  const postId = params.id as string;

  const { data: post, isLoading } = trpc.posts.get.useQuery({ id: postId });

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Editar publicación" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-[500px] w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Editar publicación" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
          <p className="text-muted-foreground">Publicación no encontrada</p>
        </main>
      </div>
    );
  }

  const defaultValues = {
    clientId: post.clientId,
    network: post.network as any,
    postType: post.postType as any,
    categoryId: post.categoryId ?? "",
    title: post.title ?? "",
    copy: post.copy ?? "",
    hashtags: post.hashtags ?? "",
    purpose: post.purpose ?? "",
    scheduledAt: post.scheduledAt
      ? new Date(post.scheduledAt).toISOString().slice(0, 16)
      : "",
    revisionsLimit: post.revisionsLimit ?? 3,
    referenceLink: post.referenceLink ?? "",
  };

  const defaultMedia: MockupMedia[] = post.media.map((m) => ({
    url: m.fileUrl,
    type: m.mimeType.startsWith("video/") ? "video" as const : "image" as const,
  }));

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Editar publicación" />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <PostEditor
          postId={post.id}
          defaultValues={defaultValues}
          defaultMedia={defaultMedia}
        />
      </main>
    </div>
  );
}
