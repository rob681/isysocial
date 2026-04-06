"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { FileImage } from "lucide-react";
import { NETWORK_LABELS, NETWORK_COLORS } from "@isysocial/shared";
import type { SocialNetwork } from "@isysocial/shared";

/* ─── Types ──────────────────────────────────────────────────────── */

interface KanbanPost {
  id: string;
  title: string | null;
  copy: string | null;
  network: string;
  status: string;
  media?: { id: string; fileUrl: string; mimeType: string }[];
  client?: { companyName: string; logoUrl: string | null } | null;
}

interface ContentKanbanProps {
  posts: KanbanPost[];
  basePath: string;
  showClient?: boolean;
  onStatusChange: (postId: string, newStatus: string) => void;
}

/* ─── Column config ──────────────────────────────────────────────── */

const KANBAN_COLUMNS = [
  { status: "DRAFT", label: "Borrador", bg: "bg-zinc-100", text: "text-zinc-700" },
  { status: "IN_REVIEW", label: "En revisión", bg: "bg-blue-100", text: "text-blue-700" },
  { status: "CLIENT_CHANGES", label: "Cambios", bg: "bg-orange-100", text: "text-orange-700" },
  { status: "APPROVED", label: "Aprobado", bg: "bg-green-100", text: "text-green-700" },
  { status: "SCHEDULED", label: "Programado", bg: "bg-purple-100", text: "text-purple-700" },
  { status: "PUBLISHED", label: "Publicado", bg: "bg-emerald-100", text: "text-emerald-700" },
] as const;

/* ─── Draggable Card ─────────────────────────────────────────────── */

function KanbanCard({
  post,
  basePath,
  showClient,
  isDragOverlay,
}: {
  post: KanbanPost;
  basePath: string;
  showClient?: boolean;
  isDragOverlay?: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    data: { post },
  });

  const networkColor = NETWORK_COLORS[post.network as SocialNetwork] || "#888";
  const networkLabel = NETWORK_LABELS[post.network as SocialNetwork] || post.network;
  const thumbnail = post.media?.[0]?.fileUrl;
  const displayTitle = post.title || post.copy?.slice(0, 40) || "Sin contenido";

  const cardContent = (
    <div className="flex items-start gap-2.5">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-md bg-zinc-100 dark:bg-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <FileImage className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate">{displayTitle}</p>
        {showClient && post.client && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {post.client.companyName}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: networkColor }}
          />
          <span className="text-[10px] text-muted-foreground">{networkLabel}</span>
        </div>
      </div>
    </div>
  );

  // Drag overlay renders a static copy
  if (isDragOverlay) {
    return (
      <div className="bg-background dark:bg-zinc-800 border rounded-lg p-2.5 shadow-lg ring-2 ring-primary/30 cursor-grabbing">
        {cardContent}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => router.push(`${basePath}/${post.id}`)}
      className={`bg-background dark:bg-zinc-800 border rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      {cardContent}
    </div>
  );
}

/* ─── Droppable Column ───────────────────────────────────────────── */

function KanbanColumn({
  status,
  label,
  bg,
  text,
  posts,
  basePath,
  showClient,
}: {
  status: string;
  label: string;
  bg: string;
  text: string;
  posts: KanbanPost[];
  basePath: string;
  showClient?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[260px] flex-shrink-0 rounded-xl transition-colors ${
        isOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-zinc-50 dark:bg-zinc-900/50"
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text}`}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{posts.length}</span>
      </div>

      {/* Cards area - scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {posts.map((post) => (
          <KanbanCard
            key={post.id}
            post={post}
            basePath={basePath}
            showClient={showClient}
          />
        ))}
        {posts.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
            Sin publicaciones
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Kanban Board ──────────────────────────────────────────── */

export function ContentKanban({ posts, basePath, showClient = false, onStatusChange }: ContentKanbanProps) {
  const [activePost, setActivePost] = useState<KanbanPost | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Group posts by status
  const postsByStatus: Record<string, KanbanPost[]> = {};
  for (const col of KANBAN_COLUMNS) {
    postsByStatus[col.status] = [];
  }
  for (const post of posts) {
    if (postsByStatus[post.status]) {
      postsByStatus[post.status].push(post);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const post = (event.active.data.current as { post: KanbanPost })?.post;
    if (post) setActivePost(post);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;

    const postId = active.id as string;
    const newStatus = over.id as string;

    // Find the post to check its current status
    const post = posts.find((p) => p.id === postId);
    if (!post || post.status === newStatus) return;

    onStatusChange(postId, newStatus);
  }

  function handleDragCancel() {
    setActivePost(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 320px)" }}>
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            bg={col.bg}
            text={col.text}
            posts={postsByStatus[col.status]}
            basePath={basePath}
            showClient={showClient}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activePost ? (
          <KanbanCard
            post={activePost}
            basePath={basePath}
            showClient={showClient}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
