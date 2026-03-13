import type { SocialNetwork, PostStatus, PostType, IdeaStatus } from "./types";

// ─── Social Network Labels & Colors ──────────────────────────────────────────

export const NETWORK_LABELS: Record<SocialNetwork, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  X: "X (Twitter)",
};

export const NETWORK_COLORS: Record<SocialNetwork, string> = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#E1306C",
  LINKEDIN: "#0A66C2",
  TIKTOK: "#000000",
  X: "#1DA1F2",
};

export const NETWORK_BG_COLORS: Record<SocialNetwork, string> = {
  FACEBOOK: "#E7F3FF",
  INSTAGRAM: "#FDF2F8",
  LINKEDIN: "#E8F4FD",
  TIKTOK: "#F0F0F0",
  X: "#E8F5FD",
};

// ─── Post Type Labels ─────────────────────────────────────────────────────────

export const POST_TYPE_LABELS: Record<PostType, string> = {
  IMAGE: "Imagen fija",
  CAROUSEL: "Carrusel",
  STORY: "Story",
  REEL: "Reel",
  VIDEO: "Video",
  TEXT: "Solo texto",
};

// Post types available per network
export const NETWORK_POST_TYPES: Record<SocialNetwork, PostType[]> = {
  FACEBOOK: ["IMAGE", "CAROUSEL", "VIDEO", "TEXT", "STORY"],
  INSTAGRAM: ["IMAGE", "CAROUSEL", "STORY", "REEL"],
  LINKEDIN: ["IMAGE", "CAROUSEL", "VIDEO", "TEXT"],
  TIKTOK: ["REEL", "VIDEO"],
  X: ["IMAGE", "VIDEO", "TEXT"],
};

// ─── Post Status Labels & Colors ─────────────────────────────────────────────

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  CLIENT_CHANGES: "Cambios solicitados",
  APPROVED: "Aprobado",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  PAUSED: "Pausado",
  CANCELLED: "Cancelado",
};

export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_REVIEW: "bg-yellow-100 text-yellow-800",
  CLIENT_CHANGES: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export const POST_STATUS_DOT_COLORS: Record<PostStatus, string> = {
  DRAFT: "bg-gray-400",
  IN_REVIEW: "bg-yellow-400",
  CLIENT_CHANGES: "bg-orange-400",
  APPROVED: "bg-green-500",
  SCHEDULED: "bg-blue-500",
  PUBLISHED: "bg-emerald-500",
  PAUSED: "bg-purple-400",
  CANCELLED: "bg-red-400",
};

// ─── Idea Status Labels ────────────────────────────────────────────────────────

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "En desarrollo",
  READY: "Listo para producción",
  CONVERTED: "Convertido a post",
  DISCARDED: "Descartado",
};

export const IDEA_STATUS_COLORS: Record<IdeaStatus, string> = {
  BACKLOG: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  READY: "bg-green-100 text-green-800",
  CONVERTED: "bg-purple-100 text-purple-800",
  DISCARDED: "bg-red-100 text-red-700",
};

// ─── Editor Permission Labels ─────────────────────────────────────────────────

export const EDITOR_PERMISSION_LABELS: Record<string, string> = {
  MANAGE_ALL_CLIENTS: "Ver todos los clientes",
  CREATE_POSTS: "Crear publicaciones",
  EDIT_POSTS: "Editar publicaciones",
  DELETE_POSTS: "Eliminar publicaciones",
  MANAGE_IDEAS: "Gestionar ideas",
  VIEW_ANALYTICS: "Ver analíticas",
  MANAGE_TEMPLATES: "Gestionar plantillas",
};

export const EDITOR_PERMISSION_PRESETS: Record<
  string,
  { label: string; description: string; permissions: string[] }
> = {
  content_creator: {
    label: "Creador de contenido",
    description: "Puede crear y editar publicaciones e ideas",
    permissions: ["CREATE_POSTS", "EDIT_POSTS", "MANAGE_IDEAS"],
  },
  full_editor: {
    label: "Editor completo",
    description: "Acceso completo a contenido, ideas, plantillas y analíticas",
    permissions: [
      "MANAGE_ALL_CLIENTS",
      "CREATE_POSTS",
      "EDIT_POSTS",
      "DELETE_POSTS",
      "MANAGE_IDEAS",
      "VIEW_ANALYTICS",
      "MANAGE_TEMPLATES",
    ],
  },
  analyst: {
    label: "Analista",
    description: "Solo puede ver contenido y analíticas (sin editar)",
    permissions: ["MANAGE_ALL_CLIENTS", "VIEW_ANALYTICS"],
  },
};

// ─── Notification Templates ────────────────────────────────────────────────────

export const NOTIFICATION_TEMPLATES: Record<
  string,
  { title: string; body: (data: Record<string, string>) => string }
> = {
  POST_SUBMITTED_FOR_REVIEW: {
    title: "Contenido listo para revisar",
    body: (d) => `"${d.postTitle}" está listo para tu revisión en ${d.network}.`,
  },
  POST_APPROVED: {
    title: "¡Contenido aprobado!",
    body: (d) => `Tu publicación "${d.postTitle}" fue aprobada por ${d.clientName}.`,
  },
  POST_CHANGES_REQUESTED: {
    title: "Se solicitaron cambios",
    body: (d) =>
      `${d.clientName} solicitó cambios en "${d.postTitle}". Revisión ${d.revisionsUsed}/${d.revisionsLimit}.`,
  },
  POST_REVISION_LIMIT_REACHED: {
    title: "Límite de revisiones alcanzado",
    body: (d) =>
      `"${d.postTitle}" alcanzó el límite de ${d.revisionsLimit} revisiones.`,
  },
  NEW_POST_COMMENT: {
    title: "Nuevo comentario",
    body: (d) => `${d.authorName} comentó en "${d.postTitle}".`,
  },
  NEW_IDEA_COMMENT: {
    title: "Nuevo comentario en idea",
    body: (d) => `${d.authorName} comentó en la idea "${d.ideaTitle}".`,
  },
  POST_SCHEDULED: {
    title: "Publicación programada",
    body: (d) => `"${d.postTitle}" fue programada para el ${d.scheduledDate}.`,
  },
  IDEA_CONVERTED_TO_POST: {
    title: "Idea convertida a post",
    body: (d) => `La idea "${d.ideaTitle}" fue convertida a publicación.`,
  },
};
