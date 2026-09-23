import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Droplets, Moon, Footprints, Salad, BookOpen } from "lucide-react";
import { todayBR } from "@/lib/utils/date";

/**
 * Hábitos dos alunos — trainer vê compliance de hoje.
 *
 * Schema:
 *   habits( id, trainer_id, student_id, name, icon, target, unit )
 *   habit_logs( habit_id, student_id, logged_at, count )
 * Uniqueness: (habit_id, logged_at)
 */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  droplets: Droplets,
  moon: Moon,
  footprints: Footprints,
  salad: Salad,
  bookopen: BookOpen,
};

function pickIcon(name: string) {
  const key = name.toLowerCase();
  for (const [k, Ico] of Object.entries(ICON_MAP)) {
    if (key.includes(k)) return Ico;
  }
  return BookOpen;
}

type Row = {
  id: string;
  name: string;
  icon: string | null;
  target_count: number | null;
  unit: string | null;
  student_id: string;
  student_name: string;
  today_count: number | null;
};

function progresso(feito: number, meta: number): number {
  if (meta <= 0) return 100;
  return Math.min(100, Math.round((feito / meta) * 100));
}

export default async function HabitosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayBR();

  // Habits do trainer + logs de hoje.
  // Duas queries simples (sem JOIN frágil): habits + profiles dos alunos.
  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, icon, target_count, unit, student_id")
      .eq("trainer_id", user.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("habit_logs")
      .select("habit_id, count")
      .eq("logged_at", today),
  ]);

  // Nomes dos alunos (lookup separado — evita join PostgREST frágil)
  const studentIds = Array.from(new Set((habits ?? []).map((h) => h.student_id).filter(Boolean)));
  let nameMap = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds as string[]);
    nameMap = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string) ?? "Sem nome"]));
  }

  type HabitRow = {
    id: string;
    name: string;
    icon: string | null;
    target_count: number | null;
    unit: string | null;
    student_id: string;
  };

  const habitsRaw = (habits ?? []) as unknown as HabitRow[];

  const logMap = new Map<string, number>();
  (logs ?? []).forEach((l: { habit_id: string; count: number }) => {
    logMap.set(l.habit_id, l.count);
  });

  // Agrupa por aluno
  const byStudent = new Map<string, { student_name: string; rows: Row[] }>();
  for (const h of habitsRaw) {
    const sName = nameMap.get(h.student_id) ?? "Sem nome";
    const sid = h.student_id;

    if (!byStudent.has(sid)) {
      byStudent.set(sid, { student_name: sName, rows: [] });
    }
    const entry = byStudent.get(sid)!;
    entry.rows.push({
      id: h.id,
      name: h.name,
      icon: h.icon,
      target_count: h.target_count,
      unit: h.unit,
      student_id: h.student_id,
      student_name: sName,
      today_count: logMap.get(h.id) ?? 0,
    });
  }

  const groups = Array.from(byStudent.values());

  return (
    <div className="p-5 md:p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Hábitos</h1>
          <p className="text-sm text-muted-foreground">
            Atribua hábitos aos alunos e acompanhe o compliance semanal
          </p>
        </div>
        <ButtonLink href="/app/habitos/new" className="font-semibold">
          <Plus className="size-4" />
          Novo hábito
        </ButtonLink>
      </header>

      {groups.length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum hábito atribuído ainda.
          </p>
          <ButtonLink href="/app/habitos/new" className="mt-4">
            Atribuir o primeiro hábito
          </ButtonLink>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((aluno) => {
            const totalProgress =
              aluno.rows.reduce(
                (acc, r) => acc + progresso(r.today_count ?? 0, r.target_count ?? 1),
                0,
              ) / Math.max(aluno.rows.length, 1);

            const iniciais = aluno.student_name
              .split(" ")
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <Card key={aluno.student_name + aluno.rows.length} className="bg-card border-white/5 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 shrink-0 rounded-full bg-primary/15 grid place-items-center text-xs font-bold text-primary">
                    {iniciais || "??"}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{aluno.student_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Compliance hoje: {Math.round(totalProgress)}%
                    </div>
                  </div>
                  <div className="relative size-12 shrink-0">
                    <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="oklch(0.685 0.196 38.5)"
                        strokeWidth="3"
                        strokeDasharray={`${totalProgress}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 grid place-items-center text-xs font-bold">
                      {Math.round(totalProgress)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {aluno.rows.map((h) => {
                    const pct = progresso(h.today_count ?? 0, h.target_count ?? 1);
                    const Icon = pickIcon(h.icon ?? h.name);
                    return (
                      <div key={h.id} className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-sm truncate">{h.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0 num tabular-nums">
                              {h.today_count ?? 0}
                              {h.unit ? ` ${h.unit}` : ""} / {h.target_count ?? 1}
                              {h.unit ? ` ${h.unit}` : ""}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        {pct >= 100 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                            ✓ feito
                          </Badge>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
