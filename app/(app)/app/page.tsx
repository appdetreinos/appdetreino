import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrainerDashboard() {
  // REMOVEMOS TUDO. SEM SUPABASE. SEM QUERIES. SEM NADA.
  // Se isso crashar, o erro está no LAYOUT ou no PROXY.
  
  return (
    <div className="min-h-screen p-6 bg-slate-900 text-white">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">TESTE DE ISOLAMENTO TOTAL 🚨</h1>
        <div className="flex gap-2">
           <ButtonLink href="/app/students/new" className="font-semibold bg-blue-600 text-white p-2 rounded">
            <Plus className="size-4 inline mr-1" /> Novo aluno
          </ButtonLink>
          <LogoutButton variant="ghost" label="" />
        </div>
      </header>

      <div className="space-y-4">
        <Card className="p-6 bg-white text-black border-4 border-red-600">
          <h2 className="text-xl font-bold mb-2">SE VOCÊ ESTÁ VENDO ISSO:</h2>
          <p className="text-lg">
            O problema NÃO está na página <code>/app/page.tsx</code>.
          </p>
          <p className="text-lg font-bold mt-4">
            O erro está no <code>proxy.ts</code> ou no <code>layout.tsx</code>.
          </p>
        </Card>
        
        <div className="p-4 bg-slate-800 rounded border border-slate-700">
          <p className="text-sm opacity-70">
            Nenhuma query ao banco de dados foi feita nesta versão.
          </p>
        </div>
      </div>
    </div>
  );
}
