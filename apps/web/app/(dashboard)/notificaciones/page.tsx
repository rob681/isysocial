"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  MessageCircle,
  MessageSquare,
  Calendar,
  Lightbulb,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

/* ─── Type → Icon/Color Mapping ──────────────────────────────────── */
const NOTIF_ICON_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  POST_SUBMITTED_FOR_REVIEW: {
    icon: <Send className="h-4 w-4" />,
    color: "text-blue-500 bg-blue-500/10",
  },
  POST_APPROVED: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-green-500 bg-green-500/10",
  },
  POST_CHANGES_REQUESTED: {
    icon: <RefreshCw className="h-4 w-4" />,
    color: "text-orange-500 bg-orange-500/10",
  },
  POST_REVISION_LIMIT_REACHED: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-500 bg-red-500/10",
  },
  NEW_POST_COMMENT: {
    icon: <MessageCircle className="h-4 w-4" />,
    color: "text-purple-500 bg-purple-500/10",
  },
  NEW_IDEA_COMMENT: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-indigo-500 bg-indigo-500/10",
  },
  POST_SCHEDULED: {
    icon: <Calendar className="h-4 w-4" />,
    color: "text-cyan-500 bg-cyan-500/10",
  },
  IDEA_CONVERTED_TO_POST: {
    icon: <Lightbulb className="h-4 w-4" />,
    color: "text-yellow-500 bg-yellow-500/10",
  },
};

function getNotifIconData(type: string) {
  return (
    NOTIF_ICON_MAP[type] ?? {
      icon: <Bell className="h-4 w-4" />,
      color: "text-muted-foreground bg-muted",
    }
  );
}

function getRolePrefix(role: string | undefined): string {
  switch (role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    case "EDITOR":
      return "/editor";
    case "CLIENTE":
      return "/cliente";
    default:
      return "/admin";
  }
}

function getRelatedLink(relatedType: string | null, relatedId: string | null, rolePrefix: string): string | null {
  if (!relatedType || !relatedId) return null;
  if (relatedType === "POST") return `${rolePrefix}/contenido/${relatedId}`;
  if (relatedType === "IDEA") return `${rolePrefix}/ideas/${relatedId}`;
  return null;
}

/* ─── Page ────────────────────────────────────────────────────────── */
const PAGE_SIZE = 20;

export default function NotificacionesPage() {
  const [page, setPage] = useState(1);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const rolePrefix = getRolePrefix(role);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.notifications.list.useQuery(
    { limit: PAGE_SIZE, page },
    { refetchInterval: 30000 }
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  // Auto-mark all as read when page loads (like Isytask)
  useEffect(() => {
    if (data && data.unreadCount > 0) {
      markAllReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.unreadCount]);

  const notifications = data?.notifications ?? [];
  const totalPages = data?.pages ?? 1;
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Notificaciones" />
      <main className="flex-1 p-4 md:p-6 space-y-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Notificaciones</h1>
              <p className="text-sm text-muted-foreground">
                {total > 0
                  ? `${total} notificacion${total !== 1 ? "es" : ""}`
                  : "Sin notificaciones"}
                {unreadCount > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    ({unreadCount} sin leer)
                  </span>
                )}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isLoading}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          /* Empty */
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-lg font-medium text-muted-foreground">
                No tienes notificaciones
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Aquí verás las actualizaciones sobre tu contenido
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Notification List */
          <Card>
            <CardContent className="p-0 divide-y">
              {notifications.map((notif) => {
                const { icon, color } = getNotifIconData(notif.type);
                const link = getRelatedLink(notif.relatedType, notif.relatedId, rolePrefix);

                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-4 transition-colors ${
                      !notif.isRead ? "bg-primary/5" : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${color}`}
                    >
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${
                              !notif.isRead ? "font-semibold" : "font-medium"
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {formatDistanceToNow(new Date(notif.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notif.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Marcar como leída"
                              onClick={() => markReadMutation.mutate({ id: notif.id })}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {link && (
                            <Link href={link}>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <span className="mt-2 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
