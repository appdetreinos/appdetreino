import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerDashboard() {
  // MODO DE SOBREVIVÊNCIA: ZERO SUPABASE. 
  // Se isso crashar, o erro está 100% no layout.tsx ou proxy.ts.
  
  return (
    <div className="min-h-screen p-6 bg-black text-white">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-red-500">DEBUG FINAL 🚨</h1>
        <div className="flex gap-2">
           <ButtonLink href="/app/students/new" className="bg-white text-black p-2 rounded">
            <Plus className="size-4 inline mr-1" /> Novo aluno
          </ButtonLink>
          <LogoutButton variant="ghost" label="" />
        </div>
      </header>

      <div className="space-y-6">
        <Card className="p-6 bg-white text-black border-4 border-red-600">
          <h2 className="text-xl font-bold mb-2">ISOLAMENTO TOTAL</h2>
          <p className="text-lg">
            Se você está vendo isso, a página <b>Page.tsx</b> está funcionando.
          </p>
        </Card>
        
        <div className="p-4 bg-zinc-900 rounded border border-zinc-800">
          <p className="text-sm text-zinc-400">
            Status: Sem queries ao banco. Sem hooks. Sem components complexos.
          </p>
        </div>
      </div>
    </div>
  );
}
