"use client";

import { IdeaForm } from "@/components/ideas/idea-form";
import { Topbar } from "@/components/layout/topbar";

export default function AdminNuevaIdeaPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Nueva idea" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <IdeaForm redirectPath="/admin/ideas" />
      </main>
    </div>
  );
}
