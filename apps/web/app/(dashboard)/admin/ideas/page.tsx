"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IdeaBoard } from "@/components/ideas/idea-board";
import { Topbar } from "@/components/layout/topbar";
import { trpc } from "@/lib/trpc/client";
import { Lightbulb } from "lucide-react";

function NoClientSelected() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Ideas" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Selecciona un cliente</h2>
          <p className="text-muted-foreground text-sm">
            Elige un cliente desde la barra lateral para ver y gestionar sus ideas.
          </p>
        </div>
      </main>
    </div>
  );
}

function IdeasWithClient({ clientId }: { clientId: string }) {
  const { data: clientData } = trpc.clients.get.useQuery({ id: clientId });

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Ideas" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {clientData ? `Ideas — ${clientData.companyName}` : "Ideas & Blueprint"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {clientData
              ? `Ideas de contenido para ${clientData.companyName}`
              : "Planifica y organiza ideas de contenido para tus clientes"}
          </p>
        </div>
        <IdeaBoard basePath="/admin/ideas" canCreate canDrag initialClientId={clientId} />
      </main>
    </div>
  );
}

function AdminIdeasPageInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;

  if (!clientId) return <NoClientSelected />;
  return <IdeasWithClient clientId={clientId} />;
}

export default function AdminIdeasPage() {
  return (
    <Suspense>
      <AdminIdeasPageInner />
    </Suspense>
  );
}
