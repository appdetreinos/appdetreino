import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Plus,
  ArrowUpRight,
  CalendarCheck2,
  Receipt,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerDashboard() {
  try {
    return await TrainerDashboardInner();
  } catch (err) {
    console.error("[CRITICAL DASHBOARD ERROR]:", err);
    return <DashboardDegraded />;
  }
}

function DashboardDegraded() {
  return (
    <div className="min-h-screen p-6">
      <Card className="border-red-500 p-6">
        <h2 className="text-lg font-bold text-red-500">Erro Crítico</h2>
        <p>Não conseguimos carregar o painel. Verifique os logs da Vercel.</p>
      </Card>
    </div>
  );
}

async function TrainerDashboardInner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const userId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const firstName = (profile?.full_name ?? user.email ?? "treinador").split(" ")[0];

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">Bom dia, <span className="text-primary">{firstName}</span> 🔥</h1>
            <p className="text-xs text-foreground/65">Estabilidade Máxima Ativada</p>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/app/students/new" className="font-semibold">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Novo aluno</span>
            </ButtonLink>
            <div className="sm:hidden">
              <LogoutButton variant="ghost" label="" />
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Card className="bg-card border-white/10 p-6">
          <h2 className="text-lg font-bold mb-4">Atalhos Rápidos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Atalho icon={UserPlus} label="Novo aluno" href="/app/students/new" />
            <Atalho icon={CalendarCheck2} label="Mandar treino" href="/app/workouts" />
            <Atalho icon={Receipt} label="Cobrar atrasado" href="/app/finance" />
            <Atalho icon={MessageCircle} label="Conectar WhatsApp" href="/app/whatsapp" />
          </div>
        </Card>
        
        <div className="p-10 text-center border-2 border-dashed border-white/10 rounded-xl">
          <p className="text-muted-foreground">
            Sua página foi simplificada para resolver o erro de carregamento.<br/>
            Agora vamos religar as funcionalidades uma a uma.
          </p>
        </div>
      </div>
    </div>
  );
}

function Atalho({ icon: Icon, label, href }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-background/50 px-3.5 py-3 text-sm hover:border-primary/40 transition-colors"
    >
      <Icon className="size-4 text-foreground/70" />
      <span className="flex-1">{label}</span>
      <ArrowUpRight className="size-4 text-foreground/60" />
    </Link>
  );
}
