import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { MeasurementForm } from "./measurement-form";
import { TrendingUp, Ruler } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type MeasurementRow = Database["public"]["Tables"]["measurements"]["Row"];

export default async function ProgressoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: measurements, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("student_id", user.id)
    .order("date", { ascending: false })
    .limit(50);

  const list = (measurements ?? []) as MeasurementRow[];

  // Calcula tendência do peso (mais recente vs anterior)
  let weightTrend: { current: number; previous: number | null; delta: number | null } | null = null;
  if (list.length > 0 && list[0].weight_kg != null) {
    const current = list[0].weight_kg;
    const previous =
      list.length > 1 && list[1].weight_kg != null ? list[1].weight_kg : null;
    weightTrend = {
      current,
      previous,
      delta: previous != null ? current - previous : null,
    };
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Meu progresso</h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas medidas e evolução</p>
      </header>

      {/* Card de tendência */}
      {weightTrend && (
        <Card className="bg-card border-white/5 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Peso atual
              </div>
              <div className="text-2xl font-bold mt-1">{weightTrend.current.toFixed(1)} kg</div>
              {weightTrend.delta != null && (
                <div
                  className={`text-xs mt-1 ${
                    weightTrend.delta < 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {weightTrend.delta > 0 ? "+" : ""}
                  {weightTrend.delta.toFixed(1)} kg desde a última medição
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Form de nova medição */}
      <MeasurementForm />

      {/* Histórico */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Histórico
        </h2>
        {error && (
          <p className="text-sm text-destructive mb-3">Erro: {error.message}</p>
        )}
        {list.length === 0 ? (
          <Card className="bg-card border-dashed border-white/10 p-8 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
              <Ruler className="size-6" />
            </div>
            <h3 className="mt-4 font-semibold">Nenhuma medição registrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Comece registrando seu peso e medidas.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map((m) => (
              <Card key={m.id} className="bg-card border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {new Date(m.date).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {m.weight_kg != null && (
                    <Stat label="Peso" value={`${m.weight_kg.toFixed(1)} kg`} />
                  )}
                  {m.body_fat_pct != null && (
                    <Stat label="Gordura" value={`${m.body_fat_pct.toFixed(1)}%`} />
                  )}
                  {m.waist_cm != null && (
                    <Stat label="Cintura" value={`${m.waist_cm} cm`} />
                  )}
                  {m.chest_cm != null && (
                    <Stat label="Peito" value={`${m.chest_cm} cm`} />
                  )}
                  {m.arm_cm != null && (
                    <Stat label="Braço" value={`${m.arm_cm} cm`} />
                  )}
                  {m.thigh_cm != null && (
                    <Stat label="Coxa" value={`${m.thigh_cm} cm`} />
                  )}
                  {m.hip_cm != null && (
                    <Stat label="Quadril" value={`${m.hip_cm} cm`} />
                  )}
                </div>
                {m.notes && (
                  <p className="text-xs text-muted-foreground mt-3 italic">"{m.notes}"</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
