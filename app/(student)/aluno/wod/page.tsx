import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WodResultForm } from "./wod-result-form";
import { Timer, Flame } from "lucide-react";
import { todayBR } from "@/lib/utils/date";
import { Stagger, StaggerItem } from "@/components/ui/stagger";

export default async function WodAlunoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // WOD de hoje (compara com data BR, não UTC)
  const today = todayBR();
  // Próximos: começa amanhã (não hoje — o de hoje já aparece no topo)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const { data: wods, error } = await supabase
    .from("wods")
    .select(
      `id, title, description, scheduled_for,
       participants:wod_participants(
         result_time_seconds, result_rounds, result_notes, completed_at, student_id
       )`,
    )
    .eq("scheduled_for", today)
    .order("created_at", { ascending: false })
    .limit(5);

  // Próximos (calendário) — começa amanhã, não pula dias (era weekFromNow = 7 dias à frente,
  // invisibilizava 1-6 dias)
  const { data: upcomingWods } = await supabase
    .from("wods")
    .select("id, title, scheduled_for")
    .gte("scheduled_for", tomorrow)
    .order("scheduled_for", { ascending: true })
    .limit(10);

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">WOD do dia</h1>
        <p className="text-sm text-destructive">Erro: {error.message}</p>
      </div>
    );
  }

  type WodRow = {
    id: string;
    title: string;
    description: string | null;
    scheduled_for: string;
    participants: Array<{
      result_time_seconds: number | null;
      result_rounds: number | null;
      result_notes: string | null;
      completed_at: string | null;
      student_id: string;
    }> | null;
  };

  const todaysWods = (wods ?? []) as WodRow[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">WOD do dia</h1>
        <p className="text-sm text-muted-foreground">
          {todaysWods.length > 0
            ? `${todaysWods.length} WOD${todaysWods.length === 1 ? "" : "s"} hoje`
            : "Sem WOD hoje"}
        </p>
      </header>

      {todaysWods.length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <Flame className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Descanso hoje</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sem WOD programado. Recupera bem.
          </p>
        </Card>
      ) : (
        <Stagger className="space-y-4" delay={0.05}>
          {todaysWods.map((w) => {
            const mine = (w.participants ?? []).find((p) => p.student_id === user.id);
            const completed = !!mine?.completed_at;
            return (
              <StaggerItem key={w.id}>
                <Card className="bg-card border-white/5 p-5 relative overflow-hidden">
                  <div
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-primary to-orange-400"
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-xl">{w.title}</h2>
                        {completed && (
                          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                            Concluído
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(w.scheduled_for).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="grid size-10 place-items-center rounded-full bg-orange-500/15 text-orange-500 shrink-0">
                      <Flame className="size-5" />
                    </div>
                  </div>

                  {w.description && (
                    <p className="mt-3 text-sm whitespace-pre-line bg-secondary/30 p-3 rounded-lg">
                      {w.description}
                    </p>
                  )}

                  <div className="mt-5 pt-5 border-t border-white/5">
                    {completed ? (
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          Seu resultado
                        </div>
                        <div className="flex items-center gap-4">
                          {mine.result_time_seconds != null && (
                            <div className="flex items-center gap-2">
                              <Timer className="size-4 text-primary" />
                              <span className="font-mono text-2xl font-extrabold">
                                {formatTime(mine.result_time_seconds)}
                              </span>
                            </div>
                          )}
                          {mine.result_rounds != null && (
                            <div className="text-2xl font-extrabold">
                              {mine.result_rounds}{" "}
                              <span className="text-sm text-muted-foreground font-medium">
                                rounds
                              </span>
                            </div>
                          )}
                        </div>
                        {mine.result_notes && (
                          <p className="text-xs text-muted-foreground italic">
                            "{mine.result_notes}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <WodResultForm wodId={w.id} />
                    )}
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Próximos */}
      {(upcomingWods ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Próximos
          </h2>
          <div className="space-y-2">
            {(upcomingWods ?? []).map((w) => (
              <Card
                key={w.id}
                className="bg-card border-white/5 p-3 flex items-center gap-3 hover:border-primary/30 transition-colors"
              >
                <span className="text-xs font-mono text-muted-foreground w-16 shrink-0 bg-secondary/30 px-2 py-1 rounded text-center">
                  {new Date(w.scheduled_for).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="font-medium">{w.title}</span>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
