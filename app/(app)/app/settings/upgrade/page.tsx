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

  const trialEnd = trainer?.trial_ends_at ? new Date(trainer.trial_ends_at) : null;
  const inTrial = trialEnd ? trialEnd > new Date() : false;

  // Último pagamento de plano (pra mostrar "ativo desde") + assinatura no cartão
  const [{ data: activeSub }, { data: lastPlanPay }] = user
    ? await Promise.all([
        supabase
          .from("payment_links")
          .select("id, paid_at")
          .eq("trainer_id", user.id)
          .like("description", "Plano %assinatura%")
          .not("paid_at", "is", null)
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("payment_links")
          .select("paid_at, description")
          .eq("trainer_id", user.id)
          .like("description", "Plano %")
          .not("paid_at", "is", null)
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  const planName = PLANS.find((p) => p.id === currentTier)?.name ?? currentTier;
  const since = (lastPlanPay as { paid_at?: string } | null)?.paid_at;

  // Ciclo de 30 dias a partir do último pagamento
  const CYCLE_DAYS = 30;
  let cyclePct = 0;
  let cycleLabel: string | null = null;
  if (hasPaid && since) {
    const start = new Date(since).getTime();
    const end = start + CYCLE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const elapsed = Math.min(Math.max(now - start, 0), end - start);
    cyclePct = Math.round((elapsed / (end - start)) * 100);
    const daysLeft = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
    cycleLabel = activeSub
      ? `Renova sozinho em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`
      : daysLeft > 0
        ? `Válido por mais ${daysLeft} dia${daysLeft === 1 ? "" : "s"} (até ${new Date(end).toLocaleDateString("pt-BR")})`
        : "Ciclo vencido — renove abaixo";
  }

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
        {/* Status da assinatura */}
        <Card
          className={`max-w-2xl mx-auto mb-8 p-5 flex flex-col sm:flex-row sm:items-center gap-3 ${
            hasPaid
              ? "bg-emerald-500/10 border-emerald-500/30"
              : inTrial
                ? "bg-primary/10 border-primary/30"
                : "bg-card/80 border-white/10"
          }`}
        >
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Sua assinatura
            </div>
            <div className="mt-1 text-xl font-extrabold">
              {hasPaid ? (
                <>Plano {planName} · ativo ✅</>
              ) : inTrial ? (
                <>Trial grátis · {planName}</>
              ) : (
                <>Plano {planName}</>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {hasPaid && since
                ? `Ativo desde ${new Date(since).toLocaleDateString("pt-BR")} · ${
                    activeSub ? "renova sozinho todo mês no cartão" : "renovação manual a cada ciclo"
                  }`
                : hasPaid
                  ? "Assinatura ativa. Troque de plano abaixo se quiser."
                  : inTrial
                    ? "Explore tudo. Sem cartão, sem cobrança."
                    : "Escolhe um plano abaixo pra ativar."}
            </div>
          </div>
          {activeSub ? (
            <div className="shrink-0 flex flex-col items-stretch gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 justify-center">
                Renovação automática
              </Badge>
              <CancelSubscriptionButton />
            </div>
          ) : hasPaid ? (
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 shrink-0">
              Pagamento confirmado
            </Badge>
          ) : null}
        </Card>

        {hasPaid && cycleLabel && (
          <Card className="max-w-2xl mx-auto mb-8 p-5 bg-card/80 border-white/10">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">Ciclo atual</span>
              <span className="text-xs text-muted-foreground">{cycleLabel}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all"
                style={{ width: `${cyclePct}%` }}
              />
            </div>
          </Card>
        )}

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
                  {/* Preços de teste (R$1) ficam ocultos; reais aparecem sozinhos */}
                  {p.priceMonthly >= 10 && (
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="num text-3xl font-extrabold">
                        {formatBRL(p.priceMonthly)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                  )}
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
      </main>
    </div>
  );
}
