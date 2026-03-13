"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MobileSidebarContent } from "./sidebar";

interface SidebarContextValue {
  openMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  openMobile: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarContext.Provider value={{ openMobile }}>
      {children}

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <div className="flex flex-col h-full">
            <MobileSidebarContent onNavigate={closeMobile} />
          </div>
        </SheetContent>
      </Sheet>
    </SidebarContext.Provider>
  );
}
