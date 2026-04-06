"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IdeaBoard } from "@/components/ideas/idea-board";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";

function AdminIdeasPageInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;

  const { data: clientData } = trpc.clients.get.useQuery(
    { id: clientId! },
    { enabled: !!clientId }
  );

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Ideas" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {clientId && clientData ? `Ideas — ${clientData.companyName}` : "Ideas & Blueprint"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {clientId && clientData
              ? `Ideas de contenido para ${clientData.companyName}`
              : "Planifica y organiza ideas de contenido para tus clientes"}
          </p>
        </div>

        <IdeaBoard basePath="/admin/ideas" canCreate canDrag initialClientId={clientId} />
      </main>
    </div>
  );
}

export default function AdminIdeasPage() {
  return (
    <Suspense>
      <AdminIdeasPageInner />
    </Suspense>
  );
}
