import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Receipt,
  Wallet,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/types/billing";
import { relativeTime } from "@/lib/utils/date";
import { PixCobrarButton } from "./pix-cobrar-button";

/**
 * Financeiro — server component.
 *
 * Modelo de cobrança:
 *  - Trainer cadastra a chave Pix dele (em Configurações → Cobrança)
 *  - Trainer cria uma cobrança (Aluno + Valor + Vencimento)
 *  - "Cobrar" dispara mensagem WhatsApp pro aluno com a chave Pix + valor
 *  - Aluno paga direto na conta do trainer (sem gateway)
 *  - Trainer marca como pago (manual) ou o aluno responde confirmando
 *
 * Pergunta-chave da tela: "quem tá esperando pagamento?"
 */

const statusMap = {
  paid: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
  pending: { label: "Aguardando", cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", icon: Clock },
  overdue: { label: "Atrasado", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
  cancelled: { label: "Cancelado", cls: "bg-white/10 text-foreground/60 border-white/10", icon: Clock },
} as const;

export default async function FinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Settings do trainer (chave Pix)
  const { data: settings } = await supabase
    .from("trainer_settings")
    .select("pix_key, pix_key_type, pix_beneficiary_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const temPix = Boolean(settings?.pix_key);

  // Cobranças do trainer (com join no aluno)
  const { data: paymentsRaw } = await supabase
    .from("payments")
    .select(`
      id, amount, status, due_date, paid_at, billing_type,
      student_profiles!inner(full_name, phone, trainer_id)
    `)
    .eq("student_profiles.trainer_id", user.id)
    .order("due_date", { ascending: false })
    .limit(20);

  const payments = (paymentsRaw ?? []).map((p) => {
    const sp = Array.isArray(p.student_profiles) ? p.student_profiles[0] : p.student_profiles;
    return {
      id: p.id,
      aluno: sp?.full_name ?? "Aluno",
      letra: (sp?.full_name ?? "?")[0]?.toUpperCase(),
      telefone: sp?.phone ?? null,
      valor: p.amount,
      status: p.status as keyof typeof statusMap,
      vencimento: p.due_date ? new Date(p.due_date).toLocaleDateString("pt-BR") : "—",
      pagoEm: p.paid_at ? relativeTime(p.paid_at) : null,
    };
  });

  const recebido = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.valor, 0);
  const atrasado = payments
    .filter((p) => p.status === "overdue")
    .reduce((s, p) => s + p.valor, 0);

  const pendentes = payments.filter(
    (p) => p.status === "pending" || p.status === "overdue",
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Financeiro</h1>
            <p className="text-xs text-foreground/65">
              {pendentes.length > 0
                ? `${pendentes.length} cobrança${pendentes.length === 1 ? "" : "s"} aguardando`
                : "Tudo em dia"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/app/settings" variant="ghost" size="sm" className="text-foreground/70">
              <Settings className="size-4" />
              <span className="hidden sm:inline">Chave Pix</span>
            </ButtonLink>
            <ButtonLink href="/app/finance/new" size="sm" className="font-semibold">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nova cobrança</span>
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Banner se não configurou Pix ainda */}
        {!temPix && (
          <Card className="bg-primary/10 border-primary/30 p-5">
            <div className="flex items-start gap-4">
              <div className="grid size-10 place-items-center shrink-0 rounded-full bg-primary/20 text-primary">
                <Wallet className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Cadastra tua chave Pix</h3>
                <p className="mt-1 text-sm text-foreground/70">
                  Pra cobrar teus alunos, você só precisa cadastrar a chave Pix onde você recebe
                  (CPF, e-mail, celular ou chave aleatória). A gente monta a mensagem automática
                  pra você.
                </p>
                <ButtonLink href="/app/settings#cobranca" size="sm" className="mt-3 font-semibold">
                  Configurar Pix
                </ButtonLink>
              </div>
            </div>
          </Card>
        )}

        {/* Pergunta-chave + lista */}
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Wallet className="size-5 text-primary" />
            {temPix ? "Quem tá esperando pagamento?" : "Cobranças recentes"}
          </h2>

          {payments.length === 0 ? (
            <EmptyFinance />
          ) : (
            <div className="divide-y divide-white/5">
              {payments.map((p) => {
                const s = statusMap[p.status];
                const podeCobrar =
                  (p.status === "pending" || p.status === "overdue") && temPix;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                  >
                    <Avatar className="size-10 border border-white/10">
                      <AvatarFallback className="bg-primary/15 text-primary font-bold">
                        {p.letra}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.aluno}</div>
                      <div className="text-sm text-foreground/65 truncate">
                        {p.status === "paid" && p.pagoEm
                          ? `Pago ${p.pagoEm}`
                          : `Vence em ${p.vencimento}`}
                      </div>
                    </div>
                    <span className="num font-bold text-base shrink-0">
                      {formatBRL(p.valor)}
                    </span>
                    <Badge className={s.cls}>
                      <s.icon className="size-3 mr-1" />
                      {s.label}
                    </Badge>
                    {podeCobrar && p.telefone && (
                      <PixCobrarButton
                        paymentId={p.id}
                        phone={p.telefone}
                        studentName={p.aluno}
                        valor={p.valor}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Resumo simples — 2 números só */}
        {payments.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="bg-card/80 border-white/10 p-5">
              <div className="text-xs text-foreground/65 uppercase tracking-wider">
                Recebido
              </div>
              <div className="num text-2xl font-extrabold mt-2 text-emerald-500">
                {formatBRL(recebido)}
              </div>
            </Card>
            <Card className="bg-card/80 border-white/10 p-5">
              <div className="text-xs text-foreground/65 uppercase tracking-wider">
                Em atraso
              </div>
              <div
                className={`num text-2xl font-extrabold mt-2 ${
                  atrasado > 0 ? "text-destructive" : "text-foreground/40"
                }`}
              >
                {formatBRL(atrasado)}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyFinance() {
  return (
    <div className="text-center py-6">
      <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary mx-auto">
        <Receipt className="size-6" />
      </div>
      <h3 className="mt-3 font-bold">Nenhuma cobrança ainda</h3>
      <p className="mt-1 text-sm text-foreground/65 max-w-md mx-auto">
        Cria a primeira cobrança e o app monta a mensagem WhatsApp com tua chave Pix pra você
        enviar.
      </p>
      <ButtonLink href="/app/finance/new" className="mt-4 font-semibold">
        <Plus className="size-4" />
        Nova cobrança
      </ButtonLink>
    </div>
  );
}
