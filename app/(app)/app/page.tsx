import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerDashboard() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return <div>Não autenticado</div>;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const firstName = (profile?.full_name ?? user.email ?? "Treinador").split(" ")[0];

    return (
      <div className="min-h-screen p-6">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Olá, {firstName}! 👋</h1>
          <div className="flex gap-2">
             <ButtonLink href="/app/students/new" className="font-semibold">
              <Plus className="size-4" /> Novo aluno
            </ButtonLink>
            <LogoutButton variant="ghost" label="" />
          </div>
        </header>

        <Card className="p-6 text-center border-primary/20 bg-primary/5">
          <p className="text-lg font-medium">O painel está sendo estabilizado.</p>
          <p className="text-sm text-muted-foreground">
            Se você está vendo esta mensagem, o erro crítico foi resolvido e estamos religando as funcionalidades.
          </p>
        </Card>
      </div>
    );
  } catch (err) {
    console.error("CRASH TOTAL:", err);
    return <div className="p-10 text-red-500">Erro fatal: {String(err)}</div>;
  }
}
