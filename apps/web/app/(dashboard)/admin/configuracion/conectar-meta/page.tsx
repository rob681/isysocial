"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, Facebook, Instagram } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { Topbar } from "@/components/layout/topbar";

interface PendingAccount {
  id: string;
  name: string;
  network: "FACEBOOK" | "INSTAGRAM";
  accessToken: string;
  profilePic: string | null;
  tokenExpiresAt: string | null;
  linkedPageId?: string;
}

interface PendingData {
  agencyId: string;
  accounts: PendingAccount[];
  timestamp: number;
}

function ConectarMetaContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingData, setPendingData] = useState<PendingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectAndConnect = trpc.agencies.selectAndConnectPages.useMutation({
    onSuccess: (data) => {
      toast({
        title: "¡Éxito!",
        description: `${data.connected} cuenta(s) conectada(s) correctamente`,
        variant: "default",
      });
      // Clear cookie by redirecting with delay
      setTimeout(() => {
        router.push("/admin/configuracion?social=success");
      }, 1000);
    },
    onError: (err) => {
      setError(err.message || "Error al conectar cuentas");
      toast({
        title: "Error",
        description: err.message || "No se pudieron conectar las cuentas",
        variant: "destructive",
      });
    },
  });

  // Try to read pending accounts from cookie (client-side)
  useEffect(() => {
    // Since we can't directly read HTTP-only cookies from client,
    // we need to use a route handler to extract it
    const fetchPendingAccounts = async () => {
      try {
        const response = await fetch("/api/social/meta/pending-accounts");
        if (!response.ok) {
          if (response.status === 404) {
            setError(
              "No hay cuentas pendientes. Intenta conectar Meta nuevamente."
            );
          } else {
            setError("Error al cargar las cuentas");
          }
          setLoading(false);
          return;
        }

        const data = (await response.json()) as PendingData;
        setPendingData(data);

        // Check if expired
        if (Date.now() - data.timestamp > 15 * 60 * 1000) {
          setError("La sesión ha expirado. Intenta conectar Meta nuevamente.");
          setLoading(false);
          return;
        }

        // Initialize all as selected by default
        setSelectedIds(new Set(data.accounts.map((acc) => acc.id)));
      } catch (err) {
        setError("Error al cargar las cuentas pendientes");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingAccounts();
  }, []);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (pendingData) {
      if (selectedIds.size === pendingData.accounts.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(pendingData.accounts.map((acc) => acc.id)));
      }
    }
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      setError("Debes seleccionar al menos una cuenta");
      return;
    }

    if (!pendingData) {
      setError("Datos de sesión perdidos");
      return;
    }

    selectAndConnect.mutate({
      accountIds: Array.from(selectedIds),
      accounts: pendingData.accounts,
      timestamp: pendingData.timestamp,
    });
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Conectar Meta" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="flex justify-center items-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Conectar Meta" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="space-y-4">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent className="text-red-700">{error}</CardContent>
            </Card>
            <Button onClick={() => router.push("/admin/configuracion")}>
              Volver a Configuración
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!pendingData || pendingData.accounts.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="Conectar Meta" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          <div className="space-y-4">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Sin Cuentas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-yellow-700">
                No se encontraron cuentas de Meta para conectar.
              </CardContent>
            </Card>
            <Button onClick={() => router.push("/admin/configuracion")}>
              Volver a Configuración
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isAllSelected = selectedIds.size === pendingData.accounts.length;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Conectar Meta" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="w-5 h-5 text-blue-600" />
            Seleccionar Cuentas Meta
          </CardTitle>
          <CardDescription>
            Elige qué páginas de Facebook e Instagram deseas vincular a tu agencia
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Select All / Deselect All */}
          <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
            <input
              type="checkbox"
              id="select-all"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              {isAllSelected ? "Deseleccionar todo" : "Seleccionar todo"}
            </label>
            <span className="text-xs text-slate-500">
              {selectedIds.size} de {pendingData.accounts.length}
            </span>
          </div>

          {/* Account List */}
          <div className="space-y-3">
            {pendingData.accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <input
                  type="checkbox"
                  id={account.id}
                  checked={selectedIds.has(account.id)}
                  onChange={() => handleToggle(account.id)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <div className="flex-1 flex items-center gap-3">
                  {account.profilePic && (
                    <img
                      src={account.profilePic}
                      alt={account.name}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{account.name}</div>
                    <div className="text-xs text-slate-500">{account.id}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {account.network === "FACEBOOK" && (
                      <Facebook className="w-4 h-4 text-blue-600" />
                    )}
                    {account.network === "INSTAGRAM" && (
                      <Instagram className="w-4 h-4 text-pink-600" />
                    )}
                    <span className="text-xs text-slate-500 capitalize">
                      {account.network === "FACEBOOK" ? "Facebook" : "Instagram"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={selectAndConnect.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || selectAndConnect.isPending}
              className="flex-1"
            >
              {selectAndConnect.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {selectAndConnect.isPending
                ? "Conectando..."
                : `Conectar ${selectedIds.size} cuenta(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
      </main>
    </div>
  );
}

export default function ConectarMetaPage() {
  return <ConectarMetaContent />;
}
