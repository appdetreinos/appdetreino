"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar role="trainer" />
      <SidebarInset className="bg-background">{children}</SidebarInset>
    </SidebarProvider>
  );
}