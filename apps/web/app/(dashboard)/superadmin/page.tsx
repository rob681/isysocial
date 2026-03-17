"use client";

import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  FileImage,
  TrendingUp,
  ArrowRight,
  Globe,
  Activity,
} from "lucide-react";
import Link from "next/link";

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  loading,
  colorClass,
  subtitle,
}: {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  loading: boolean;
  colorClass: string;
  subtitle?: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-1">{value ?? 0}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClass}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Plan Tier Badge ──────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  pro: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  enterprise: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <Badge className={`text-xs font-medium ${PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const { data, isLoading } = trpc.platform.overview.useQuery();

  return (
    <div className="flex-1 overflow-auto">
      <Topbar title="Plataforma" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Agencias"
            value={data?.totalAgencies}
            icon={<Building2 className="h-5 w-5 text-blue-600" />}
            loading={isLoading}
            colorClass="bg-blue-50 dark:bg-blue-950"
            subtitle={data ? `${data.activeAgencies} activas` : undefined}
          />
          <StatCard
            title="Usuarios"
            value={data?.totalUsers}
            icon={<Users className="h-5 w-5 text-emerald-600" />}
            loading={isLoading}
            colorClass="bg-emerald-50 dark:bg-emerald-950"
          />
          <StatCard
            title="Posts Totales"
            value={data?.totalPosts}
            icon={<FileImage className="h-5 w-5 text-purple-600" />}
            loading={isLoading}
            colorClass="bg-purple-50 dark:bg-purple-950"
          />
          <StatCard
            title="Publicados este mes"
            value={data?.publishedThisMonth}
            icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
            loading={isLoading}
            colorClass="bg-orange-50 dark:bg-orange-950"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Agencies */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">
                  Agencias Recientes
                </CardTitle>
                <Link href="/superadmin/agencias">
                  <Button variant="ghost" size="sm" className="gap-1">
                    Ver todas <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : data?.recentAgencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No hay agencias registradas
                  </p>
                ) : (
                  <div className="divide-y">
                    {data?.recentAgencies.map((agency) => (
                      <Link
                        key={agency.id}
                        href={`/superadmin/agencias?detail=${agency.id}`}
                        className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{agency.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {agency._count.users} usuarios · {agency._count.posts} posts
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PlanBadge plan={agency.planTier} />
                          {!agency.isActive && (
                            <Badge variant="destructive" className="text-xs">
                              Inactiva
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/superadmin/agencias" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Gestionar Agencias
                  </Button>
                </Link>
                <Link href="/superadmin/staff" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Gestionar Staff
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Platform health summary */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Agencias activas</span>
                      <span className="font-medium">
                        {data?.activeAgencies ?? 0} / {data?.totalAgencies ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Posts totales</span>
                      <span className="font-medium">{data?.totalPosts ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Publicados (mes)</span>
                      <span className="font-medium">{data?.publishedThisMonth ?? 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
