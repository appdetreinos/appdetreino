import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";

export default async function EvaluationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Alunos do trainer + última medição (PK de student_profiles = user_id)
  const { data: students } = await supabase
    .from("student_profiles")
    .select("user_id, full_name, status")
    .eq("trainer_id", user.id)
    .neq("status", "cancelled")
    .order("full_name", { ascending: true });

  // Última medição por aluno
  const { data: measurements } = await supabase
    .from("measurements")
    .select("id, student_id, date, weight_kg, body_fat_pct, waist_cm")
    .in(
      "student_id",
      (students ?? []).map((s) => s.user_id),
    )
    .order("date", { ascending: false })
    .limit((students?.length ?? 0) * 5);

  // Indexa por aluno
  type Measurement = {
    id: string;
    student_id: string;
    date: string;
    weight_kg: number | null;
    body_fat_pct: number | null;
    waist_cm: number | null;
  };
  const byStudent = new Map<string, Measurement[]>();
  for (const m of (measurements ?? []) as Measurement[]) {
    const arr = byStudent.get(m.student_id) ?? [];
    arr.push(m);
    byStudent.set(m.student_id, arr);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Avaliações físicas</h1>
        <p className="text-sm text-muted-foreground">
          {(students ?? []).length} aluno{(students ?? []).length === 1 ? "" : "s"}
        </p>
      </header>

      {(students ?? []).length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <Activity className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Sem alunos ativos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Convide alunos pra começar a ver avaliações aqui.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(students ?? []).map((s) => {
            const measurements = byStudent.get(s.user_id) ?? [];
            const latest = measurements[0];
            const previous = measurements[1];
            const weightDelta =
              latest?.weight_kg != null && previous?.weight_kg != null
                ? latest.weight_kg - previous.weight_kg
                : null;

            return (
              <Link key={s.user_id} href={`/app/students/${s.user_id}`} className="block group">
                <Card className="bg-card border-white/5 p-5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold">
                      {s.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{s.full_name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {s.status}
                      </Badge>
                    </div>
                  </div>

                  {latest ? (
                    <div className="space-y-2 text-sm">
                      <Stat
                        icon={weightDelta != null && weightDelta < 0 ? TrendingDown : weightDelta != null && weightDelta > 0 ? TrendingUp : Minus}
                        label="Peso"
                        value={
                          latest.weight_kg != null
                            ? `${latest.weight_kg.toFixed(1)} kg`
                            : "—"
                        }
                        delta={weightDelta}
                      />
                      <Stat
                        icon={Activity}
                        label="Gordura"
                        value={
                          latest.body_fat_pct != null
                            ? `${latest.body_fat_pct.toFixed(1)}%`
                            : "—"
                        }
                      />
                      <Stat
                        icon={Activity}
                        label="Cintura"
                        value={
                          latest.waist_cm != null
                            ? `${latest.waist_cm} cm`
                            : "—"
                        }
                      />
                      <div className="text-xs text-muted-foreground pt-2">
                        {measurements.length} medições · última em{" "}
                        {new Date(latest.date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem medições registradas
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold">{value}</span>
        {delta != null && delta !== 0 && (
          <span
            className={`text-xs font-mono ${
              delta < 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
