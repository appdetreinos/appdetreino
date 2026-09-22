import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // REMOVIDO: Toda a lógica de Auth e Trial para isolar o crash
  return (
    <SidebarProvider>
      <AppSidebar role="trainer" />
      <SidebarInset className="bg-background">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
