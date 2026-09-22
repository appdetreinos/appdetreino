import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Devolvendo a Sidebar, mas mantendo a simplicidade
  return (
    <SidebarProvider>
      <AppSidebar role="trainer" />
      <SidebarInset className="bg-background">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
