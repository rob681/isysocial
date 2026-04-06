"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Film, Calendar, Loader2, FileImage } from "lucide-react";
import { NETWORK_LABELS, NETWORK_COLORS, POST_STATUS_LABELS, POST_STATUS_COLORS } from "@isysocial/shared";
import type { SocialNetwork, PostStatus } from "@isysocial/shared";
import { Topbar } from "@/components/layout/topbar";

function StoriesPageInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;

  const [search, setSearch] = useState("");
  const router = useRouter();

  const postsQuery = trpc.posts.list.useQuery({ limit: 100, clientId });

  // Filter stories on client side
  const allPosts = postsQuery.data?.posts ?? [];
  const stories = allPosts.filter(
    (p) => p.postType === "STORY"
  );

  const filteredStories = stories.filter((story) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        (story.title || "").toLowerCase().includes(q) ||
        (story.copy || "").toLowerCase().includes(q) ||
        ((story.client as any)?.companyName || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Isystory Studio" />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Film className="h-6 w-6 text-violet-500" />
                Isystory Studio
              </h1>
              <p className="text-muted-foreground mt-1">
                Crea y gestiona historias de Instagram
              </p>
            </div>
            <Link href="/admin/stories/nuevo">
              <Button size="lg" className="gap-2 bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4" />
                Nueva Historia
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar historias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content */}
          {postsQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] rounded-lg" />
              ))}
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-16">
              <Film className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-1">
                {search ? "Sin resultados" : "Sin historias"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {search
                  ? "No se encontraron historias con ese criterio"
                  : "Aun no has creado historias. Presiona el boton para crear tu primera historia."}
              </p>
              {!search && (
                <Link href="/admin/stories/nuevo">
                  <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
                    <Plus className="h-4 w-4" />
                    Crear primera historia
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredStories.map((story) => {
                const storyData = story.storyData as any;
                const bgColor = storyData?.background?.color || "#1e1e2e";
                const bgImage = storyData?.background?.image;
                const firstMedia = story.media?.[0];

                return (
                  <div
                    key={story.id}
                    onClick={() => router.push(`/admin/stories/${story.id}/editar`)}
                    className="group cursor-pointer"
                  >
                    <Card className="overflow-hidden hover:shadow-lg hover:ring-2 hover:ring-violet-400 transition-all">
                      {/* Thumbnail */}
                      <div
                        className="aspect-[9/16] relative overflow-hidden"
                        style={{ backgroundColor: bgColor }}
                      >
                        {bgImage ? (
                          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : firstMedia?.fileUrl ? (
                          firstMedia.mimeType?.startsWith("video/") ? (
                            <video src={firstMedia.fileUrl} className="absolute inset-0 w-full h-full object-cover" muted preload="metadata" />
                          ) : (
                            <img src={firstMedia.fileUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-b from-purple-600/50 via-pink-500/50 to-orange-400/50 flex items-center justify-center">
                            <FileImage className="h-8 w-8 text-white/30" />
                          </div>
                        )}

                        {/* Status badge */}
                        <div className="absolute top-1.5 right-1.5">
                          <Badge
                            className="text-[9px] px-1.5 py-0"
                            style={{
                              backgroundColor: POST_STATUS_COLORS?.[story.status as PostStatus] || "#6366f1",
                              color: "white",
                            }}
                          >
                            {POST_STATUS_LABELS?.[story.status as PostStatus] || story.status}
                          </Badge>
                        </div>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Editar
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{story.title || "Sin titulo"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {(story.client as any)?.companyName || "Sin cliente"}
                        </p>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoriesPage() {
  return (
    <Suspense>
      <StoriesPageInner />
    </Suspense>
  );
}
