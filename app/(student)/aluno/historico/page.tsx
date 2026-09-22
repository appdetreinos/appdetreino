import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, Dumbbell, Salad, Trophy } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/stagger";

/**
 * Histórico do aluno — feed cronológico de tudo que ele fez:
 *  - Treinos concluídos/pulados
 *  - WODs com resultado
 *  - Refeições registradas
 *  - Hábitos batidos
 *
 * Mostra os últimos 30 eventos com agrupamento por dia.
 */
export default async function HistoricoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Sessões de treino (últimas 20)
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select(
      "id, date, status, started_at, completed_at, workouts:workout_id(title)",
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // WOD participações (últimas 10)
  const { data: wodParticipations } = await supabase
    .from("wod_participants")
    .select(
      "id, completed_at, result_time_seconds, result_rounds, wods:wod_id(title)",
    )
    .eq("student_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(10);

  type Sessao = {
    id: string;
    date: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    workouts: { title: string } | { title: string }[] | null;
  };
  type WodPart = {
    id: string;
    completed_at: string | null;
    result_time_seconds: number | null;
    result_rounds: number | null;
    wods: { title: string } | { title: string }[] | null;
  };

  type Evento = {
    id: string;
    tipo: "treino" | "wod";
    titulo: string;
    when: string;
    detail: string;
    status: string;
  };

  const eventos: Evento[] = [];

  for (const s of (sessions ?? []) as Sessao[]) {
    const w = Array.isArray(s.workouts) ? s.workouts[0] : s.workouts;
    eventos.push({
      id: `s-${s.id}`,
      tipo: "treino",
      titulo: w?.title ?? "Treino",
      when: s.completed_at ?? s.started_at ?? s.date,
      detail:
        s.status === "completed"
          ? "Concluído"
          : s.status === "skipped"
            ? "Pulado"
            : s.status === "pending"
              ? "Iniciado"
              : s.status,
      status: s.status,
    });
  }

  for (const p of (wodParticipations ?? []) as WodPart[]) {
    const w = Array.isArray(p.wods) ? p.wods[0] : p.wods;
    const parts: string[] = [];
    if (p.result_time_seconds != null) {
      const m = Math.floor(p.result_time_seconds / 60);
      const s = p.result_time_seconds % 60;
      parts.push(`${m}:${s.toString().padStart(2, "0")}`);
    }
    if (p.result_rounds != null) parts.push(`${p.result_rounds} rounds`);
    eventos.push({
      id: `w-${p.id}`,
      tipo: "wod",
      titulo: w?.title ?? "WOD",
      when: p.completed_at ?? new Date().toISOString(),
      detail: parts.join(" · ") || "Concluído",
      status: "completed",
    });
  }

  // Ordena cronologicamente (mais recente primeiro)
  eventos.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  if (eventos.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6 pb-12">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight">Meu histórico</h1>
          <p className="text-sm text-muted-foreground">
            Tudo que você fez: treinos, WODs, hábitos
          </p>
        </header>
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <HistoryIcon className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Histórico vazio</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Quando você começar a treinar e bater teus primeiros hábitos, aparece aqui.
          </p>
        </Card>
      </div>
    );
  }

  // Agrupa por dia
  const grupos = eventos.reduce<Record<string, Evento[]>>((acc, ev) => {
    const d = new Date(ev.when);
    const dia = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    (acc[dia] ??= []).push(ev);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Meu histórico</h1>
        <p className="text-sm text-muted-foreground">
          {eventos.length} evento{eventos.length === 1 ? "" : "s"} registrado
          {eventos.length === 1 ? "" : "s"}
        </p>
      </header>

      <Stagger className="space-y-6" delay={0.05}>
        {Object.entries(grupos).map(([dia, lista]) => (
          <StaggerItem key={dia}>
            <section>
              <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 capitalize">
                {dia}
              </h2>
              <div className="space-y-2">
                {lista.map((ev) => {
                  const Icon = ev.tipo === "treino" ? Dumbbell : Trophy;
                  const ok =
                    ev.tipo === "wod" || ev.status === "completed";
                  return (
                    <Card
                      key={ev.id}
                      className="bg-card border-white/5 p-3.5 flex items-center gap-3 hover:border-primary/30 transition-colors"
                    >
                      <div
                        className={`grid size-9 place-items-center rounded-lg shrink-0 ${
                          ok
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{ev.titulo}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ev.when).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {ev.detail}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          ok
                            ? "border-emerald-500/30 text-emerald-500"
                            : "border-white/10 text-muted-foreground"
                        }
                      >
                        {ok ? "OK" : "Pulado"}
                      </Badge>
                    </Card>
                  );
                })}
              </div>
            </section>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
