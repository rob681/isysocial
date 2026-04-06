"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const VideoEditor = dynamic(
  () => import("@/components/video-editor/video-editor").then((m) => m.VideoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export default function AdminEditReelPage({ params }: { params: Promise<{ id: string }> }) {
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
        <p className="text-muted-foreground">Publicación no encontrada</p>
      </div>
    );
  }

  const post = postQuery.data;
  const videoMedia = post.media?.find((m) => m.mimeType.startsWith("video/"));

  if (!videoMedia) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No se encontró video en esta publicación</p>
          <p className="text-xs text-muted-foreground">Sube un video primero desde el editor de publicación</p>
        </div>
      </div>
    );
  }

  return (
    <VideoEditor
      videoUrl={videoMedia.fileUrl}
      postId={post.id}
      clientName={post.client?.companyName}
      basePath="/admin/contenido"
    />
  );
}
