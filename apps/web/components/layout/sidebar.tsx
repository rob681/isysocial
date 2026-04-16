"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Shield,
  Calendar,
  FileImage,
  Lightbulb,
  Globe,
  Building2,
  HeadphonesIcon,
  CreditCard,
  BarChart3,
  Archive,
  Grid3X3,
  LayoutTemplate,
  PanelLeftOpen,
  PanelLeftClose,
  FolderPlus,
  FolderClosed,
  X,
  CheckCircle2,
  Search,
  Palette,
  Share2,
  ChevronsLeft,
  Wand2,
  Pencil,
  Trash2,
  Activity,
  FileBarChart,
  Film,
} from "lucide-react";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useTheme } from "next-themes";
import { ThemeSwitcher } from "./theme-switcher";
import { trpc } from "@/lib/trpc/client";

// ─── Types ─────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  tourId?: string;
}

// ─── Admin Navigation ─────────────────────────────────────────────────────

const adminMainNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, tourId: "sidebar-dashboard" },
  { label: "Aprobaciones", href: "/admin/aprobaciones", icon: <CheckCircle2 className="h-5 w-5" />, tourId: "sidebar-approvals" },
];

const adminToolsNav: NavItem[] = [
  { label: "Clientes", href: "/admin/clientes", icon: <UserCircle className="h-5 w-5" />, tourId: "sidebar-clients" },
  { label: "Equipo", href: "/admin/equipo", icon: <Users className="h-5 w-5" />, tourId: "sidebar-team" },
  { label: "Plantillas", href: "/admin/plantillas", icon: <LayoutTemplate className="h-5 w-5" /> },
  { label: "Analíticas", href: "/admin/analiticas", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Archivo", href: "/admin/archivo", icon: <Archive className="h-5 w-5" /> },
  { label: "Configuración", href: "/admin/configuracion", icon: <Settings className="h-5 w-5" />, tourId: "sidebar-settings" },
];

// Sub-items for Analíticas (collapsible)
const analyticsSubItems: NavItem[] = [
  { label: "Social", href: "/admin/analiticas/social", icon: <Share2 className="h-4 w-4" /> },
  { label: "Reportes", href: "/admin/reportes", icon: <FileBarChart className="h-4 w-4" /> },
  { label: "Actividad", href: "/admin/actividad", icon: <Activity className="h-4 w-4" /> },
];

const clientSubItems: {
  label: string;
  icon: React.ReactNode;
  tourId?: string;
  segment?: string;
  hrefBuilder?: (prefix: string, id: string) => string;
  activeSegment?: string;
}[] = [
  { label: "Ideas", segment: "ideas", icon: <Lightbulb className="h-4 w-4" /> },
  { label: "Calendario", segment: "calendario", icon: <Calendar className="h-4 w-4" />, tourId: "sidebar-calendar" },
  { label: "Contenido", segment: "contenido", icon: <FileImage className="h-4 w-4" />, tourId: "sidebar-content" },
  { label: "Historias", segment: "stories", icon: <Film className="h-4 w-4" />, tourId: "sidebar-stories" },
  { label: "Grid", segment: "grid-preview", icon: <Grid3X3 className="h-4 w-4" /> },
  { label: "Mi Marca", hrefBuilder: (prefix: string, id: string) => `${prefix}/clientes/${id}/marca`, activeSegment: "marca", icon: <Palette className="h-4 w-4" />, tourId: "sidebar-brand" },
];

// ─── Editor Navigation ────────────────────────────────────────────────────

const editorMainNav: NavItem[] = [
  { label: "Dashboard", href: "/editor", icon: <LayoutDashboard className="h-5 w-5" />, tourId: "sidebar-dashboard" },
];

const editorToolsNav: NavItem[] = [
  { label: "Archivo", href: "/editor/archivo", icon: <Archive className="h-5 w-5" /> },
];

// ─── Cliente Navigation ───────────────────────────────────────────────────

const clienteNav: NavItem[] = [
  { label: "Inicio", href: "/cliente", icon: <LayoutDashboard className="h-5 w-5" />, tourId: "sidebar-dashboard" },
  { label: "Calendario", href: "/cliente/calendario", icon: <Calendar className="h-5 w-5" />, tourId: "sidebar-calendar" },
  { label: "Contenido", href: "/cliente/contenido", icon: <FileImage className="h-5 w-5" />, tourId: "sidebar-content" },
  { label: "Ideas", href: "/cliente/ideas", icon: <Lightbulb className="h-5 w-5" />, tourId: "sidebar-ideas" },
  { label: "Archivo", href: "/cliente/archivo", icon: <Archive className="h-5 w-5" /> },
  { label: "Mi Marca", href: "/cliente/marca", icon: <Palette className="h-5 w-5" />, tourId: "sidebar-brand" },
  { label: "Brochure Guiado", href: "/cliente/marca-guiada", icon: <Wand2 className="h-5 w-5" /> },
  { label: "Estadísticas", href: "/cliente/estadisticas", icon: <BarChart3 className="h-5 w-5" /> },
];

// ─── SuperAdmin / Soporte / Facturación Navigation ────────────────────────

const superAdminNav: NavItem[] = [
  { label: "Plataforma", href: "/superadmin", icon: <Globe className="h-5 w-5" /> },
  { label: "Agencias", href: "/superadmin/agencias", icon: <Building2 className="h-5 w-5" /> },
  { label: "Staff", href: "/superadmin/staff", icon: <Shield className="h-5 w-5" /> },
  { label: "Configuración", href: "/superadmin/configuracion", icon: <Settings className="h-5 w-5" /> },
];

const soporteNav: NavItem[] = [
  { label: "Dashboard", href: "/superadmin", icon: <HeadphonesIcon className="h-5 w-5" /> },
  { label: "Agencias", href: "/superadmin/soporte/agencias", icon: <Building2 className="h-5 w-5" /> },
  { label: "Usuarios", href: "/superadmin/soporte/usuarios", icon: <Users className="h-5 w-5" /> },
];

const facturacionNav: NavItem[] = [
  { label: "Dashboard", href: "/superadmin", icon: <CreditCard className="h-5 w-5" /> },
  { label: "Agencias", href: "/superadmin/facturacion/agencias", icon: <Building2 className="h-5 w-5" /> },
];

// ─── Color Presets for Group Creation ─────────────────────────────────────

const PRESET_COLORS = ["#6B7280", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];

// ─── Helpers ──────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/editor") return pathname === "/editor";
  if (href === "/cliente") return pathname === "/cliente";
  if (href === "/superadmin") return pathname === "/superadmin";
  return pathname.startsWith(href);
}

function useNavConfig() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const avatarUrl = (session?.user as any)?.avatarUrl as string | undefined;

  let mainNav: NavItem[];
  let toolsNav: NavItem[];
  let showClientList = false;
  let rolePrefix = "";

  if (role === "SUPER_ADMIN") {
    mainNav = superAdminNav;
    toolsNav = [];
  } else if (role === "SOPORTE") {
    mainNav = soporteNav;
    toolsNav = [];
  } else if (role === "FACTURACION") {
    mainNav = facturacionNav;
    toolsNav = [];
  } else if (role === "ADMIN") {
    mainNav = adminMainNav;
    toolsNav = adminToolsNav;
    showClientList = true;
    rolePrefix = "/admin";
  } else if (role === "EDITOR") {
    mainNav = editorMainNav;
    toolsNav = editorToolsNav;
    showClientList = true;
    rolePrefix = "/editor";
  } else {
    mainNav = clienteNav;
    toolsNav = [];
  }

  return { session, role, avatarUrl, mainNav, toolsNav, showClientList, rolePrefix };
}

// ─── localStorage helpers ─────────────────────────────────────────────────

function readLocalStorage(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

// ─── Logo Section (shared) ────────────────────────────────────────────────

function LogoSection({
  expanded,
  isDark,
  mounted,
  customLogo,
  agencyName,
}: {
  expanded: boolean;
  isDark: boolean;
  mounted: boolean;
  customLogo: string | null | undefined;
  agencyName: string | null | undefined;
}) {
  if (!mounted) {
    return expanded ? <div className="h-14 w-40" /> : <div className="w-12 h-12" />;
  }

  if (expanded) {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Isysocial full logo — always shown */}
        <img
          src={isDark ? "/logo-full-white.svg" : "/logo-full-normal.svg"}
          alt="Isysocial"
          className="h-10 w-auto"
        />
        {/* Agency full logo — centered below with separator */}
        {customLogo && (
          <>
            <div className="w-full h-px bg-border/60" />
            <div className="flex items-center justify-center w-full">
              <img
                src={customLogo}
                alt={agencyName ?? "Agency"}
                className="h-10 max-w-[160px] object-contain"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Collapsed: solo ícono Isysocial (sin logo agencia = más limpio, estilo Isytask)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <img
        src={isDark ? "/logo-icon-white.svg" : "/logo-icon-color.svg"}
        alt="Isysocial"
        className="w-9 h-9"
      />
    </div>
  );
}

// ─── Icon Bar Nav Item (collapsed — icon only, 64px) ──────────────────────

function IconNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = isItemActive(item.href, pathname);

  if (item.comingSoon) {
    return (
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl opacity-40 cursor-not-allowed mx-auto"
        title={`${item.label} (pronto)`}
      >
        {item.icon}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 mx-auto",
        isActive
          ? "gradient-primary text-white shadow-md"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      title={item.label}
      {...(item.tourId ? { "data-tour": item.tourId } : {})}
    >
      {item.icon}
    </Link>
  );
}

// ─── Expanded Nav Item (icon + label, ~200px) ─────────────────────────────

function ExpandedNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = isItemActive(item.href, pathname);

  if (item.comingSoon) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-50 cursor-not-allowed text-muted-foreground">
        {item.icon}
        <div className="flex items-center gap-2 flex-1">
          <span>{item.label}</span>
          <span className="text-[10px] bg-muted rounded px-1 py-0.5">Pronto</span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "gradient-primary text-white shadow-md"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      {...(item.tourId ? { "data-tour": item.tourId } : {})}
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ─── Icon Bar (Column 1) ─────────────────────────────────────────────────
// Can render in two widths:
//   - collapsed = true  -> 64px (icons only)
//   - collapsed = false -> ~200px (icons + labels)
// For roles WITH showClientList, a toggle at the bottom switches sidebarMode.
// For roles WITHOUT showClientList, a toggle at the bottom expands/collapses.

function IconBar({
  collapsed,
  showClientList,
  sidebarMode,
  onToggle,
  onCollapseAll,
  onNavigate,
}: {
  collapsed: boolean;
  showClientList: boolean;
  sidebarMode: "clients" | "tools" | "collapsed";
  onToggle: () => void;
  onCollapseAll?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { session, avatarUrl, mainNav, toolsNav, role } = useNavConfig();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === "dark";

  // Auto-expand analytics sub-menu if on a sub-page
  const isOnAnalyticsSub = pathname.startsWith("/admin/reportes") || pathname.startsWith("/admin/actividad");
  useEffect(() => {
    if (isOnAnalyticsSub) setAnalyticsOpen(true);
  }, [isOnAnalyticsSub]);

  // Fetch agency logo
  const { data: agencyLogo } = trpc.agencies.getAgencyLogo.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const customLogo = isDark
    ? (agencyLogo?.logoDarkUrl || agencyLogo?.logoUrl)
    : agencyLogo?.logoUrl;

  const roleLabel =
    role === "SUPER_ADMIN" ? "Super Admin"
    : role === "SOPORTE" ? "Soporte"
    : role === "FACTURACION" ? "Facturacion"
    : role === "ADMIN" ? "Administrador"
    : role === "EDITOR" ? "Editor"
    : "Cliente";

  return (
    <div
      className={cn(
        "flex-shrink-0 bg-[hsl(var(--sidebar-icon))] border-r flex flex-col h-full transition-all duration-300",
        collapsed ? "w-16" : "w-[200px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex-shrink-0", collapsed ? "py-4 flex justify-center" : "px-4 py-4")}>
        <LogoSection
          expanded={!collapsed}
          isDark={isDark}
          mounted={mounted}
          customLogo={customLogo}
          agencyName={agencyLogo?.name}
        />
      </div>

      {/* User avatar / info */}
      {session?.user && (
        collapsed ? (
          <Link
            href="/perfil"
            onClick={onNavigate}
            className="flex-shrink-0 mb-2 hover:opacity-80 transition-opacity flex justify-center"
            title="Mi perfil"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                {getInitials(session.user.name)}
              </div>
            )}
          </Link>
        ) : (
          <Link
            href="/perfil"
            onClick={onNavigate}
            className="flex-shrink-0 mx-3 mb-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {getInitials(session.user.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{session.user.name}</p>
                <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
              </div>
            </div>
          </Link>
        )
      )}

      {/* Divider */}
      <div className={cn("h-px bg-border my-2 flex-shrink-0", collapsed ? "mx-4" : "mx-3")} />

      {/* Main Nav */}
      {collapsed ? (
        <nav className="space-y-1 flex-shrink-0 w-full px-2">
          {mainNav.map((item) => (
            <IconNavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </nav>
      ) : (
        <nav className="space-y-0.5 flex-shrink-0 w-full px-2">
          {mainNav.map((item) => (
            <ExpandedNavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </nav>
      )}

      {/* Divider if tools exist */}
      {toolsNav.length > 0 && (
        <div className={cn("h-px bg-border my-2 flex-shrink-0", collapsed ? "mx-4" : "mx-3")} />
      )}

      {/* Tools Nav */}
      {toolsNav.length > 0 && (
        collapsed ? (
          <nav className="space-y-1 flex-shrink-0 w-full px-2">
            {toolsNav.map((item) => (
              <IconNavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </nav>
        ) : (
          <>
            <div className="px-4 mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Herramientas
              </p>
            </div>
            <nav className="space-y-0.5 flex-shrink-0 w-full px-2">
              {toolsNav.map((item) => {
                // Analíticas: render with collapsible sub-items
                if (item.label === "Analíticas" && role === "ADMIN") {
                  const isAnalyticsActive = isItemActive(item.href, pathname) || isOnAnalyticsSub;
                  return (
                    <div key={item.href}>
                      <button
                        onClick={() => setAnalyticsOpen((v) => !v)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 w-full",
                          isAnalyticsActive
                            ? "gradient-primary text-white shadow-md"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {item.icon}
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", analyticsOpen ? "rotate-180" : "")} />
                      </button>
                      {analyticsOpen && (
                        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                              isItemActive(item.href, pathname) && !isOnAnalyticsSub
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {item.icon}
                            <span>Dashboard</span>
                          </Link>
                          {analyticsSubItems.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={onNavigate}
                              className={cn(
                                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                                isItemActive(sub.href, pathname)
                                  ? "text-primary bg-primary/10"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              )}
                            >
                              {sub.icon}
                              <span>{sub.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return <ExpandedNavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />;
              })}
            </nav>
          </>
        )
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Toggle buttons */}
      {showClientList ? (
        sidebarMode === "collapsed" ? (
          /* Collapsed mode: show expand button */
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 mx-auto mb-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Expandir sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          /* Normal mode: toggle + minimize */
          <div className={cn("flex flex-col gap-1 mb-1", collapsed ? "items-center" : "px-1")}>
            <button
              onClick={onToggle}
              className={cn(
                "flex items-center justify-center rounded-xl transition-all duration-200",
                collapsed ? "w-10 h-10" : "w-full gap-2 px-3 py-2 text-sm font-medium",
                sidebarMode === "tools"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={sidebarMode === "clients" ? "Mostrar herramientas" : "Mostrar clientes"}
            >
              {sidebarMode === "clients" ? (
                <>
                  <PanelLeftOpen className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">Expandir barra</span>}
                </>
              ) : (
                <>
                  <PanelLeftClose className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">Mostrar clientes</span>}
                </>
              )}
            </button>
            {onCollapseAll && (
              <button
                onClick={onCollapseAll}
                className={cn(
                  "flex items-center justify-center rounded-xl transition-all duration-200 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed ? "w-10 h-10" : "w-full gap-2 px-3 py-1.5 text-xs font-medium"
                )}
                title="Minimizar todo"
              >
                <ChevronsLeft className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">Minimizar</span>}
              </button>
            )}
          </div>
        )
      ) : (
        /* Non-client roles: expand/collapse iconbar */
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center rounded-xl transition-all duration-200 mb-1",
            collapsed
              ? "w-10 h-10 mx-auto"
              : "mx-3 gap-2 px-3 py-2 text-sm font-medium w-auto",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">Colapsar</span>
            </>
          )}
        </button>
      )}

      {/* Theme & Logout */}
      <div className={cn("pb-3 space-y-1 flex-shrink-0 w-full", collapsed ? "px-2" : "px-2")}>
        <ThemeSwitcher collapsed={collapsed} />
        {collapsed ? (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mx-auto"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar sesión</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Client Item ──────────────────────────────────────────────────────────

function ClientItem({
  client,
  rolePrefix,
  pathname,
  activeClientId,
  expandedClient,
  onToggle,
  onNavigate,
}: {
  client: { id: string; companyName: string; logoUrl: string | null; avatarUrl: string | null };
  rolePrefix: string;
  pathname: string;
  activeClientId: string | null;
  expandedClient: string | null;
  onToggle: (id: string) => void;
  onNavigate?: () => void;
}) {
  const isExpanded = expandedClient === client.id;
  const hasActiveChild = clientSubItems.some(
    (sub) => pathname.includes(`/${sub.segment}`) && activeClientId === client.id
  );

  return (
    <div>
      <button
        onClick={() => onToggle(client.id)}
        className={cn(
          "flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm transition-colors",
          hasActiveChild || isExpanded
            ? "bg-accent/70 text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {client.logoUrl ? (
          <img
            src={client.logoUrl}
            alt={client.companyName}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
            {getInitials(client.companyName)}
          </div>
        )}

        <span className="flex-1 text-left truncate text-[13px] font-medium">
          {client.companyName}
        </span>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 text-muted-foreground",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="ml-4 pl-3 border-l border-border/60 mt-0.5 mb-1 space-y-0.5">
          {clientSubItems.map((sub) => {
            const href = sub.hrefBuilder
              ? sub.hrefBuilder(rolePrefix, client.id)
              : `${rolePrefix}/${sub.segment}?clientId=${client.id}`;
            const activeSegment = sub.activeSegment || sub.segment;
            const isSubActive =
              pathname.includes(`/${activeSegment}`) && activeClientId === client.id;

            return (
              <Link
                key={sub.segment || sub.activeSegment}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isSubActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                {...(sub.tourId ? { "data-tour": sub.tourId } : {})}
              >
                {sub.icon}
                <span>{sub.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Inline Group Creation (shared between ClientPanel & Mobile) ──────────

function InlineGroupCreation({
  creatingGroup,
  setCreatingGroup,
  newGroupName,
  setNewGroupName,
  newGroupColor,
  setNewGroupColor,
  groupInputRef,
  onCreateGroup,
  isLoading,
}: {
  creatingGroup: boolean;
  setCreatingGroup: (v: boolean) => void;
  newGroupName: string;
  setNewGroupName: (v: string) => void;
  newGroupColor: string;
  setNewGroupColor: (v: string) => void;
  groupInputRef: React.RefObject<HTMLInputElement>;
  onCreateGroup: () => void;
  isLoading: boolean;
}) {
  if (!creatingGroup) return null;

  return (
    <div className="px-1 py-1.5 mb-1 space-y-1.5">
      <div className="flex items-center gap-1">
        <input
          ref={groupInputRef}
          type="text"
          placeholder="Nombre del grupo"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreateGroup();
            if (e.key === "Escape") {
              setCreatingGroup(false);
              setNewGroupName("");
            }
          }}
          className="flex-1 min-w-0 px-2 py-1 text-xs bg-accent/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={onCreateGroup}
          disabled={!newGroupName.trim() || isLoading}
          className="p-1 rounded-md text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setCreatingGroup(false);
            setNewGroupName("");
          }}
          className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Color presets */}
      <div className="flex items-center gap-1 px-0.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setNewGroupColor(color)}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-all flex-shrink-0",
              newGroupColor === color
                ? "border-foreground scale-110"
                : "border-transparent hover:border-muted-foreground/50"
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Client Panel (Column 2 — Full, 220px) ───────────────────────────────

function ClientPanelInner({
  rolePrefix,
  onClose,
  onNavigate,
}: {
  rolePrefix: string;
  onClose: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeClientId = searchParams.get("clientId");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Group creation state
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
  const groupInputRef = useRef<HTMLInputElement>(null);

  // Group editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupColor, setEditGroupColor] = useState("");

  const { data: clients } = trpc.clients.getForSidebar.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const { data: groups } = trpc.clientGroups.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const utils = trpc.useUtils();
  const createGroup = trpc.clientGroups.create.useMutation({
    onSuccess: () => {
      utils.clientGroups.list.invalidate();
      utils.clients.getForSidebar.invalidate();
      setCreatingGroup(false);
      setNewGroupName("");
      setNewGroupColor(PRESET_COLORS[0]);
    },
  });

  const updateGroup = trpc.clientGroups.update.useMutation({
    onSuccess: () => {
      utils.clientGroups.list.invalidate();
      utils.clients.getForSidebar.invalidate();
      setEditingGroupId(null);
    },
  });

  const deleteGroupMut = trpc.clientGroups.delete.useMutation({
    onSuccess: () => {
      utils.clientGroups.list.invalidate();
      utils.clients.getForSidebar.invalidate();
      setEditingGroupId(null);
    },
  });

  const startEditingGroup = (group: { id: string; name: string; color?: string }) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupColor((group as any).color || "#6B7280");
  };

  const saveGroupEdit = () => {
    if (editingGroupId && editGroupName.trim()) {
      updateGroup.mutate({
        id: editingGroupId,
        name: editGroupName.trim(),
        color: editGroupColor,
      });
    }
  };

  // Auto-expand client from URL
  useEffect(() => {
    if (activeClientId && activeClientId !== expandedClient) {
      setExpandedClient(activeClientId);
      const client = clients?.find((c) => c.id === activeClientId);
      if (client?.groupId) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          next.delete(client.groupId!);
          return next;
        });
      }
    }
  }, [activeClientId, clients]);

  // Auto-focus group input
  useEffect(() => {
    if (creatingGroup) {
      groupInputRef.current?.focus();
    }
  }, [creatingGroup]);

  const toggleClient = (id: string) => {
    setExpandedClient((prev) => (prev === id ? null : id));
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroup.mutate({ name: newGroupName.trim(), color: newGroupColor });
    }
  };

  // Filter clients by search
  const filteredClients = clients?.filter((c) =>
    searchQuery
      ? c.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  // Organize clients: grouped + ungrouped
  const groupedClients = new Map<string, NonNullable<typeof filteredClients>>();
  const ungroupedClients: NonNullable<typeof filteredClients> = [];

  for (const client of filteredClients ?? []) {
    if (client.groupId) {
      if (!groupedClients.has(client.groupId)) {
        groupedClients.set(client.groupId, []);
      }
      groupedClients.get(client.groupId)!.push(client);
    } else {
      ungroupedClients.push(client);
    }
  }

  const sortedGroups = (groups ?? []).filter(
    (g) => groupedClients.has(g.id) || !searchQuery
  );
  const hasGroups = sortedGroups.length > 0;

  return (
    <div className="w-[220px] flex-shrink-0 bg-card border-r flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-4 pb-1 flex-shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Clientes
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCreatingGroup(true)}
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Nuevo grupo"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Cerrar panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-accent/50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Client list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {/* Inline group creation */}
        <InlineGroupCreation
          creatingGroup={creatingGroup}
          setCreatingGroup={setCreatingGroup}
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          newGroupColor={newGroupColor}
          setNewGroupColor={setNewGroupColor}
          groupInputRef={groupInputRef}
          onCreateGroup={handleCreateGroup}
          isLoading={createGroup.isLoading}
        />

        {/* Grouped clients (folders) */}
        {sortedGroups.map((group) => {
          const groupClients = groupedClients.get(group.id) ?? [];
          const isGroupCollapsed = collapsedGroups.has(group.id);
          const hasActiveInGroup = groupClients.some((c) =>
            clientSubItems.some(
              (sub) => pathname.includes(`/${sub.segment}`) && activeClientId === c.id
            )
          );

          // Skip empty groups during search
          if (searchQuery && groupClients.length === 0) return null;

          const groupColor = (group as any).color || "#6B7280";
          const isEditingThis = editingGroupId === group.id;

          return (
            <div key={group.id} className="mt-1">
              {isEditingThis ? (
                /* ─── Inline Group Edit ─── */
                <div className="px-1 py-1.5 mb-1 space-y-1.5 bg-accent/30 rounded-md">
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveGroupEdit();
                        if (e.key === "Escape") setEditingGroupId(null);
                      }}
                      className="flex-1 min-w-0 px-2 py-1 text-xs bg-accent/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={saveGroupEdit}
                      disabled={!editGroupName.trim() || updateGroup.isLoading}
                      className="p-1 rounded-md text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 px-0.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditGroupColor(color)}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-all flex-shrink-0",
                          editGroupColor === color
                            ? "border-foreground scale-110"
                            : "border-transparent hover:border-muted-foreground/50"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 px-0.5">
                    <button
                      onClick={() => {
                        if (confirm(`Eliminar grupo "${group.name}"?`)) {
                          deleteGroupMut.mutate({ id: group.id });
                        }
                      }}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3 inline mr-0.5" />
                      Eliminar grupo
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── Normal Group Header (macOS folder style) ─── */
                <div className="group/grp flex items-center">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "flex items-center gap-2 flex-1 rounded-md px-2 py-1.5 text-xs transition-colors min-w-0",
                      hasActiveInGroup
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-accent-foreground"
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 flex-shrink-0 transition-transform duration-200",
                        !isGroupCollapsed && "rotate-90"
                      )}
                    />
                    {/* macOS-style folder icon with group color gradient */}
                    <span className="relative flex-shrink-0 w-5 h-[17px]">
                      {/* Back tab */}
                      <span
                        className="absolute top-0 left-0 w-[10px] h-[5px] rounded-t-[3px]"
                        style={{ backgroundColor: groupColor, opacity: 0.85 }}
                      />
                      {/* Main body */}
                      <span
                        className="absolute bottom-0 left-0 w-full h-[13px] rounded-[2px] rounded-tl-none"
                        style={{
                          background: `linear-gradient(180deg, ${groupColor}dd 0%, ${groupColor} 100%)`,
                        }}
                      />
                      {/* Front face highlight */}
                      <span
                        className="absolute bottom-0 left-0 w-full h-[9px] rounded-[2px]"
                        style={{
                          background: `linear-gradient(180deg, ${groupColor}cc 0%, ${groupColor}95 100%)`,
                          filter: "brightness(1.2)",
                        }}
                      />
                    </span>
                    <span className="font-semibold uppercase tracking-wider text-[10px] truncate">
                      {group.name}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {groupClients.length}
                    </span>
                  </button>
                  <button
                    onClick={() => startEditingGroup(group)}
                    className="p-1 rounded-md opacity-0 group-hover/grp:opacity-100 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    title="Editar grupo"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}

              {!isGroupCollapsed && !isEditingThis && (
                <div className="ml-1 space-y-0.5 mt-0.5">
                  {groupClients.map((client) => (
                    <ClientItem
                      key={client.id}
                      client={client}
                      rolePrefix={rolePrefix}
                      pathname={pathname}
                      activeClientId={activeClientId}
                      expandedClient={expandedClient}
                      onToggle={toggleClient}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped clients */}
        {hasGroups && ungroupedClients.length > 0 && (
          <div className="mt-2">
            <div className="px-2.5 py-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                Sin grupo
              </span>
            </div>
          </div>
        )}
        <div className="space-y-0.5">
          {ungroupedClients.map((client) => (
            <ClientItem
              key={client.id}
              client={client}
              rolePrefix={rolePrefix}
              pathname={pathname}
              activeClientId={activeClientId}
              expandedClient={expandedClient}
              onToggle={toggleClient}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* Empty state */}
        {(!clients || clients.length === 0) && (
          <div className="text-center py-6">
            <UserCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Sin clientes aun</p>
          </div>
        )}

        {/* No search results */}
        {searchQuery && filteredClients?.length === 0 && (clients?.length ?? 0) > 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">Sin resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientPanel(props: { rolePrefix: string; onClose: () => void; onNavigate?: () => void }) {
  return (
    <Suspense fallback={null}>
      <ClientPanelInner {...props} />
    </Suspense>
  );
}

// ─── Client Panel Collapsed (Column 2 — Mini, 48px) ──────────────────────
// Shows colored folder icons per group + ungrouped client avatars.
// Clicking any item switches to mode="clients".

function ClientPanelCollapsedInner({
  onExpand,
}: {
  onExpand: () => void;
}) {
  const { data: clients } = trpc.clients.getForSidebar.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const { data: groups } = trpc.clientGroups.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Organize
  const groupedClients = new Map<string, number>();
  const ungroupedClients: { id: string; companyName: string; logoUrl: string | null }[] = [];

  for (const client of clients ?? []) {
    if (client.groupId) {
      groupedClients.set(client.groupId, (groupedClients.get(client.groupId) ?? 0) + 1);
    } else {
      ungroupedClients.push(client);
    }
  }

  const sortedGroups = (groups ?? []).filter((g) => groupedClients.has(g.id));

  return (
    <div className="w-12 flex-shrink-0 bg-card border-r flex flex-col h-full items-center">
      {/* Expand button */}
      <button
        onClick={onExpand}
        className="mt-3 mb-2 flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        title="Mostrar clientes"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>

      <div className="w-8 h-px bg-border mb-2 flex-shrink-0" />

      {/* Group folders */}
      <div className="flex-1 overflow-y-auto space-y-2 py-1 w-full flex flex-col items-center">
        {sortedGroups.map((group) => {
          const count = groupedClients.get(group.id) ?? 0;
          return (
            <button
              key={group.id}
              onClick={onExpand}
              className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
              title={`${group.name} (${count})`}
            >
              {/* macOS-style folder icon */}
              <span className="relative w-6 h-5">
                <span
                  className="absolute top-0 left-0 w-3 h-[6px] rounded-t-[3px]"
                  style={{ backgroundColor: (group as any).color || "#6B7280", opacity: 0.85 }}
                />
                <span
                  className="absolute bottom-0 left-0 w-full h-4 rounded-[3px] rounded-tl-none"
                  style={{
                    background: `linear-gradient(180deg, ${(group as any).color || "#6B7280"}dd 0%, ${(group as any).color || "#6B7280"} 100%)`,
                  }}
                />
                <span
                  className="absolute bottom-0 left-0 w-full h-[11px] rounded-[3px]"
                  style={{
                    background: `linear-gradient(180deg, ${(group as any).color || "#6B7280"}cc 0%, ${(group as any).color || "#6B7280"}95 100%)`,
                    filter: "brightness(1.2)",
                  }}
                />
              </span>
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
          );
        })}

        {/* Separator between groups and ungrouped */}
        {sortedGroups.length > 0 && ungroupedClients.length > 0 && (
          <div className="w-6 h-px bg-border flex-shrink-0" />
        )}

        {/* Ungrouped clients — avatar/initials circles */}
        {ungroupedClients.map((client) => (
          <button
            key={client.id}
            onClick={onExpand}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:ring-2 hover:ring-primary/30 transition-all"
            title={client.companyName}
          >
            {client.logoUrl ? (
              <img
                src={client.logoUrl}
                alt={client.companyName}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-[8px] font-bold">
                {getInitials(client.companyName)}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClientPanelCollapsed(props: { onExpand: () => void }) {
  return (
    <Suspense fallback={null}>
      <ClientPanelCollapsedInner {...props} />
    </Suspense>
  );
}

// ─── Mobile Client List (reuses ClientPanel logic inline) ─────────────────

function MobileClientList({
  rolePrefix,
  onNavigate,
}: {
  rolePrefix: string;
  onNavigate?: () => void;
}) {
  return (
    <Suspense fallback={null}>
      <MobileClientListInner rolePrefix={rolePrefix} onNavigate={onNavigate} />
    </Suspense>
  );
}

function MobileClientListInner({
  rolePrefix,
  onNavigate,
}: {
  rolePrefix: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeClientId = searchParams.get("clientId");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group creation state
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
  const groupInputRef = useRef<HTMLInputElement>(null);

  // Group editing state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupColor, setEditGroupColor] = useState("");

  const { data: clients } = trpc.clients.getForSidebar.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const { data: groups } = trpc.clientGroups.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const utils = trpc.useUtils();
  const createGroup = trpc.clientGroups.create.useMutation({
    onSuccess: () => {
      utils.clientGroups.list.invalidate();
      utils.clients.getForSidebar.invalidate();
      setCreatingGroup(false);
      setNewGroupName("");
      setNewGroupColor(PRESET_COLORS[0]);
    },
  });

  const updateGroup = trpc.clientGroups.update.useMutation({
    onSuccess: () => {
      utils.clientGroups.list.invalidate();
      utils.clients.getForSidebar.invalidate();
      setEditingGroupId(null);
    },
  });

  const deleteGroupMut = trpc.clientGroups.delete.useMutation({
    onSuccess: () => {
      utils.clientGroups.list.invalidate();
      utils.clients.getForSidebar.invalidate();
      setEditingGroupId(null);
    },
  });

  const startEditingGroup = (group: { id: string; name: string; color?: string }) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupColor((group as any).color || "#6B7280");
  };

  const saveGroupEdit = () => {
    if (editingGroupId && editGroupName.trim()) {
      updateGroup.mutate({
        id: editingGroupId,
        name: editGroupName.trim(),
        color: editGroupColor,
      });
    }
  };

  useEffect(() => {
    if (activeClientId && activeClientId !== expandedClient) {
      setExpandedClient(activeClientId);
      const client = clients?.find((c) => c.id === activeClientId);
      if (client?.groupId) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          next.delete(client.groupId!);
          return next;
        });
      }
    }
  }, [activeClientId, clients]);

  useEffect(() => {
    if (creatingGroup) groupInputRef.current?.focus();
  }, [creatingGroup]);

  if (!clients || clients.length === 0) return null;

  const toggleClient = (id: string) => {
    setExpandedClient((prev) => (prev === id ? null : id));
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroup.mutate({ name: newGroupName.trim(), color: newGroupColor });
    }
  };

  const groupedClients = new Map<string, typeof clients>();
  const ungroupedClients: typeof clients = [];
  for (const client of clients) {
    if (client.groupId) {
      if (!groupedClients.has(client.groupId)) groupedClients.set(client.groupId, []);
      groupedClients.get(client.groupId)!.push(client);
    } else {
      ungroupedClients.push(client);
    }
  }
  const sortedGroups = (groups ?? []).filter((g) => groupedClients.has(g.id));
  const hasGroups = sortedGroups.length > 0;

  return (
    <div className="border-t">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Clientes
        </p>
        <button
          onClick={() => setCreatingGroup(true)}
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Nuevo grupo"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-2 pb-2 max-h-[380px] overflow-y-auto">
        {/* Inline group creation */}
        <InlineGroupCreation
          creatingGroup={creatingGroup}
          setCreatingGroup={setCreatingGroup}
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          newGroupColor={newGroupColor}
          setNewGroupColor={setNewGroupColor}
          groupInputRef={groupInputRef}
          onCreateGroup={handleCreateGroup}
          isLoading={createGroup.isLoading}
        />

        {sortedGroups.map((group) => {
          const groupClients = groupedClients.get(group.id) ?? [];
          const isGroupCollapsed = collapsedGroups.has(group.id);
          const hasActiveInGroup = groupClients.some((c) =>
            clientSubItems.some(
              (sub) => pathname.includes(`/${sub.segment}`) && activeClientId === c.id
            )
          );
          const groupColor = (group as any).color || "#6B7280";
          const isEditingThis = editingGroupId === group.id;

          return (
            <div key={group.id} className="mt-1">
              {isEditingThis ? (
                <div className="px-1 py-1.5 mb-1 space-y-1.5 bg-accent/30 rounded-md">
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveGroupEdit();
                        if (e.key === "Escape") setEditingGroupId(null);
                      }}
                      className="flex-1 min-w-0 px-2 py-1 text-xs bg-accent/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={saveGroupEdit}
                      disabled={!editGroupName.trim() || updateGroup.isLoading}
                      className="p-1 rounded-md text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingGroupId(null)}
                      className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 px-0.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditGroupColor(color)}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-all flex-shrink-0",
                          editGroupColor === color
                            ? "border-foreground scale-110"
                            : "border-transparent hover:border-muted-foreground/50"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 px-0.5">
                    <button
                      onClick={() => {
                        if (confirm(`Eliminar grupo "${group.name}"?`)) {
                          deleteGroupMut.mutate({ id: group.id });
                        }
                      }}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3 inline mr-0.5" />
                      Eliminar grupo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group/grp flex items-center">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "flex items-center gap-2 flex-1 rounded-md px-2.5 py-1.5 text-xs transition-colors min-w-0",
                      hasActiveInGroup
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-accent-foreground"
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 flex-shrink-0 transition-transform duration-200",
                        !isGroupCollapsed && "rotate-90"
                      )}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: groupColor }}
                    />
                    <span className="font-semibold uppercase tracking-wider text-[10px] truncate">
                      {group.name}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {groupClients.length}
                    </span>
                  </button>
                  <button
                    onClick={() => startEditingGroup(group)}
                    className="p-1 rounded-md opacity-0 group-hover/grp:opacity-100 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    title="Editar grupo"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
              {!isGroupCollapsed && !isEditingThis && (
                <div className="ml-1 space-y-0.5 mt-0.5">
                  {groupClients.map((client) => (
                    <ClientItem
                      key={client.id}
                      client={client}
                      rolePrefix={rolePrefix}
                      pathname={pathname}
                      activeClientId={activeClientId}
                      expandedClient={expandedClient}
                      onToggle={toggleClient}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {hasGroups && ungroupedClients.length > 0 && (
          <div className="mt-2">
            <div className="px-2.5 py-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                Sin grupo
              </span>
            </div>
          </div>
        )}
        <div className="space-y-0.5">
          {ungroupedClients.map((client) => (
            <ClientItem
              key={client.id}
              client={client}
              rolePrefix={rolePrefix}
              pathname={pathname}
              activeClientId={activeClientId}
              expandedClient={expandedClient}
              onToggle={toggleClient}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Sidebar Content (traditional expanded layout) ─────────────────

function MobileSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { session, role, avatarUrl, mainNav, toolsNav, showClientList, rolePrefix } = useNavConfig();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileAnalyticsOpen, setMobileAnalyticsOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === "dark";
  const isOnAnalyticsSub = pathname.startsWith("/admin/reportes") || pathname.startsWith("/admin/actividad");
  useEffect(() => { if (isOnAnalyticsSub) setMobileAnalyticsOpen(true); }, [isOnAnalyticsSub]);

  const { data: agencyLogo } = trpc.agencies.getAgencyLogo.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const customLogo = isDark
    ? (agencyLogo?.logoDarkUrl || agencyLogo?.logoUrl)
    : agencyLogo?.logoUrl;

  const roleLabel =
    role === "SUPER_ADMIN" ? "Super Admin"
    : role === "SOPORTE" ? "Soporte"
    : role === "FACTURACION" ? "Facturacion"
    : role === "ADMIN" ? "Administrador"
    : role === "EDITOR" ? "Editor"
    : "Cliente";

  return (
    <>
      {/* Brand Logo — always show Isysocial, then agency below */}
      <div className="flex flex-col items-start px-4 py-5 border-b gap-2">
        {mounted ? (
          <>
            <img
              src={isDark ? "/logo-full-white.svg" : "/logo-full-normal.svg"}
              alt="Isysocial"
              className="h-10 w-auto"
            />
            {customLogo && (
              <>
                <div className="w-full h-px bg-border/60" />
                <img
                  src={customLogo}
                  alt={agencyLogo?.name ?? "Agency"}
                  className="h-8 max-w-[180px] object-contain"
                />
              </>
            )}
          </>
        ) : (
          <div className="h-14 w-36" />
        )}
      </div>

      {/* User info */}
      {session?.user && (
        <Link
          href="/perfil"
          onClick={onNavigate}
          className="block p-4 border-b hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={session.user.name || "Avatar"}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {getInitials(session.user.name)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium mt-1">
                {roleLabel}
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-1">
          {mainNav.map((item) => (
            <ExpandedNavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </nav>

        {showClientList && (
          <MobileClientList rolePrefix={rolePrefix} onNavigate={onNavigate} />
        )}

        {toolsNav.length > 0 && (
          <div className="border-t">
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Herramientas
              </p>
            </div>
            <nav className="p-2 space-y-1">
              {toolsNav.map((item) => {
                if (item.label === "Analíticas" && role === "ADMIN") {
                  const isAnalyticsActive = isItemActive(item.href, pathname) || isOnAnalyticsSub;
                  return (
                    <div key={item.href}>
                      <button
                        onClick={() => setMobileAnalyticsOpen((v) => !v)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 w-full",
                          isAnalyticsActive
                            ? "gradient-primary text-white shadow-md"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {item.icon}
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mobileAnalyticsOpen ? "rotate-180" : "")} />
                      </button>
                      {mobileAnalyticsOpen && (
                        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                          <Link href={item.href} onClick={onNavigate} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors", isItemActive(item.href, pathname) && !isOnAnalyticsSub ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                            {item.icon}<span>Dashboard</span>
                          </Link>
                          {analyticsSubItems.map((sub) => (
                            <Link key={sub.href} href={sub.href} onClick={onNavigate} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors", isItemActive(sub.href, pathname) ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                              {sub.icon}<span>{sub.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return <ExpandedNavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />;
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t space-y-1">
        <ThemeSwitcher collapsed={false} />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );
}

// ─── Desktop Sidebar Inner ────────────────────────────────────────────────

function DesktopSidebarInner() {
  const { showClientList, rolePrefix } = useNavConfig();

  // ── State for roles WITH client list (ADMIN, EDITOR) ──
  // sidebarMode: "clients"   = IconBar(64px) + ClientPanel(220px)
  // sidebarMode: "tools"     = IconBar(200px) + ClientPanelCollapsed(48px)
  // sidebarMode: "collapsed" = IconBar(64px) only, no ClientPanel
  // Initialize with defaults to avoid hydration mismatch, then sync from localStorage
  const [sidebarMode, setSidebarMode] = useState<"clients" | "tools" | "collapsed">("clients");

  // ── State for roles WITHOUT client list (CLIENTE, SUPER_ADMIN, etc.) ──
  // iconbarExpanded: whether the single IconBar is expanded or collapsed
  const [iconbarExpanded, setIconbarExpanded] = useState<boolean>(false);

  // Sync from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const storedMode = readLocalStorage("isysocial-sidebar-mode", "clients") as "clients" | "tools" | "collapsed";
    setSidebarMode(storedMode);
    const storedExpanded = readLocalStorage("isysocial-iconbar-expanded", "false") === "true";
    setIconbarExpanded(storedExpanded);
  }, []);

  // Toggle between clients ↔ tools
  const toggleSidebarMode = useCallback(() => {
    setSidebarMode((prev) => {
      // From collapsed, restore last used mode
      if (prev === "collapsed") {
        const lastMode = readLocalStorage("isysocial-sidebar-last-mode", "clients") as "clients" | "tools";
        writeLocalStorage("isysocial-sidebar-mode", lastMode);
        return lastMode;
      }
      const next = prev === "clients" ? "tools" : "clients";
      writeLocalStorage("isysocial-sidebar-mode", next);
      writeLocalStorage("isysocial-sidebar-last-mode", next);
      return next;
    });
  }, []);

  // Collapse all (both columns → single icon bar)
  const collapseAll = useCallback(() => {
    setSidebarMode((prev) => {
      if (prev !== "collapsed") {
        writeLocalStorage("isysocial-sidebar-last-mode", prev);
      }
      writeLocalStorage("isysocial-sidebar-mode", "collapsed");
      return "collapsed";
    });
  }, []);

  // Persist iconbar expanded
  const toggleIconbarExpanded = useCallback(() => {
    setIconbarExpanded((prev) => {
      const next = !prev;
      writeLocalStorage("isysocial-iconbar-expanded", String(next));
      return next;
    });
  }, []);

  if (showClientList) {
    // ADMIN / EDITOR — dual column layout (or collapsed)
    if (sidebarMode === "collapsed") {
      return (
        <aside data-tour="sidebar" className="hidden md:flex h-screen sticky top-0 transition-all duration-300">
          <IconBar
            collapsed={true}
            showClientList={true}
            sidebarMode="collapsed"
            onToggle={toggleSidebarMode}
          />
        </aside>
      );
    }

    const iconBarCollapsed = sidebarMode === "clients";
    return (
      <aside data-tour="sidebar" className="hidden md:flex h-screen sticky top-0 transition-all duration-300">
        <IconBar
          collapsed={iconBarCollapsed}
          showClientList={true}
          sidebarMode={sidebarMode}
          onToggle={toggleSidebarMode}
          onCollapseAll={collapseAll}
        />
        {sidebarMode === "clients" ? (
          <ClientPanel
            rolePrefix={rolePrefix}
            onClose={toggleSidebarMode}
          />
        ) : (
          <ClientPanelCollapsed
            onExpand={toggleSidebarMode}
          />
        )}
      </aside>
    );
  }

  // Non-client roles — single column, expand/collapse
  return (
    <aside data-tour="sidebar" className="hidden md:flex h-screen sticky top-0 transition-all duration-300">
      <IconBar
        collapsed={!iconbarExpanded}
        showClientList={false}
        sidebarMode="clients"
        onToggle={toggleIconbarExpanded}
      />
    </aside>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <Suspense fallback={null}>
      <DesktopSidebarInner />
    </Suspense>
  );
}

// Export for mobile sidebar in sidebar-context.tsx
export { MobileSidebarContent };
