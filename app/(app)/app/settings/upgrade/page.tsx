import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Users,
  Briefcase,
  MessageCircle,
  Settings2,
  Receipt,
} from "lucide-react";
import { PLANS, formatBRL } from "@/lib/types/billing";
import { createClient } from "@/lib/supabase/server";
import { getTrainerTrialState } from "@/lib/billing/trial";
import { CancelSubscriptionButton } from "../cancel-subscription-button";

function LimitRow({
  icon: Icon,
  label,
  value,
  good,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-white/5 last:border-0">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${good ? "text-emerald-500" : ""}`}>{value}</span>
    </div>
  );
}

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

  const planName = PLANS.find((p) => p.id === currentTier)?.name ?? currentTier;  const since = (lastPlanPay as { paid_at?: string } | null)?.paid_at;

  // Ciclo de 30 dias a partir do último pagamento
  const CYCLE_DAYS = 30;
  let cyclePct = 0;
  let cycleLabel: string | null = null;
  let cycleStart: string | null = null;
  let cycleEnd: string | null = null;
  if (hasPaid && since) {
    const start = new Date(since).getTime();
    const end = start + CYCLE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const elapsed = Math.min(Math.max(now - start, 0), end - start);
    cyclePct = Math.round((elapsed / (end - start)) * 100);
    const daysLeft = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
    cycleStart = new Date(start).toLocaleDateString("pt-BR");
    cycleEnd = new Date(end).toLocaleDateString("pt-BR");
    cycleLabel = activeSub
      ? `Renova sozinho em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`
      : daysLeft > 0
        ? `Válido por mais ${daysLeft} dia${daysLeft === 1 ? "" : "s"} (até ${cycleEnd})`
        : "Ciclo vencido — renove abaixo";
  }
  const daysLeftNum = hasPaid && since
    ? Math.max(
        0,
        Math.ceil(
          (new Date(since).getTime() + CYCLE_DAYS * 24 * 60 * 60 * 1000 - Date.now()) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : null;

  // Faturas (histórico de pagamentos do plano)
  const { data: invoices } = user
    ? await supabase
        .from("payment_links")
        .select("id, description, amount_cents, billing_type, paid_at, expires_at, url")
        .eq("trainer_id", user.id)
        .like("description", "Plano %")
        .order("paid_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: null };

  // Limites: uso real
  let studentsUsed = 0;
  let studentLimit: number | null = null;
  let teamCount = 0;
  let waConnected = false;
  try {
    if (user) {
      const [{ count: sCount }, { count: tCount }, { data: wa }] = await Promise.all([
        supabase
          .from("student_profiles")
          .select("user_id", { count: "exact", head: true })
          .eq("trainer_id", user.id)
          .eq("status", "active"),
        supabase
          .from("team_members")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id),
        supabase
          .from("evolution_instances")
          .select("id")
          .eq("trainer_id", user.id)
          .eq("state", "open")
          .limit(1)
          .maybeSingle(),
      ]);
      studentsUsed = sCount ?? 0;
      studentLimit = PLANS.find((p) => p.id === currentTier)?.studentLimit ?? null;
      teamCount = tCount ?? 0;
      waConnected = !!wa;
    }
  } catch {
    // limites opcionais
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

      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        {hasPaid ? (
          <>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Cobrança</h1>
              <p className="text-sm text-muted-foreground">
                <Link href="/app" className="hover:text-foreground">Início</Link>
                <span className="mx-1.5">›</span>
                Cobrança
              </p>
            </div>

            <div className="mt-6 grid lg:grid-cols-3 gap-4">
              {/* Plano atual */}
              <Card className="lg:col-span-2 bg-card/80 border-white/10 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold flex items-center gap-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    Plano atual
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                    Ativo
                  </Badge>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight">{planName}</span>
                  {PLANS.find((p) => p.id === currentTier)?.priceMonthly != null &&
                    (PLANS.find((p) => p.id === currentTier)?.priceMonthly ?? 0) >= 10 && (
                      <span className="text-sm text-muted-foreground">
                        {formatBRL(PLANS.find((p) => p.id === currentTier)?.priceMonthly ?? 0)}/mês
                      </span>
                    )}
                </div>
                {since && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <CalendarDays className="size-4" />
                        Período de cobrança
                      </span>
                      <span className="text-muted-foreground">
                        {daysLeftNum} dia{daysLeftNum === 1 ? "" : "s"} restantes
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${100 - cyclePct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{cycleStart}</span>
                      <span>{cycleEnd}</span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Gerenciar */}
              <Card className="bg-card/80 border-white/10 p-5 sm:p-6 flex flex-col">
                <h2 className="font-bold flex items-center gap-2">
                  <Settings2 className="size-4 text-muted-foreground" />
                  Gerenciar assinatura
                </h2>
                {activeSub ? (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Renovação automática no cartão. Sem surpresa na fatura.
                    </p>
                    <div className="mt-4">
                      <CancelSubscriptionButton />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Sem recorrência ativa. Ative a cobrança automática no cartão.
                    </p>
                    <ButtonLink
                      href={`/app/checkout?plan=${currentTier}`}
                      className="mt-4 font-semibold justify-center"
                    >
                      <Check className="size-4" />
                      Ativar recorrência
                    </ButtonLink>
                  </>
                )}
              </Card>
            </div>

            {/* Faturas + limites */}
            <div className="mt-4 grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <h2 className="text-lg font-bold mb-3">Histórico de faturas</h2>
                {(invoices ?? []).length === 0 ? (
                  <Card className="bg-card/80 border-dashed border-white/10 p-8 text-center">
                    <Receipt className="size-8 mx-auto text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      As próximas cobranças aparecem aqui.
                    </p>
                  </Card>
                ) : (
                  <Card className="bg-card/80 border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-white/5">
                            <th className="text-left font-medium px-4 py-2.5">Descrição</th>
                            <th className="text-left font-medium px-4 py-2.5">Método</th>
                            <th className="text-right font-medium px-4 py-2.5">Valor</th>
                            <th className="text-left font-medium px-4 py-2.5">Status</th>
                            <th className="text-right font-medium px-4 py-2.5">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(invoices as Array<{
                            id: string;
                            description: string;
                            amount_cents: number;
                            billing_type: string | null;
                            paid_at: string | null;
                            expires_at: string | null;
                          }> ?? []).map((inv) => (
                            <tr key={inv.id} className="border-b border-white/5 last:border-0">
                              <td className="px-4 py-3 font-medium truncate max-w-[220px]">
                                {inv.description}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {inv.billing_type === "CREDIT_CARD"
                                  ? "Cartão"
                                  : inv.billing_type === "BOLETO"
                                    ? "Boleto"
                                    : "Pix"}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold">
                                {formatBRL(inv.amount_cents / 100)}
                              </td>
                              <td className="px-4 py-3">
                                {inv.paid_at ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                                    Pago
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Aberto</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                                {inv.paid_at
                                  ? new Date(inv.paid_at).toLocaleDateString("pt-BR")
                                  : inv.expires_at
                                    ? new Date(inv.expires_at).toLocaleDateString("pt-BR")
                                    : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>

              <div>
                <h2 className="text-lg font-bold mb-3">Limites do plano</h2>
                <Card className="bg-card/80 border-white/10 p-5">
                  <LimitRow
                    icon={Users}
                    label="Alunos ativos"
                    value={studentLimit == null ? "∞ Ilimitado" : `${studentsUsed}/${studentLimit}`}
                    good={studentLimit == null || studentsUsed < studentLimit}
                  />
                  <LimitRow
                    icon={Briefcase}
                    label="Equipe"
                    value={String(teamCount)}
                    good
                  />
                  <LimitRow
                    icon={MessageCircle}
                    label="WhatsApp"
                    value={waConnected ? "Conectado" : "Desligado"}
                    good={waConnected}
                  />
                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-sm text-primary font-semibold list-none flex items-center gap-1">
                      <span className="group-open:rotate-180 transition-transform">▾</span>
                      Ver todos os limites
                    </summary>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      {(PLANS.find((p) => p.id === currentTier)?.features ?? []).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="size-3.5 mt-0.5 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </details>
                </Card>
              </div>
            </div>

            <h2 className="mt-10 mb-4 text-lg font-bold">Trocar de plano</h2>
            {currentTier === "top" ? (
              <Card className="bg-card/80 border-white/10 p-6 text-center">
                <div className="text-3xl">🏆</div>
                <p className="mt-2 font-bold">Você está no plano máximo</p>
                <p className="text-sm text-muted-foreground">Alunos ilimitados, tudo liberado.</p>
              </Card>
            ) : (
              <Card className="bg-card/80 border-white/10 p-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="font-bold">Precisa de mais espaço?</p>
                  <p className="text-sm text-muted-foreground">
                    Sobe de plano e o novo limite vale na hora.
                  </p>
                </div>
                <ButtonLink href="/app/upgrade" className="font-bold shrink-0 justify-center">
                  Fazer upgrade
                </ButtonLink>
              </Card>
            )}
          </>
        ) : (
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
        )}

        {!hasPaid && (
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
                    Fazer upgrade
                  </ButtonLink>
                )}
              </Card>
            );
          })}
        </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Pagamento processado pelo Mercado Pago. Pix, cartão ou boleto — você
          escolhe na hora.
        </p>
      </main>
    </div>
  );
}
