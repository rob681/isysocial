"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";

interface PendingPage {
  id: string;
  name: string;
  picture: string | null;
  igId: string | null;
  igUsername: string | null;
  igProfilePic: string | null;
  type?: string | null; // "person" | "org" for LinkedIn
}

export default function SeleccionarPaginaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const network = searchParams.get("network") ?? "facebook";
  const token = searchParams.get("token") ?? "";

  const [pages, setPages] = useState<PendingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  const isInstagram = network === "instagram";
  const isLinkedIn = network === "linkedin";
  const networkLabel = isInstagram ? "Instagram" : isLinkedIn ? "LinkedIn" : "Facebook";

  useEffect(() => {
    async function fetchPages() {
      if (!token) {
        setError("No hay datos de OAuth pendientes. El enlace puede haber expirado.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/social/pending-pages?token=${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Error al cargar las páginas.");
        }
        const data = await res.json();
        setPages(data.pages ?? []);
      } catch (err: any) {
        setError(err.message ?? "Error desconocido.");
      } finally {
        setLoading(false);
      }
    }
    fetchPages();
  }, [token]);

  async function handleSelect(pageId: string) {
    setSelecting(pageId);
    try {
      const res = await fetch("/api/social/finalize-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, token }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar la selección.");
      }
      router.push(`/admin/clientes/${clientId}?tab=redes&connected=${network}`);
    } catch (err: any) {
      setError(err.message ?? "Error desconocido.");
      setSelecting(null);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={`Seleccionar página de ${networkLabel}`} />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/admin/clientes/${clientId}?tab=redes`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                Seleccionar página de {networkLabel}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isInstagram
                  ? "Tu cuenta de Facebook tiene varias páginas con Instagram Business. Elige cuál conectar."
                  : isLinkedIn
                  ? "Tu cuenta de LinkedIn tiene páginas de empresa. Elige cuál conectar a este cliente."
                  : "Tu cuenta de Facebook tiene varias páginas. Elige cuál conectar a este cliente."}
              </p>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="py-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No pages */}
          {!loading && !error && pages.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No se encontraron páginas disponibles. El enlace puede haber expirado.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/admin/clientes/${clientId}?tab=redes`)}
                >
                  Volver al cliente
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Page cards */}
          {!loading && !error && pages.length > 0 && (
            <div className="space-y-3">
              {pages.map((page) => {
                const isSelecting = selecting === page.id;
                const avatarUrl = isInstagram
                  ? page.igProfilePic ?? page.picture
                  : page.picture;
                const displayName = isInstagram
                  ? `@${page.igUsername}`
                  : page.name;
                const subtitle = isInstagram
                  ? `Página: ${page.name}`
                  : isLinkedIn
                  ? page.type === "org"
                    ? "Página de empresa"
                    : "Perfil personal"
                  : `ID: ${page.id}`;

                return (
                  <Card
                    key={page.id}
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-md ${
                      isSelecting ? "ring-2 ring-primary" : ""
                    } ${selecting && !isSelecting ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => !selecting && handleSelect(page.id)}
                  >
                    <CardContent className="py-4 flex items-center gap-4">
                      {/* Avatar */}
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-12 h-12 rounded-lg object-cover border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">
                            {isInstagram ? "📸" : isLinkedIn ? (page.type === "org" ? "🏢" : "👤") : "🟦"}
                          </span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {subtitle}
                        </p>
                      </div>

                      {/* Action */}
                      <div className="flex-shrink-0">
                        {isSelecting ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-primary hover:text-white transition-colors"
                          >
                            Seleccionar
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Expiration note */}
          {!loading && !error && pages.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Este enlace expira en 10 minutos. Si expira, vuelve a conectar la red social.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
