import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";
import type { Role, EditorPermission } from "@isysocial/shared";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No autenticado" });
  }
  return next({ ctx: { session: ctx.session } });
});

// ── Rate Limiter ──────────────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 200;
const rateLimitMap = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap) {
    const valid = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, valid);
  }
}, 5 * 60_000);

const rateLimit = t.middleware(({ ctx, next }) => {
  const userId = ctx.session?.user?.id;
  if (!userId) return next();
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) ?? [];
  const windowTimestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (windowTimestamps.length >= RATE_LIMIT_MAX) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Demasiadas solicitudes. Intenta de nuevo en un momento.",
    });
  }
  windowTimestamps.push(now);
  rateLimitMap.set(userId, windowTimestamps);
  return next();
});

export const protectedProcedure = t.procedure.use(isAuthenticated).use(rateLimit);

// ── Role helpers ──────────────────────────────────────────────────────────────

function requireRole(...roles: Role[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "No autenticado" });
    }
    const userRole = ctx.session.user.role as Role;
    const passes = roles.includes(userRole) || userRole === "SUPER_ADMIN";
    if (!passes) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tienes permisos para esta acción",
      });
    }
    return next({ ctx: { session: ctx.session } });
  });
}

export function requireAdminOrPermission(...permissions: EditorPermission[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "No autenticado" });
    }
    const { role } = ctx.session.user;
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      return next({ ctx: { session: ctx.session } });
    }
    if (role === "EDITOR") {
      const userPerms = (ctx.session.user.permissions ?? []) as string[];
      if (permissions.some((p) => userPerms.includes(p))) {
        return next({ ctx: { session: ctx.session } });
      }
    }
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tienes permisos para esta acción",
    });
  });
}

/** Extract agencyId from authenticated session */
export function getAgencyId(ctx: {
  session: { user: { agencyId?: string; role?: string } };
}): string {
  const { agencyId, role } = ctx.session.user;
  if (!agencyId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        role === "SUPER_ADMIN"
          ? "Esta operación requiere contexto de agencia."
          : "No se encontró agencyId en la sesión.",
    });
  }
  return agencyId;
}

// ── Typed procedures ──────────────────────────────────────────────────────────

export const superAdminProcedure = t.procedure.use(requireRole("SUPER_ADMIN"));
export const adminProcedure = t.procedure.use(requireRole("ADMIN"));
export const editorProcedure = t.procedure.use(requireRole("EDITOR"));
export const clienteProcedure = t.procedure.use(requireRole("CLIENTE"));
export const soporteProcedure = t.procedure.use(requireRole("SOPORTE"));
export const facturacionProcedure = t.procedure.use(requireRole("FACTURACION"));
export const platformProcedure = t.procedure.use(
  requireRole("SOPORTE", "FACTURACION")
);

/** Create a procedure that allows ADMIN or EDITOR with specific permissions */
export function adminOrPermissionProcedure(...permissions: EditorPermission[]) {
  return t.procedure.use(requireAdminOrPermission(...permissions));
}
