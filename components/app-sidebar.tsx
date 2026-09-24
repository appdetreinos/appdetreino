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
  FileText,
  Briefcase,
  Store,
  CreditCard,
  Inbox,
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

const trainerGroups: Array<{ label: string; items: MenuItem[] }> = [
  {
    label: "Principal",
    items: [
      { title: "Visão geral", url: "/app", icon: LayoutDashboard },
      { title: "Alunos", url: "/app/students", icon: Users },
    ],
  },
  {
    label: "Treino e dieta",
    items: [
      { title: "Treinos", url: "/app/workouts", icon: Dumbbell },
      { title: "Histórico", url: "/app/workouts/historico", icon: History },
      { title: "Dietas", url: "/app/diets", icon: Salad },
      { title: "WOD", url: "/app/wod", icon: Flame },
      { title: "Hábitos", url: "/app/habitos", icon: CheckSquare },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Agenda", url: "/app/agenda", icon: Calendar },
      { title: "Avaliações", url: "/app/evaluations", icon: ClipboardList },
      { title: "Anamnese", url: "/app/anamnese", icon: FileText },
      { title: "Financeiro", url: "/app/finance", icon: Wallet },
    ],
  },
  {
    label: "Engajamento",
    items: [
      { title: "WhatsApp", url: "/app/whatsapp", icon: MessageCircle, badge: "novo" },
      { title: "Comunidade", url: "/app/community", icon: Trophy },
      { title: "Mensagens", url: "/app/mensagens", icon: Inbox },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Equipe", url: "/app/equipe", icon: Briefcase, badge: "top" },
      { title: "Vitrine", url: "/app/marketplace", icon: Store },
    ],
  },
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

  const renderItems = (items: MenuItem[]) => (
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
  );

  if (role === "admin") {
    return (
      <Sidebar>
        <SidebarHeader className="border-b border-white/5">
          <Link href="/app" className="px-3 py-2 inline-flex items-center gap-2">
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
            <SidebarGroupLabel>Viva FIT APP</SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(adminMenu)}</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/5">
          <SidebarMenu>
            <SidebarMenuItem>
              <LogoutButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-white/5">
        <Link href="/app" className="px-3 py-2 inline-flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground font-extrabold text-sm">
            pf
          </span>
          <span className="font-extrabold">
            Viva <span className="text-primary">Fit</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {trainerGroups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(g.items)}</SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/app/settings/upgrade" />}>
              <CreditCard className="size-4" />
              <span>Planos</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
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