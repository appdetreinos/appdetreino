import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { PixKeyCard } from "./pix-key-card";
import { ChargeQr } from "./charge-qr";
import { CreditCard, Check, Clock, AlertCircle } from "lucide-react";

const STATUS_MAP = {
  paid: { label: "Pago", variant: "default" as const, icon: Check, color: "text-emerald-500" },
  pending: { label: "Pendente", variant: "outline" as const, icon: Clock, color: "text-amber-500" },
  overdue: { label: "Atrasado", variant: "outline" as const, icon: AlertCircle, color: "text-rose-500" },
  cancelled: { label: "Cancelado", variant: "outline" as const, icon: AlertCircle, color: "text-zinc-500" },
};

export default async function PagamentosAlunoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Pagamentos do aluno
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, due_date, paid_at, description")
    .eq("student_id", user.id)
    .order("due_date", { ascending: false })
    .limit(50);

  // Pega trainer + chave Pix do trainer_settings (via view safe)
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("trainer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let pixKey: string | null = null;
  let pixType: string | null = null;
  let beneficiary: string | null = null;

  if (studentProfile?.trainer_id) {
    const { data } = await supabase
      .from("trainer_settings")
      .select("pix_key, pix_key_type, beneficiary_name")
      .eq("user_id", studentProfile.trainer_id)
      .maybeSingle();
    if (data) {
      pixKey = data.pix_key;
      pixType = data.pix_key_type;
      beneficiary = data.beneficiary_name;
    }
  }

  const list = (payments ?? []) as Array<{
    id: string;
    amount: number | string;
    status: keyof typeof STATUS_MAP;
    due_date: string;
    paid_at: string | null;
    description: string | null;
  }>;

  const pending = list.filter((p) => p.status === "pending" || p.status === "overdue");
  const totalPending = pending.reduce(
    (acc, p) => acc + Number(p.amount ?? 0),
    0,
  );

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          {list.length} cobrança{list.length === 1 ? "" : "s"} no total
        </p>
      </header>

      {/* Resumo */}
      {totalPending > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30 p-5">
          <div className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
            Em aberto
          </div>
          <div className="text-3xl font-extrabold mt-1">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalPending)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {pending.length} cobrança{pending.length === 1 ? "" : "s"} pendente
            {pending.length === 1 ? "" : "s"}
          </p>
        </Card>
      )}

      {/* Chave Pix */}
      {pixKey && (
        <PixKeyCard pixKey={pixKey} pixType={pixType} beneficiary={beneficiary} />
      )}

      {/* Lista */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Histórico
        </h2>
        {list.length === 0 ? (
          <Card className="bg-card border-dashed border-white/10 p-8 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
              <CreditCard className="size-6" />
            </div>
            <h3 className="mt-4 font-semibold">Sem cobranças ainda</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Quando seu personal emitir uma cobrança, aparece aqui.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((p) => {
              const statusInfo = STATUS_MAP[p.status] ?? STATUS_MAP.pending;
              const Icon = statusInfo.icon;
              return (
                <Card key={p.id} className="bg-card border-white/5 p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`size-5 ${statusInfo.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Number(p.amount))}
                        </span>
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.description && `${p.description} · `}
                        Vencimento{" "}
                        {new Date(p.due_date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {p.paid_at && (
                          <> · Pago em{" "}
                            {new Date(p.paid_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {(p.status === "pending" || p.status === "overdue") && pixKey && (
                    <ChargeQr
                      paymentId={p.id}
                      amount={Number(p.amount)}
                      pixKey={pixKey}
                      beneficiary={beneficiary}
                    />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
