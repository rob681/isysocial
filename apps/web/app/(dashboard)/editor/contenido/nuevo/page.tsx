"use client";

import { PostEditor } from "@/components/post-editor/post-editor";
import { Topbar } from "@/components/layout/topbar";

export default function EditorNuevoPostPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Nueva publicación" />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-6xl mx-auto">
          <PostEditor />
        </div>
      </main>
    </div>
  );
}
