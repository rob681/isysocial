import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PLATFORM_ROLES = ["SUPER_ADMIN", "SOPORTE", "FACTURACION"];

function getPlatformAllowedPaths(role: string): string[] {
  switch (role) {
    case "SOPORTE":
      return ["/superadmin/soporte", "/superadmin/agencias"];
    case "FACTURACION":
      return ["/superadmin/facturacion", "/superadmin/agencias"];
    default:
      return [];
  }
}

const ADMIN_ROUTE_PERMISSIONS: Record<string, string> = {
  "/admin/equipo": "MANAGE_ALL_CLIENTS",
  "/admin/clientes": "MANAGE_ALL_CLIENTS",
  "/admin/contenido": "CREATE_POSTS",
  "/admin/ideas": "MANAGE_IDEAS",
  "/admin/metricas": "VIEW_ANALYTICS",
};

function editorCanAccessAdminRoute(path: string, permissions: string[]): boolean {
  if (permissions.length === 0) return false;

  const sortedRoutes = Object.entries(ADMIN_ROUTE_PERMISSIONS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [route, permission] of sortedRoutes) {
    if (path === route || path.startsWith(route + "/")) {
      return permissions.includes(permission);
    }
  }
  return false;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Landing page
    if (path === "/") {
      if (!token) return NextResponse.next();
      const role = token.role as string;
      switch (role) {
        case "SUPER_ADMIN":
        case "SOPORTE":
        case "FACTURACION":
          return NextResponse.redirect(new URL("/superadmin", req.url));
        case "ADMIN":
          return NextResponse.redirect(new URL("/admin", req.url));
        case "EDITOR":
          return NextResponse.redirect(new URL("/editor", req.url));
        case "CLIENTE":
          return NextResponse.redirect(new URL("/cliente", req.url));
      }
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;
    const permissions = (token.permissions as string[]) ?? [];

    // Shared routes for all authenticated users
    if (path === "/perfil" || path.startsWith("/notificaciones")) {
      return NextResponse.next();
    }

    // Platform routes
    if (path.startsWith("/superadmin")) {
      if (!PLATFORM_ROLES.includes(role)) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (role !== "SUPER_ADMIN") {
        const allowedPaths = getPlatformAllowedPaths(role);
        const isAllowed = allowedPaths.some(
          (prefix) => path === prefix || path.startsWith(prefix + "/")
        );
        if (path !== "/superadmin" && !isAllowed) {
          return NextResponse.redirect(new URL("/superadmin", req.url));
        }
      }
    }

    // Admin routes: ADMIN + EDITOR with permissions
    if (path.startsWith("/admin")) {
      if (role === "SUPER_ADMIN" || role === "ADMIN") {
        // Full access
      } else if (role === "EDITOR" && editorCanAccessAdminRoute(path, permissions)) {
        // Editor with specific permissions
      } else {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    if (path.startsWith("/editor") && role !== "EDITOR" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (path.startsWith("/cliente") && role !== "CLIENTE") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname === "/") return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/superadmin/:path*",
    "/admin/:path*",
    "/editor/:path*",
    "/cliente/:path*",
    "/perfil",
    "/notificaciones",
  ],
};
