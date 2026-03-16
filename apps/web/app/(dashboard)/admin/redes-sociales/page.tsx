"use client";

import { Topbar } from "@/components/layout/topbar";
import { SocialNetworksDashboard } from "@/components/social-networks/social-networks-dashboard";

export default function AdminRedesSocialesPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Redes Sociales" />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <SocialNetworksDashboard />
      </main>
    </div>
  );
}
