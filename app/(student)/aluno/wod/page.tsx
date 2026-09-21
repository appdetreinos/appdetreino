import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { WodResultForm } from "./wod-result-form";
import { Timer, Flame } from "lucide-react";

export default async function WodAlunoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // WOD de hoje (e próximos 7 dias)
  const today = new Date().toISOString().split("T")[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

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

  // Próximos (calendário)
  const { data: upcomingWods } = await supabase
    .from("wods")
    .select("id, title, scheduled_for")
    .gte("scheduled_for", weekFromNow)
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
        todaysWods.map((w) => {
          // Minha participação
          const mine = (w.participants ?? []).find((p) => p.student_id === user.id);
          return (
            <Card key={w.id} className="bg-card border-white/5 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-xl">{w.title}</h2>
                  <span className="text-xs text-muted-foreground">
                    {new Date(w.scheduled_for).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <Flame className="size-6 text-orange-500" />
              </div>

              {w.description && (
                <p className="mt-3 text-sm whitespace-pre-line">{w.description}</p>
              )}

              <div className="mt-5 pt-5 border-t border-white/5">
                {mine?.completed_at ? (
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Seu resultado
                    </div>
                    <div className="flex items-center gap-3">
                      {mine.result_time_seconds != null && (
                        <div className="flex items-center gap-1.5">
                          <Timer className="size-4 text-primary" />
                          <span className="font-mono text-lg font-bold">
                            {formatTime(mine.result_time_seconds)}
                          </span>
                        </div>
                      )}
                      {mine.result_rounds != null && (
                        <div className="text-lg font-bold">
                          {mine.result_rounds} rounds
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
          );
        })
      )}

      {/* Próximos */}
      {(upcomingWods ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Próximos
          </h2>
          <div className="space-y-2">
            {(upcomingWods ?? []).map((w) => (
              <Card key={w.id} className="bg-card border-white/5 p-3 flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">
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
