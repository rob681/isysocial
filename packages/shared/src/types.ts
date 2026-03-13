// Re-export enums from Prisma schema as TypeScript types

export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "EDITOR"
  | "CLIENTE"
  | "SOPORTE"
  | "FACTURACION";

export type SocialNetwork =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "TIKTOK"
  | "X";

export type PostType =
  | "IMAGE"
  | "CAROUSEL"
  | "STORY"
  | "REEL"
  | "VIDEO"
  | "TEXT";

export type PostStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "CLIENT_CHANGES"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "PAUSED"
  | "CANCELLED";

export type IdeaStatus =
  | "BACKLOG"
  | "IN_PROGRESS"
  | "READY"
  | "CONVERTED"
  | "DISCARDED";

export type NotificationType =
  | "POST_SUBMITTED_FOR_REVIEW"
  | "POST_APPROVED"
  | "POST_CHANGES_REQUESTED"
  | "POST_REVISION_LIMIT_REACHED"
  | "NEW_POST_COMMENT"
  | "NEW_IDEA_COMMENT"
  | "POST_SCHEDULED"
  | "IDEA_CONVERTED_TO_POST";

export type EditorPermission =
  | "MANAGE_ALL_CLIENTS"
  | "CREATE_POSTS"
  | "EDIT_POSTS"
  | "DELETE_POSTS"
  | "MANAGE_IDEAS"
  | "VIEW_ANALYTICS"
  | "PUBLISH_POSTS";

export const EDITOR_PERMISSIONS: EditorPermission[] = [
  "MANAGE_ALL_CLIENTS",
  "CREATE_POSTS",
  "EDIT_POSTS",
  "DELETE_POSTS",
  "MANAGE_IDEAS",
  "VIEW_ANALYTICS",
  "PUBLISH_POSTS",
];

export const PLATFORM_ROLES: Role[] = [
  "SUPER_ADMIN",
  "SOPORTE",
  "FACTURACION",
];

export const AGENCY_ROLES: Role[] = ["ADMIN", "EDITOR", "CLIENTE"];
