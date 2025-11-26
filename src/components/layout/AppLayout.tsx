import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
type AppLayoutProps = {
  children: React.ReactNode;
};
export function AppLayout({ children }: AppLayoutProps): JSX.Element {
  const location = useLocation();
  const isRoomView = location.pathname.startsWith('/rooms/');
  return (
    <SidebarProvider>
      <div className={cn("flex h-screen bg-background", isRoomView && "overflow-hidden")}>
        <AppSidebar />
        <SidebarInset className={cn("flex-1", isRoomView ? "flex flex-col" : "overflow-y-auto")}>
          <div className="absolute left-2 top-2 z-20 md:hidden">
            <SidebarTrigger />
          </div>
          <div className={cn(isRoomView && "flex-1 flex flex-col overflow-hidden")}>
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}