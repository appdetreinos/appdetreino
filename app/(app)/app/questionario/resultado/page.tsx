import { cookies } from "next/headers";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp } from "lucide-react";
import { PLANS, formatBRL } from "@/lib/types/billing";
import { QuizAnswerSchema, type QuizAnswers } from "@/lib/validation/quiz";

const PLANS_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<
  (typeof PLANS)[number]["id"],
  (typeof PLANS)[number]
>;

function calcularPlano(revenue: number | null): keyof typeof PLANS_BY_ID {
  if (!revenue) return "start";
  if (revenue < 8000) return "start";
  if (revenue < 20000) return "pro";
  return "top";
}

export default async function ResultadoPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("quiz_answers");

  let answers: QuizAnswers | null = null;
  if (cookie) {
    const parsed = QuizAnswerSchema.safeParse(safeJson(cookie.value));
    if (parsed.success) answers = parsed.data;
  }

  // Fallback: sem cookie ainda (cold load) — recomendo "start" e mostro CTA genérico.
  const revenue = answers?.revenue ?? 0;
  const students = answers?.studentCount ?? 0;
  const planId = calcularPlano(revenue);
  const plan = PLANS_BY_ID[planId];
  const lucro = revenue - plan.priceMonthly;
  const roi = revenue > 0 ? Math.round((lucro / plan.priceMonthly) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-2xl px-6 h-16 flex items-center">
          <div className="font-extrabold">Viva <span className="text-primary">FIT APP</span></div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Badge className="bg-primary/15 text-primary border-primary/30">
            <Sparkles className="size-3.5 mr-1" />
            Plano recomendado pra você
          </Badge>

          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
            {revenue > 0 ? (
              <>
                Com seu faturamento de {formatBRL(revenue)},{" "}
                <span className="text-primary">
                  sobra {formatBRL(Math.max(lucro, 0))}
                </span>{" "}
                depois do Viva FIT APP.
              </>
            ) : (
              <>
                <span className="text-primary">Bem-vindo!</span> Veja o plano que faz sentido
                pra você.
              </>
            )}
          </h1>

          <Card className="mt-8 p-6 bg-card border-primary/30 shadow-[0_0_60px_-15px_rgba(255,107,53,0.4)]">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {plan.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {plan.studentLimit
                    ? `até ${plan.studentLimit} alunos ativos`
                    : "alunos ilimitados"}
                </div>
              </div>
              <div className="text-right">
                <div className="num text-4xl font-extrabold">
                  {formatBRL(plan.priceMonthly)}
                </div>
                <div className="text-xs text-muted-foreground">/mês</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 pt-5 border-t border-white/5">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Faturamento
                </div>
                <div className="num text-lg font-bold mt-1">{formatBRL(revenue)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Plano Viva FIT APP
                </div>
                <div className="num text-lg font-bold mt-1 text-primary">
                  −{formatBRL(plan.priceMonthly)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Sobra
                </div>
                <div className="num text-lg font-bold mt-1 text-primary">
                  {formatBRL(Math.max(lucro, 0))}
                </div>
              </div>
            </div>

            {roi > 0 && (
              <div className="mt-5 flex items-center gap-2 text-sm">
                <TrendingUp className="size-4 text-primary" />
                <span>
                  Você paga <strong>{formatBRL(plan.priceMonthly)}</strong> pra recuperar{" "}
                  <strong>{formatBRL(revenue * 0.05)}</strong> de receita (5% de inadimplência
                  recuperada).
                </span>
              </div>
            )}

            {students > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                Considerando {students} aluno{students !== 1 ? "s" : ""} ativos.
              </div>
            )}
          </Card>

          <div className="mt-8 space-y-3">
            <ButtonLink
              href={`/app/checkout?plan=${planId}`}
              size="lg"
              className="w-full font-bold h-12"
            >
              Assinar {plan.name} agora por {formatBRL(plan.priceMonthly)}/mês
            </ButtonLink>
            <ButtonLink
              href="/app"
              size="lg"
              variant="outline"
              className="w-full h-11"
            >
              Quero explorar 3 dias grátis antes
            </ButtonLink>
            {revenue === 0 && (
              <p className="text-center text-xs text-amber-500/80 mt-2">
                Não conseguimos ler suas respostas.{" "}
                <Link href="/app/questionario" className="underline hover:text-primary">
                  Refazer o questionário
                </Link>
                .
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sem fidelidade · Cancela em 1 clique · Pix, cartão e boleto
          </p>
        </div>
      </main>
    </div>
  );
}

/* Util: JSON.parse protegido contra inputs malformados */
function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
