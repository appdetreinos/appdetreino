import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Plus,
  Dumbbell,
  ChevronRight,
  Sparkles,
  Library,
  Calendar,
} from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/stagger";

type WorkoutListItem = {
  id: string;
  title: string;
  goal: string | null;
  student_id: string | null;
  student_profiles?: { full_name: string } | { full_name: string }[] | null;
  workout_days: { id: string; day_of_week: number }[] | null;
  updated_at?: string | null;
};

const DIA_LETRA = ["D", "S", "T", "Q", "Q", "S", "S"]; // dom=0 sab=6

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select(
      "id, title, goal, student_id, updated_at, workout_days(id, day_of_week), student_profiles(full_name)",
    )
    .eq("trainer_id", user.id)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const { count: globalTemplatesCount } = await supabase
    .from("workout_templates")
    .select("id", { count: "exact", head: true })
    .eq("is_global", true);

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Treinos</h1>
        <p className="text-sm text-destructive">Erro ao carregar: {error.message}</p>
      </div>
    );
  }

  const list = (workouts ?? []) as WorkoutListItem[];
  const templates = list.filter((w) => !w.student_id);
  const assigned = list.filter((w) => w.student_id);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-12">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Treinos</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} templates · {assigned.length} atribuídos a alunos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href="/app/workouts/templates" variant="outline" className="font-semibold">
            <Sparkles className="size-4" />
            Templates prontos
          </ButtonLink>
          <ButtonLink href="/app/workouts/new" className="font-semibold">
            <Plus className="size-4" />
            Novo treino
          </ButtonLink>
        </div>
      </header>

      {/* CTA biblioteca */}
      <Stagger delay={0.05}>
        <StaggerItem>
          <Card className="bg-gradient-to-br from-primary/20 via-primary/5 to-background border-primary/30 p-5 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, oklch(0.685 0.196 38.5 / 0.15) 0, transparent 40%)",
              }}
              aria-hidden
            />
            <div className="relative flex items-start gap-4">
              <div className="grid size-12 place-items-center rounded-xl bg-primary/20 text-primary shrink-0">
                <Library className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold">Biblioteca de templates</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {globalTemplatesCount ?? 0} templates prontos (Full Body A/B, Upper A, Lower B). Aplica em 1 clique a qualquer aluno.
                </p>
              </div>
              <ButtonLink href="/app/workouts/templates" variant="outline" className="shrink-0">
                Ver biblioteca
                <ChevronRight className="size-4" />
              </ButtonLink>
            </div>
          </Card>
        </StaggerItem>

        {/* Templates do trainer */}
        <StaggerItem>
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Meus templates
            </h2>
            {templates.length === 0 ? (
              <EmptyState
                icon={<Dumbbell className="size-6" />}
                title="Nenhum template seu ainda"
                description="Cria um treino reutilizável que você atribui pra vários alunos."
                cta={{ href: "/app/workouts/new", label: "Criar primeiro treino" }}
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((w) => (
                  <WorkoutCard key={w.id} workout={w} />
                ))}
              </div>
            )}
          </section>
        </StaggerItem>

        {/* Atribuídos */}
        {assigned.length > 0 && (
          <StaggerItem>
            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Atribuídos a alunos
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assigned.map((w) => (
                  <WorkoutCard key={w.id} workout={w} />
                ))}
              </div>
            </section>
          </StaggerItem>
        )}
      </Stagger>
    </div>
  );
}

function WorkoutCard({ workout }: { workout: WorkoutListItem }) {
  const daysCount = Array.isArray(workout.workout_days) ? workout.workout_days.length : 0;
  const daysList = (workout.workout_days ?? [])
    .map((d) => d.day_of_week)
    .sort((a, b) => a - b);

  const studentName = (() => {
    if (!workout.student_profiles) return null;
    const s = Array.isArray(workout.student_profiles)
      ? workout.student_profiles[0]
      : workout.student_profiles;
    return s?.full_name ?? null;
  })();

  return (
    <Link href={`/app/workouts/${workout.id}`} className="block group">
      <Card className="relative bg-card border-white/5 p-5 hover:border-primary/40 transition-colors overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <Dumbbell className="size-5" />
          </div>
          {studentName && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              {studentName}
            </Badge>
          )}
        </div>
        <h3 className="mt-4 font-bold truncate">{workout.title}</h3>
        {workout.goal && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{workout.goal}</p>
        )}

        {daysList.length > 0 && (
          <div className="mt-4 flex items-center gap-1">
            <Calendar className="size-3 text-muted-foreground mr-1" />
            {DIA_LETRA.map((letra, i) => {
              const ativo = daysList.includes(i);
              return (
                <span
                  key={i}
                  className={`grid size-6 place-items-center rounded-md text-[10px] font-bold ${
                    ativo
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary/40 text-muted-foreground/40"
                  }`}
                >
                  {letra}
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {daysCount > 0 ? `${daysCount} ${daysCount === 1 ? "dia" : "dias"}` : "Vazio"}
          </span>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <Card className="bg-card border-dashed border-white/10 p-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>
      {cta && (
        <ButtonLink href={cta.href} className="mt-5">
          {cta.label}
        </ButtonLink>
      )}
    </Card>
  );
}
