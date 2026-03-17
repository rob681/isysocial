"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Users,
  FileImage,
  Search,
  ChevronLeft,
  ChevronRight,
  Globe,
  ArrowLeft,
  X,
} from "lucide-react";
import Link from "next/link";

// ── Plan Badge ───────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  pro: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  enterprise: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <Badge
      className={`text-xs font-medium ${PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}
    >
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

// ── Role Labels ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  CLIENTE: "Cliente",
  SUPER_ADMIN: "Super Admin",
  SOPORTE: "Soporte",
  FACTURACION: "Facturación",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  EDITOR: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  CLIENTE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

// ── Status Labels ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  CLIENT_CHANGES: "Cambios",
  APPROVED: "Aprobado",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  PAUSED: "Pausado",
  CANCELLED: "Cancelado",
};

// ── Agency Detail Panel ──────────────────────────────────────────────────────

function AgencyDetailPanel({
  agencyId,
  onClose,
}: {
  agencyId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.platform.agencyDetail.useQuery({
    agencyId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Agencia no encontrada
        </CardContent>
      </Card>
    );
  }

  const { agency, users, postsByStatus, socialAccounts } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{agency.name}</h2>
                <PlanBadge plan={agency.planTier} />
                {!agency.isActive && (
                  <Badge variant="destructive" className="text-xs">
                    Inactiva
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Slug: {agency.slug}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Creada:{" "}
                {new Date(agency.createdAt).toLocaleDateString("es-MX", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{agency._count.users}</p>
              <p className="text-xs text-muted-foreground">Usuarios</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{agency._count.clients}</p>
              <p className="text-xs text-muted-foreground">Clientes</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{agency._count.posts}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">
                {agency._count.socialAccounts}
              </p>
              <p className="text-xs text-muted-foreground">Redes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts by Status */}
      {postsByStatus.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Posts por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {postsByStatus.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 text-sm"
                >
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[s.status] ?? s.status}:
                  </span>
                  <span className="font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Accounts */}
      {socialAccounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Cuentas Sociales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {socialAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{acc.accountName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {acc.network}
                    </Badge>
                    {!acc.isActive && (
                      <Badge variant="destructive" className="text-xs">
                        Inactiva
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Usuarios ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-xs ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                  {!user.isActive && (
                    <Badge variant="destructive" className="text-xs">
                      Inactivo
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AgenciasPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

  const { data, isLoading } = trpc.platform.listAgencies.useQuery({
    page,
    perPage: 20,
    search: search || undefined,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  if (selectedAgencyId) {
    return (
      <div className="flex-1 overflow-auto">
        <Topbar title="Detalle de Agencia" />
        <div className="p-4 md:p-6 max-w-4xl">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 gap-1"
            onClick={() => setSelectedAgencyId(null)}
          >
            <ArrowLeft className="h-4 w-4" /> Volver a lista
          </Button>
          <AgencyDetailPanel
            agencyId={selectedAgencyId}
            onClose={() => setSelectedAgencyId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Topbar title="Agencias" />

      <div className="p-4 md:p-6 space-y-4">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar agencia..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm">
            Buscar
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
            >
              Limpiar
            </Button>
          )}
        </form>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.agencies.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No se encontraron agencias</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Plan
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Usuarios
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Clientes
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Posts
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Redes
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Creada
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.agencies.map((agency) => (
                      <tr
                        key={agency.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedAgencyId(agency.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {agency.logoUrl ? (
                                <img
                                  src={agency.logoUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <Building2 className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{agency.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {agency.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <PlanBadge plan={agency.planTier} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          {agency._count.users}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {agency._count.clients}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {agency._count.posts}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {agency._count.socialAccounts}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(agency.createdAt).toLocaleDateString(
                            "es-MX",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {agency.isActive ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-xs">
                              Activa
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Inactiva
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data.total} agencia{data.total !== 1 ? "s" : ""} en total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
