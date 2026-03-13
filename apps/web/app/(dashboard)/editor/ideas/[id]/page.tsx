"use client";

import { IdeaDetail } from "@/components/ideas/idea-detail";

export default function EditorIdeaDetailPage() {
  return (
    <IdeaDetail
      basePath="/editor/ideas"
      canEdit
      canConvert
      canDelete
    />
  );
}
