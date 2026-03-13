"use client";

import { IdeaDetail } from "@/components/ideas/idea-detail";

export default function AdminIdeaDetailPage() {
  return (
    <IdeaDetail
      basePath="/admin/ideas"
      canEdit
      canConvert
      canDelete
    />
  );
}
