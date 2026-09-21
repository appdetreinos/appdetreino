import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, TrendingUp, Activity } from "lucide-react";

export default async function AdminMetricsPage() {
  const supabase = await createClient();

  // Total de trainers / students / payments
  const [{ count: trainers }, { count: students }, { count: paymentsPaid }] =
    await Promise.all([
      supabase.from("trainer_profiles").select("*", { count: "exact", head: true }),
      supabase.from("student_profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "paid"),
    ]);

  const stats = [
    { label: "Trainers", value: trainers ?? 0, icon: UserCheck, color: "text-primary" },
    { label: "Alunos", value: students ?? 0, icon: Users, color: "text-emerald-500" },
    { label: "Pagamentos confirmados", value: paymentsPaid ?? 0, icon: TrendingUp, color: "text-amber-500" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Métricas</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma</p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="bg-card border-white/5 p-5">
              <div className="flex items-start gap-3">
                <div className={`grid size-10 place-items-center rounded-lg bg-current/10 ${s.color}`}>
                  <Icon className={`size-5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {s.label}
                  </div>
                  <div className="text-3xl font-extrabold mt-1">
                    {s.value.toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card border-white/5 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">Saúde do sistema</h2>
        </div>
        <div className="space-y-2 text-sm">
          <Row label="Ambiente" value={process.env.NODE_ENV ?? "unknown"} />
          <Row
            label="URL pública"
            value={process.env.NEXT_PUBLIC_APP_URL ?? "—"}
          />
          <Row
            label="Mercado Pago"
            value={process.env.MERCADOPAGO_ACCESS_TOKEN ? "Configurado" : "Não configurado"}
            status={!!process.env.MERCADOPAGO_ACCESS_TOKEN ? "ok" : "warn"}
          />
          <Row
            label="Cron secret"
            value={process.env.CRON_SECRET ? "Configurado" : "Não configurado"}
            status={!!process.env.CRON_SECRET ? "ok" : "warn"}
          />
        </div>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "ok" | "warn";
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 last:border-0 pb-2 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono text-xs ${
          status === "ok"
            ? "text-emerald-500"
            : status === "warn"
              ? "text-amber-500"
              : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
