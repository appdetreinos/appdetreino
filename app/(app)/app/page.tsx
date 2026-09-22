import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

/**
 * VERSÃO DE DIAGNÓSTICO v2 (2026-09-22)
 *
 * v1 (DIAG-MIN) funcionou — então o problema é em algum componente
 * client do page.tsx original. Esta versão adiciona progressivamente:
 *  v2: apenas lucide-react icons + Card do shadcn (sem motion)
 *  v3: Sparkline (motion/react)
 *  v4: Stagger + StaggerItem (motion/react)
 *  v5: AnimatedNumber (motion/react)
 *  v6: ProgressRing
 *  v7: DashboardEntrance (client)
 *  v8: OnboardingChecklist (client)
 *
 * Build tag: DIAG-V2-2026-09-22T13:40
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  Plus,
  ArrowUpRight,
  Users,
  Wallet,
  CalendarDays,
  Flame,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

export default async function TrainerDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const buildTag = "DIAG-V2-2026-09-22T13:40";

  if (!user) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h1>Sem user ({buildTag})</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold truncate">Painel ({buildTag})</h1>
          <ButtonLink href="/app/students/new" className="font-semibold">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Novo aluno</span>
          </ButtonLink>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold">v2: lucide + Card</h2>
          <p className="mt-2 text-sm">
            Se você vê esta página, lucide-react e Card funcionam.
            Próximo teste (v3) vai adicionar Sparkline (motion/react).
          </p>
          <div className="mt-4 flex gap-4">
            <Users className="size-6" />
            <Wallet className="size-6" />
            <CalendarDays className="size-6" />
            <Flame className="size-6" />
            <ArrowUpRight className="size-6" />
          </div>
        </Card>
      </main>
    </div>
  );
}
