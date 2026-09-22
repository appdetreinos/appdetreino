"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Salad,
  Wallet,
  MessageCircle,
  Trophy,
  Settings,
  ClipboardList,
  Calendar,
  Flame,
  CheckSquare,
  History,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const trainerMenu: MenuItem[] = [
  { title: "Visão geral", url: "/app", icon: LayoutDashboard },
  { title: "Agenda", url: "/app/agenda", icon: Calendar },
  { title: "Alunos", url: "/app/students", icon: Users },
  { title: "Treinos", url: "/app/workouts", icon: Dumbbell },
  { title: "Histórico", url: "/app/workouts/historico", icon: History },
  { title: "Dietas", url: "/app/diets", icon: Salad },
  { title: "WOD", url: "/app/wod", icon: Flame },
  { title: "Hábitos", url: "/app/habitos", icon: CheckSquare },
  { title: "Avaliações", url: "/app/evaluations", icon: ClipboardList },
  { title: "Financeiro", url: "/app/finance", icon: Wallet },
  { title: "WhatsApp", url: "/app/whatsapp", icon: MessageCircle, badge: "novo" },
  { title: "Comunidade", url: "/app/community", icon: Trophy },
];

const adminMenu: MenuItem[] = [
  { title: "Trainers", url: "/admin/trainers", icon: Users },
  { title: "Métricas", url: "/admin/metrics", icon: LayoutDashboard },
];

interface Props {
  role: "trainer" | "admin";
}

export function AppSidebar({ role }: Props) {
  const pathname = usePathname();
  const items = role === "trainer" ? trainerMenu : adminMenu;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-white/5">
        <Link href="/" className="px-3 py-2 inline-flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground font-extrabold text-sm">
            pf
          </span>
          <span className="font-extrabold">
            Viva <span className="text-primary">Fit</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{role === "trainer" ? "Consultoria" : "Viva FIT APP"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge className="ml-auto bg-primary/20 text-primary border-primary/30 text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/app/settings" />}>
              <Settings className="size-4" />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarSeparator className="my-2 bg-white/5" />
          <SidebarMenuItem>
            <LogoutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}