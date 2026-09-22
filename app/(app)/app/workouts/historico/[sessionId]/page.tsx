import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Dumbbell,
  ArrowLeft,
  Target,
} from "lucide-react";
import Link from "next/link";
import { getSessionDetail } from "../../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getSessionDetail(sessionId);
  if (!result.ok || !result.data.session) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Sessão não encontrada</h1>
        <Link
          href="/app/workouts/historico"
          className="mt-2 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar pro histórico
        </Link>
      </div>
    );
  }

  const { session, sets } = result.data;

  // Header info: pega título do treino + aluno via treino.
  const { data: wtRow } = await supabase
    .from("workouts")
    .select("id, title, student_profiles(full_name)")
    .eq("id", session.workout_id)
    .maybeSingle();

  const workoutTitle = (() => {
    if (!wtRow) return "Treino";
    const w = wtRow as { title: string };
    return w.title;
  })();

  const studentName = (() => {
    if (!wtRow) return null;
    const sp = (wtRow as { student_profiles?: { full_name?: string } | { full_name?: string }[] | null })
      .student_profiles;
    if (!sp) return null;
    return Array.isArray(sp) ? sp[0]?.full_name ?? null : sp.full_name ?? null;
  })();

  // Agrupa sets por exercise_name.
  const groups = new Map<
    string,
    {
      name: string;
      sets: Array<typeof sets[number]>;
    }
  >();
  for (const s of sets) {
    const cur = groups.get(s.exercise_name) ?? { name: s.exercise_name, sets: [] };
    cur.sets.push(s);
    groups.set(s.exercise_name, cur);
  }
  const groupedList = Array.from(groups.values());

  const durationMin =
    session.started_at && session.completed_at
      ? Math.max(
          0,
          Math.round(
            (new Date(session.completed_at).getTime() -
              new Date(session.started_at).getTime()) /
              60000,
          ),
        )
      : null;
  const volumeKg = sets.reduce(
    (acc, s) => acc + (s.reps ?? 0) * Number(s.load_kg ?? 0),
    0,
  );

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link
            href="/app/workouts/historico"
            className="text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold truncate">{workoutTitle}</h1>
          {studentName && (
            <Badge
              variant="outline"
              className="border-primary/30 text-primary shrink-0"
            >
              {studentName}
            </Badge>
          )}
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-5">
        <Card className="bg-card border-white/5 p-5 relative overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            <p className="text-sm text-muted-foreground">
              {new Date(session.date + "T12:00:00Z").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
            <h2 className="font-bold text-xl mt-1">{workoutTitle}</h2>

            <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
              <Mini
                label="Duração"
                valueText={durationMin != null ? `${durationMin} min` : "—"}
              />
              <Mini
                label="Séries"
                valueText={String(sets.length)}
              />
              <Mini
                label="Volume"
                valueText={`${Math.round(volumeKg)}kg`}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  session.status === "done"
                    ? "border-emerald-500/30 text-emerald-500"
                    : "border-amber-500/30 text-amber-500"
                }
              >
                {session.status === "done" ? "Finalizado" : "Pendente"}
              </Badge>
            </div>
          </div>
        </Card>

        {groupedList.length === 0 ? (
          <Card className="bg-card border-dashed border-white/10 p-8 text-center">
            <Dumbbell className="size-6 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma série registrada nessa sessão.
            </p>
          </Card>
        ) : (
          groupedList.map((g) => (
            <Card key={g.name} className="bg-card/80 border-white/10 p-5">
              <h3 className="mb-3 font-semibold">{g.name}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-medium py-1">#</th>
                    <th className="text-left font-medium py-1">Reps</th>
                    <th className="text-left font-medium py-1">Carga</th>
                    <th className="text-left font-medium py-1">RPE</th>
                    <th className="text-left font-medium py-1">Desc</th>
                    <th className="text-right font-medium py-1">Vol</th>
                  </tr>
                </thead>
                <tbody>
                  {g.sets.map((s) => (
                    <tr key={s.id} className="border-t border-white/5">
                      <td className="py-1.5 pr-2 font-bold text-primary">
                        {s.set_number}
                      </td>
                      <td className="py-1.5 pr-2">{s.reps ?? "—"}</td>
                      <td className="py-1.5 pr-2">
                        {s.load_kg != null ? `${s.load_kg}kg` : "—"}
                      </td>
                      <td className="py-1.5 pr-2">{s.rpe ?? "—"}</td>
                      <td className="py-1.5 pr-2">{s.discomfort ?? "—"}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {Math.round((s.reps ?? 0) * Number(s.load_kg ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {g.sets.some((s) => s.notes) && (
                <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                  {g.sets
                    .filter((s) => s.notes)
                    .map((s) => (
                      <li key={`note-${s.id}`} className="flex gap-1.5">
                        <span className="text-primary font-bold">#{s.set_number}</span>
                        <span>{s.notes}</span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          ))
        )}

        {/* Metadados do fechamento */}
        {(session.completed_at || (session as { user_rpe?: number | null }).user_rpe != null) && (
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {(session as { user_rpe?: number | null }).user_rpe != null && (
              <span className="inline-flex items-center gap-1.5">
                <Target className="size-3" />
                RPE geral:{" "}
                <strong className="text-foreground">
                  {(session as { user_rpe?: number | null }).user_rpe}
                </strong>
              </span>
            )}
            {session.completed_at && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3" />
                Finalizada às{" "}
                <strong className="text-foreground">
                  {new Date(session.completed_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </span>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Mini({
  label,
  valueText,
}: {
  label: string;
  valueText: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">
        {valueText}
      </div>
    </div>
  );
}
