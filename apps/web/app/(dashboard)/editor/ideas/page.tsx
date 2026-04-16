"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IdeaBoard } from "@/components/ideas/idea-board";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserX, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function EditorIdeasInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  function goToPrevMonth() {
    if (filterMonth === 1) {
      setFilterMonth(12);
      setFilterYear((y) => y - 1);
    } else {
      setFilterMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (filterYear === currentYear && filterMonth === currentMonth) return;
    if (filterMonth === 12) {
      setFilterMonth(1);
      setFilterYear((y) => y + 1);
    } else {
      setFilterMonth((m) => m + 1);
    }
  }

  const { data: assignmentsData } = trpc.editors.myAssignedClients.useQuery();
  const hasNoAssignments =
    assignmentsData !== undefined &&
    !assignmentsData.hasManageAll &&
    Array.isArray(assignmentsData.clients) &&
    assignmentsData.clients.length === 0;

  const clientName = clientId
    ? assignmentsData?.clients?.find((c) => c.id === clientId)?.companyName
    : undefined;

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Ideas" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {clientName ? `Ideas — ${clientName}` : "Ideas & Blueprint"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {clientName
                ? `Ideas de contenido para ${clientName}`
                : "Planifica y organiza ideas de contenido"}
            </p>
          </div>
          {/* Month navigator */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={goToPrevMonth} className="p-1 rounded hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(new Date(filterYear, filterMonth - 1), "MMMM yyyy", { locale: es })}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              disabled={filterYear === currentYear && filterMonth === currentMonth}
              className="p-1 rounded hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {hasNoAssignments ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UserX className="h-12 w-12 text-amber-400 mb-4" />
              <p className="text-lg font-semibold">Sin clientes asignados</p>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                Aún no tienes clientes asignados. Contacta al administrador para que te asigne a uno o más clientes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <IdeaBoard
            key={`${clientId ?? "all"}-${filterYear}-${filterMonth}`}
            basePath="/editor/ideas"
            canCreate
            canDrag
            initialClientId={clientId}
            filterMonth={filterMonth}
            filterYear={filterYear}
          />
        )}
      </main>
    </div>
  );
}

export default function EditorIdeasPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col flex-1">
        <Topbar title="Ideas" />
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </main>
      </div>
    }>
      <EditorIdeasInner />
    </Suspense>
  );
}
