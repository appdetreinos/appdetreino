import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Trophy, Timer, Repeat } from "lucide-react";
import { todayBR } from "@/lib/utils/date";

/**
 * WOD do dia — workout of the day, gera ranking entre alunos.
 *
 * Schema:
 *   wods(id, trainer_id, scheduled_for, title, description)
 *   wod_participants(wod_id, student_id, result_time_seconds, result_rounds, completed_at)
 *
 * Tipo (AMRAP vs For Time) é inferido a partir dos resultados:
 *   - tem result_rounds → AMRAP
 *   - tem result_time_seconds → For Time
 */

function fmtTime(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function inferType(parts: Array<{ result_time_seconds: number | null; result_rounds: number | null }>): "amrap" | "for_time" {
  // Se tem rounds preenchidos, é AMRAP; se tem tempo, é For Time.
  const hasRounds = parts.some((p) => p.result_rounds != null);
  return hasRounds ? "amrap" : "for_time";
}

export default async function WODPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // scheduled_for é DATE — comparar com data BR (YYYY-MM-DD), não com ISO timestamp
  const todayDate = todayBR();

  const [{ data: todayWods }, { data: pastWods }] = await Promise.all([
    supabase
      .from("wods")
      .select("id, title, description, scheduled_for")
      .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
      .gte("scheduled_for", todayDate)
      .order("scheduled_for", { ascending: true })
      .limit(5),
    supabase
      .from("wods")
      .select("id, title, scheduled_for")
      .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
      .lt("scheduled_for", todayDate)
      .order("scheduled_for", { ascending: false })
      .limit(7),
  ]);

  // Pega o WOD de hoje (se houver) + participantes
  const today = (todayWods ?? [])[0];
  let participants: Array<{
    student_id: string;
    result_time_seconds: number | null;
    result_rounds: number | null;
    completed_at: string | null;
    student_name: string;
  }> = [];

  let totalRounds = 0;
  let avgTime: number | null = null;
  let todayType: "amrap" | "for_time" = "for_time";

  if (today) {
    const { data: parts } = await supabase
      .from("wod_participants")
      .select(
        "student_id, result_time_seconds, result_rounds, completed_at, students:student_profiles!inner(user_id, profiles:profiles!inner(full_name))",
      )
      .eq("wod_id", today.id);

    type PRow = {
      student_id: string;
      result_time_seconds: number | null;
      result_rounds: number | null;
      completed_at: string | null;
      students: {
        user_id: string;
        profiles: { full_name: string } | { full_name: string }[] | null;
      } | {
        user_id: string;
        profiles: { full_name: string } | { full_name: string }[] | null;
      }[] | null;
    };

    const ps = (parts ?? []) as unknown as PRow[];

    participants = ps
      .map((p) => {
        const sRel = Array.isArray(p.students) ? p.students[0] : p.students;
        const prRel = sRel?.profiles
          ? (Array.isArray(sRel.profiles) ? sRel.profiles[0] : sRel.profiles)
          : null;
        return {
          student_id: p.student_id,
          result_time_seconds: p.result_time_seconds,
          result_rounds: p.result_rounds,
          completed_at: p.completed_at,
          student_name: prRel?.full_name ?? "Aluno",
        };
      });

    todayType = inferType(participants);

    // Ordena após inferir o tipo
    participants.sort((a, b) => {
      if (todayType === "amrap") {
        return (b.result_rounds ?? 0) - (a.result_rounds ?? 0);
      }
      // for_time / chipper: menor tempo vence
      const at = a.result_time_seconds ?? Number.MAX_SAFE_INTEGER;
      const bt = b.result_time_seconds ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    });

    if (participants.length > 0) {
      totalRounds = participants.reduce(
        (acc, p) => acc + (p.result_rounds ?? 0),
        0,
      );
      const times = participants
        .filter((p) => p.result_time_seconds != null)
        .map((p) => p.result_time_seconds as number);
      if (times.length > 0) {
        avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }
    }
  }

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">WOD do dia</h1>
          <p className="text-sm text-muted-foreground">
            Crie um desafio, a turma treina junto e o ranking sai no WhatsApp
          </p>
        </div>
        <ButtonLink href="/app/wod/new" className="font-semibold">
          <Plus className="size-4" />
          Criar WOD
        </ButtonLink>
      </header>

      {today ? (
        <Card className="bg-card border-primary/30 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/20 to-transparent p-5 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge className="bg-primary text-primary-foreground border-0">
                <Trophy className="size-3 mr-1" />
                {todayType.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(today.scheduled_for).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                })}
              </span>
            </div>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
              {today.title}
            </h2>
            {today.description ? (
              <p className="mt-2 text-muted-foreground max-w-xl">{today.description}</p>
            ) : null}
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {participants.length} alunos já fizeram
            </div>
          </div>

          <div className="grid sm:grid-cols-3 divide-x divide-white/5 border-t border-white/5">
            <div className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Top 1</div>
              <div className="mt-1 flex items-center gap-2">
                <Trophy className="size-4 text-yellow-500" />
                <span className="font-bold truncate">{participants[0]?.student_name ?? "—"}</span>
              </div>
              <div className="num text-2xl font-extrabold mt-1">
                {todayType === "amrap"
                  ? `${participants[0]?.result_rounds ?? 0} rounds`
                  : fmtTime(participants[0]?.result_time_seconds)}
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Tempo médio
              </div>
              <div className="mt-1 num text-2xl font-extrabold">{fmtTime(avgTime)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {participants.filter((p) => p.result_time_seconds != null).length} tempos
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Total rounds
              </div>
              <div className="mt-1 num text-2xl font-extrabold">{totalRounds}</div>
              <div className="text-xs text-muted-foreground mt-0.5">turma somada</div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <Timer className="size-12 text-muted-foreground mx-auto" />
          <h3 className="mt-4 font-semibold">Nenhum WOD pra hoje</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie um novo WOD e chame a turma.</p>
          <ButtonLink href="/app/wod/new" className="mt-4 inline-flex">
            Criar o primeiro WOD
          </ButtonLink>
        </Card>
      )}

      {participants.length > 0 && (
        <Card className="bg-card border-white/5 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold">Ranking de hoje</h3>
            <Badge variant="outline" className="border-white/10">
              {participants.length} participantes
            </Badge>
          </div>
          <div className="divide-y divide-white/5">
            {participants.map((r, idx) => {
              const iniciais = r.student_name
                .split(" ")
                .map((s) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div key={r.student_id} className="flex items-center gap-4 px-5 py-3.5">
                  <div
                    className={`shrink-0 size-9 grid place-items-center rounded-full font-bold text-sm ${
                      idx === 0
                        ? "bg-yellow-500/20 text-yellow-500"
                        : idx === 1
                          ? "bg-zinc-300/20 text-zinc-300"
                          : idx === 2
                            ? "bg-orange-700/30 text-orange-600"
                            : "bg-white/5 text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="size-10 shrink-0 rounded-full bg-primary/15 grid place-items-center text-xs font-bold text-primary">
                    {iniciais}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.student_name}</div>
                  </div>
                  <div className="num text-base font-bold tabular-nums">
                    {todayType === "amrap"
                      ? `${r.result_rounds ?? 0} rounds`
                      : fmtTime(r.result_time_seconds)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {(pastWods ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Últimos WODs
          </h3>
          <Card className="bg-card border-white/5 divide-y divide-white/5">
            {(pastWods ?? []).map((h) => (
              <div key={h.id} className="flex items-center gap-4 p-4">
                <span className="text-xs text-muted-foreground num tabular-nums shrink-0">
                  {new Date(h.scheduled_for).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{h.title}</div>
                </div>
                <Badge variant="outline" className="border-white/10">
                  <Repeat className="size-3 mr-1" />
                  arquivado
                </Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
