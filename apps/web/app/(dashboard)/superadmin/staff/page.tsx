"use client";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Shield, User } from "lucide-react";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SuperAdminStaffPage() {
  const { data: staff, isLoading } = trpc.platform.listStaff.useQuery();

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Staff SuperAdmin" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Usuarios SuperAdmin</CardTitle>
            </div>
            <CardDescription>
              Todos los usuarios con rol SUPER_ADMIN en la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !staff || staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3 text-muted-foreground">
                <Shield className="h-10 w-10 opacity-30" />
                <p className="text-sm">No hay usuarios SuperAdmin registrados.</p>
              </div>
            ) : (
              <div className="divide-y">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    {/* Avatar placeholder */}
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>

                    {/* Status */}
                    <Badge variant={member.isActive ? "default" : "secondary"} className="shrink-0">
                      {member.isActive ? "Activo" : "Inactivo"}
                    </Badge>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      Desde {formatDate(member.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
