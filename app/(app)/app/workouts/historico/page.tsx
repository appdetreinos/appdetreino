import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listWorkoutHistory } from "../actions";
import { ChevronRight, Dumbbell, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type SearchParams = Promise<{
  student_id?: string;
  workout?: string;
  rangeDays?: string;
}>;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sp = (await searchParams) ?? {};
  const rangeDays = sp.rangeDays ? Number(sp.rangeDays) : 90;

  const result = await listWorkoutHistory({
    rangeDays,
    student_id: sp.student_id,
    limit: 100,
  });

  const rows = result.ok ? result.data : [];

  let workoutsTitleById: Record<string, string> = {};
  if (sp.workout) {
    const { data: w } = await supabase
      .from("workouts")
      .select("id, title")
      .eq("id", sp.workout)
      .maybeSingle();
    if (w) workoutsTitleById[w.id] = w.title;
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link
            href="/app/workouts"
            className="text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Histórico de treinos</h1>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Período:
          </span>
          {[30, 90, 180].map((d) => (
            <Link
              key={d}
              href={{ query: { ...sp, rangeDays: String(d) } }}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                rangeDays === d
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-white/10 bg-card text-foreground/70 hover:text-foreground"
              }`}
            >
              {d} dias
            </Link>
          ))}
        </div>

        {sp.workout && workoutsTitleById[sp.workout] && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {workoutsTitleById[sp.workout]}
            </Badge>
            <Link
              href="/app/workouts/historico"
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              limpar
            </Link>
          </div>
        )}

        <Card className="bg-card border-white/10 p-2">
          {rows.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              <Dumbbell className="mx-auto size-6" />
              Nenhuma sessão registrada nos últimos {rangeDays} dias.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {rows.map((h) => (
                <li key={h.sessionId}>
                  <Link
                    href={`/app/workouts/historico/${h.sessionId}`}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.02] rounded-md"
                  >
                    <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-background/40 px-2.5 py-1.5 text-center shrink-0">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        {DAY_NAMES[new Date(h.date + "T12:00:00Z").getDay()]}
                      </span>
                      <span className="text-base font-extrabold leading-tight">
                        {new Date(h.date + "T12:00:00Z").getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {h.workoutTitle}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {h.studentName ?? "—"}
                        {h.durationMin ? ` · ${h.durationMin} min` : ""}
                        {h.userRpe ? ` · RPE ${h.userRpe}` : ""}
                        {" · "}
                        {h.setCount} séries
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        h.status === "done"
                          ? "border-emerald-500/30 text-emerald-500"
                          : "border-amber-500/30 text-amber-500"
                      }
                    >
                      {h.status === "done" ? "Finalizado" : "Pendente"}
                    </Badge>
                    <ChevronRight
                      className="size-4 text-muted-foreground shrink-0"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
