"use client";

import { Suspense } from "react";
import { IdeaDetail } from "@/components/ideas/idea-detail";
import { Topbar } from "@/components/layout/topbar";

export default function AdminIdeaDetailPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Detalle de idea" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <Suspense>
          <IdeaDetail
            basePath="/admin/ideas"
            canEdit
            canConvert
            canDelete
          />
        </Suspense>
      </main>
    </div>
  );
}
