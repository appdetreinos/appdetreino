import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Dumbbell, ChevronRight } from "lucide-react";

type WorkoutListItem = {
  id: string;
  title: string;
  goal: string | null;
  student_id: string | null;
  workout_days: { id: string; day_of_week: number }[] | null;
};

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Lista treinos do trainer (templates: student_id null; atribuídos: preenchido)
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("id, title, goal, student_id, workout_days(id, day_of_week)")
    .eq("trainer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

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
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Treinos</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} templates · {assigned.length} atribuídos
          </p>
        </div>
        <ButtonLink href="/app/workouts/new" className="font-semibold">
          <Plus className="size-4" />
          Novo treino
        </ButtonLink>
      </header>

      {/* Templates do trainer */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Templates
        </h2>
        {templates.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="size-6" />}
            title="Nenhum template ainda"
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

      {/* Atribuídos */}
      {assigned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Atribuídos
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assigned.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function WorkoutCard({ workout }: { workout: WorkoutListItem }) {
  const daysCount = Array.isArray(workout.workout_days) ? workout.workout_days.length : 0;
  return (
    <Link href={`/app/workouts/${workout.id}`} className="block group">
      <Card className="bg-card border-white/5 p-5 hover:border-primary/40 transition-colors">
        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Dumbbell className="size-5" />
        </div>
        <h3 className="mt-4 font-bold truncate">{workout.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {daysCount > 0 ? `${daysCount} dia${daysCount > 1 ? "s" : ""}` : "Vazio"}
          </span>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
