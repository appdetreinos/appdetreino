import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import { PLANS, formatBRL } from "@/lib/types/billing";
import { createClient } from "@/lib/supabase/server";
import { getTrainerTrialState } from "@/lib/billing/trial";
import { CancelSubscriptionButton } from "../cancel-subscription-button";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trainer } = user
    ? await supabase
        .from("trainer_profiles")
        .select("plan_tier, trial_ends_at")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const currentTier = trainer?.plan_tier ?? "start";

  let hasPaid = false;
  try {
    if (user) hasPaid = (await getTrainerTrialState(user.id)).hasPaid;
  } catch {
    // sem travar a página
  }

  const { data: activeSub } = user
    ? await supabase
        .from("payment_links")
        .select("id")
        .eq("trainer_id", user.id)
        .like("description", "Plano %assinatura%")
        .not("paid_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
          <h1 className="text-xl font-bold">Escolher plano</h1>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <Badge className="bg-primary/15 text-primary border-primary/30">
            🔥 3 dias grátis pra testar
          </Badge>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
            Quanto mais alunos, menor o custo por aluno
          </h2>
          <p className="mt-2 text-muted-foreground">
            Cancela em 1 clique. Sem fidelidade. A gente cobra só do trainer — aluno
            nunca passa por aqui.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const isCurrent = p.id === currentTier;
            return (
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
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="num text-3xl font-extrabold">
                      {formatBRL(p.priceMonthly)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.studentLimit
                      ? `Até ${p.studentLimit} alunos ativos`
                      : "Alunos ilimitados"}
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

                {isCurrent ? (
                  hasPaid ? (
                    <div className="mt-6 rounded-md border border-white/10 bg-background/40 px-3 py-2 text-center text-sm font-semibold text-foreground/70">
                      Plano atual
                    </div>
                  ) : (
                    <ButtonLink
                      href={`/app/checkout?plan=${p.id}`}
                      variant={p.highlight ? "default" : "outline"}
                      className="mt-6 font-bold"
                    >
                      Assinar {p.name}
                    </ButtonLink>
                  )
                ) : (
                  <ButtonLink
                    href={`/app/checkout?plan=${p.id}`}
                    variant={p.highlight ? "default" : "outline"}
                    className="mt-6 font-bold"
                  >
                    {p.cta}
                  </ButtonLink>
                )}
              </Card>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Pagamento processado pelo Mercado Pago. Pix, cartão ou boleto — você
          escolhe na hora.
        </p>

        {activeSub && (
          <div className="mt-4 text-center">
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 mb-2">
              Assinatura ativa no cartão
            </Badge>
            <div>
              <CancelSubscriptionButton />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
