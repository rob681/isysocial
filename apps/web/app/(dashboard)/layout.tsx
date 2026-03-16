import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { NotificationListener } from "@/components/layout/notification-listener";
import { FCMRegister } from "@/components/layout/fcm-register";
import { TourProvider } from "@/components/tour/tour-provider";
import "@/components/tour/tour-styles.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
      <NotificationListener />
      <FCMRegister />
      <TourProvider />
    </SidebarProvider>
  );
}
