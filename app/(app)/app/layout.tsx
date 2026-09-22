import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TOTALMENTE ESTÁTICO - Sem SidebarProvider, Sem Sidebar
  // Se isso abrir, o erro está no SidebarProvider ou no AppSidebar (Client Side Crash)
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
