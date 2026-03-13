import type { PostStatus, Role } from "./types";

// Valid transitions: { from: [to, ...] }
const TRANSITIONS: Partial<Record<PostStatus, PostStatus[]>> = {
  DRAFT: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["CLIENT_CHANGES", "APPROVED", "DRAFT", "CANCELLED", "PAUSED"],
  CLIENT_CHANGES: ["IN_REVIEW", "DRAFT", "CANCELLED"],
  APPROVED: ["SCHEDULED", "PUBLISHED", "CANCELLED", "PAUSED"],
  SCHEDULED: ["PUBLISHED", "PAUSED", "CANCELLED"],
  PAUSED: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "CANCELLED"],
  PUBLISHED: [],
  CANCELLED: [],
};

// Which roles can perform each transition
const TRANSITION_ROLES: Partial<
  Record<PostStatus, Partial<Record<PostStatus, Role[]>>>
> = {
  DRAFT: {
    IN_REVIEW: ["ADMIN", "EDITOR", "SUPER_ADMIN"],
    CANCELLED: ["ADMIN", "SUPER_ADMIN"],
  },
  IN_REVIEW: {
    CLIENT_CHANGES: ["CLIENTE", "ADMIN", "SUPER_ADMIN"],
    APPROVED: ["CLIENTE", "ADMIN", "SUPER_ADMIN"],
    DRAFT: ["ADMIN", "EDITOR", "SUPER_ADMIN"],
    CANCELLED: ["ADMIN", "SUPER_ADMIN"],
    PAUSED: ["ADMIN", "SUPER_ADMIN"],
  },
  CLIENT_CHANGES: {
    IN_REVIEW: ["ADMIN", "EDITOR", "SUPER_ADMIN"],
    DRAFT: ["ADMIN", "EDITOR", "SUPER_ADMIN"],
    CANCELLED: ["ADMIN", "SUPER_ADMIN"],
  },
  APPROVED: {
    SCHEDULED: ["ADMIN", "SUPER_ADMIN"],
    PUBLISHED: ["ADMIN", "SUPER_ADMIN"],
    CANCELLED: ["ADMIN", "SUPER_ADMIN"],
    PAUSED: ["ADMIN", "SUPER_ADMIN"],
  },
  SCHEDULED: {
    PUBLISHED: ["ADMIN", "SUPER_ADMIN"],
    PAUSED: ["ADMIN", "SUPER_ADMIN"],
    CANCELLED: ["ADMIN", "SUPER_ADMIN"],
  },
  PAUSED: {
    DRAFT: ["ADMIN", "SUPER_ADMIN"],
    IN_REVIEW: ["ADMIN", "SUPER_ADMIN"],
    APPROVED: ["ADMIN", "SUPER_ADMIN"],
    SCHEDULED: ["ADMIN", "SUPER_ADMIN"],
    CANCELLED: ["ADMIN", "SUPER_ADMIN"],
  },
};

export function canTransition(
  from: PostStatus,
  to: PostStatus,
  role: Role
): boolean {
  const validTo = TRANSITIONS[from];
  if (!validTo?.includes(to)) return false;

  const allowedRoles = TRANSITION_ROLES[from]?.[to];
  if (!allowedRoles) return false;

  return allowedRoles.includes(role) || role === "SUPER_ADMIN";
}

export function getAvailableTransitions(
  from: PostStatus,
  role: Role
): PostStatus[] {
  const validTo = TRANSITIONS[from] ?? [];
  return validTo.filter((to) => canTransition(from, to, role));
}

// Labels for action buttons
export const TRANSITION_LABELS: Partial<Record<PostStatus, string>> = {
  IN_REVIEW: "Enviar a revisión",
  CLIENT_CHANGES: "Solicitar cambios",
  APPROVED: "Aprobar",
  DRAFT: "Volver a borrador",
  SCHEDULED: "Programar",
  PUBLISHED: "Marcar como publicado",
  CANCELLED: "Cancelar",
  PAUSED: "Pausar",
};
