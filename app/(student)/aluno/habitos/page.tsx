import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { HabitCounter } from "./habit-counter";
import { Sparkles } from "lucide-react";

export default async function HabitosAlunoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Hábitos do aluno + log de hoje (single query com join)
  const today = new Date().toISOString().split("T")[0];
  const { data: habits, error } = await supabase
    .from("habits")
    .select(
      `id, name, icon, target_count, unit, frequency,
       logs:habit_logs(count, logged_at)`,
    )
    .eq("student_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Meus hábitos</h1>
        <p className="text-sm text-destructive">Erro: {error.message}</p>
      </div>
    );
  }

  // Extrai log de hoje de cada hábito
  type HabitRow = {
    id: string;
    name: string;
    icon: string | null;
    target_count: number;
    unit: string | null;
    frequency: string;
    logs: { count: number; logged_at: string }[] | null;
  };
  const list = ((habits ?? []) as HabitRow[]).map((h) => {
    const log = (h.logs ?? []).find((l) => l.logged_at === today);
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      target: h.target_count,
      unit: h.unit ?? "",
      frequency: h.frequency,
      current: log?.count ?? 0,
    };
  });

  const overallProgress =
    list.length === 0
      ? 0
      : list.reduce((acc, h) => acc + Math.min(100, (h.current / h.target) * 100), 0) /
        list.length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Meus hábitos</h1>
        <p className="text-sm text-muted-foreground">
          Marque o que você fez hoje
        </p>
      </header>

      {/* Progresso geral */}
      {list.length > 0 && (
        <Card className="bg-card border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Hoje</span>
            <span className="text-2xl font-bold">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, overallProgress)}%` }}
            />
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <Sparkles className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Nenhum hábito configurado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Quando seu personal criar hábitos pra você, eles aparecem aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((h) => (
            <HabitCounter
              key={h.id}
              habitId={h.id}
              name={h.name}
              icon={h.icon}
              target={h.target}
              unit={h.unit}
              current={h.current}
            />
          ))}
        </div>
      )}
    </div>
  );
}
