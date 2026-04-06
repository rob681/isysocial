"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IdeaForm } from "@/components/ideas/idea-form";
import { Topbar } from "@/components/layout/topbar";

function AdminNuevaIdeaPageInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;

  const redirectPath = clientId
    ? `/admin/ideas?clientId=${clientId}`
    : "/admin/ideas";

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Nueva idea" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <IdeaForm redirectPath={redirectPath} initialClientId={clientId} />
      </main>
    </div>
  );
}

export default function AdminNuevaIdeaPage() {
  return (
    <Suspense>
      <AdminNuevaIdeaPageInner />
    </Suspense>
  );
}
