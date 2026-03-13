"use client";

import { IdeaDetail } from "@/components/ideas/idea-detail";

export default function ClienteIdeaDetailPage() {
  return (
    <IdeaDetail
      basePath="/cliente/ideas"
      canEdit={false}
      canConvert={false}
      canDelete={false}
      canUploadMedia={true}
    />
  );
}
