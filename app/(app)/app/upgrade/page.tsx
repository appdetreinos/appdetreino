import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import { PLANS, formatBRL } from "@/lib/types/billing";
import { createClient } from "@/lib/supabase/server";
import { getTrainerTrialState } from "@/lib/billing/trial";

const TIERS = ["start", "pro", "top"] as const;

/**
 * Troca de plano (rota oculta — fora do menu).
 * Mostra só upgrade real: planos acima do atual.
 */
export default async function UpgradePlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: trainer } = await supabase
    .from("trainer_profiles")
    .select("plan_tier")
    .eq("user_id", user.id)
    .maybeSingle();

  const currentTier = (trainer as { plan_tier?: string } | null)?.plan_tier ?? "start";
  const currentIdx = Math.max(0, TIERS.indexOf(currentTier as (typeof TIERS)[number]));

  let hasPaid = false;
  try {
    hasPaid = (await getTrainerTrialState(user.id)).hasPaid;
  } catch {
    // sem travar
  }

  const options = PLANS.filter((p) => TIERS.indexOf(p.id) > currentIdx);

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link
            href="/app/settings/upgrade"
            className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
          <h1 className="text-xl font-bold">Fazer upgrade</h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto">
        {options.length === 0 ? (
          <Card className="bg-card/80 border-white/10 p-10 text-center">
            <div className="text-4xl">🏆</div>
            <h2 className="mt-3 text-xl font-bold">Você já está no topo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plano {currentTier} · alunos ilimitados. Nada acima pra subir.
            </p>
            <ButtonLink href="/app/settings/upgrade" variant="outline" className="mt-5">
              Voltar pra cobrança
            </ButtonLink>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Subindo agora, a diferença é proporcional e o novo limite vale na hora.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {options.map((p) => (
                <Card
                  key={p.id}
                  className={`bg-card/80 border-white/10 p-6 flex flex-col ${
                    p.highlight ? "border-primary/40 shadow-lg shadow-primary/10" : ""
                  }`}
                >
                  {p.highlight && (
                    <Badge className="self-start bg-primary text-primary-foreground">
                      Mais escolhido
                    </Badge>
                  )}
                  <div className="mt-3">
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {p.name}
                    </div>
                    {p.priceMonthly >= 10 && (
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="num text-3xl font-extrabold">{formatBRL(p.priceMonthly)}</span>
                        <span className="text-sm text-muted-foreground">/mês</span>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {p.studentLimit ? `Até ${p.studentLimit} alunos ativos` : "Alunos ilimitados"}
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2 text-sm flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="size-4 mt-0.5 text-primary shrink-0" />
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <ButtonLink
                    href={`/app/checkout?plan=${p.id}`}
                    variant={p.highlight ? "default" : "outline"}
                    className="mt-6 font-bold"
                  >
                    Fazer upgrade
                  </ButtonLink>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
