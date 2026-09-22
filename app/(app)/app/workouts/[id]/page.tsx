import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkoutDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, title, goal, student_id, created_at, workout_days(id, title, day_of_week, workout_items(id, sets, reps, load, exercises(name)))")
    .eq("id", id)
    .eq("trainer_id", user.id)
    .maybeSingle();

  if (!workout) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Treino não encontrado</h1>
        <Link href="/app/workouts" className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block">
          ← Voltar pra lista
        </Link>
      </div>
    );
  }

  const days = (workout.workout_days ?? []) as unknown as Array<{
    id: string;
    title: string | null;
    day_of_week: number;
    workout_items: Array<{ id: string; sets: number; reps: string; load: string | null; exercises: { name: string } | { name: string }[] | null }>;
  }>;

  days.sort((a, b) => a.day_of_week - b.day_of_week);

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/workouts" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold truncate">{workout.title}</h1>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {workout.goal && (
          <p className="text-sm text-muted-foreground">{workout.goal}</p>
        )}

        {days.length === 0 && (
          <Card className="bg-card border-dashed border-white/10 p-8 text-center">
            <Dumbbell className="size-6 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Esse treino ainda não tem dias configurados.
            </p>
          </Card>
        )}

        {days.map((day) => (
          <Card key={day.id} className="bg-card/80 border-white/10 p-5">
            <h2 className="font-semibold mb-3">{day.title ?? `Dia ${day.day_of_week + 1}`}</h2>

            {day.workout_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem exercícios.</p>
            ) : (
              <ol className="space-y-2">
                {day.workout_items
                  .sort((a, b) => Number(a.id) - Number(b.id))
                  .map((item, idx) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-white/5 bg-background/40 px-3 py-2"
                    >
                      <div>
                        <span className="text-xs text-foreground/50 mr-2">{idx + 1}.</span>
                        <span className="font-medium">
                          {Array.isArray(item.exercises)
                            ? item.exercises[0]?.name
                            : item.exercises?.name ?? "—"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.sets}×{item.reps}
                        {item.load ? ` · ${item.load}` : ""}
                      </div>
                    </li>
                  ))}
              </ol>
            )}
          </Card>
        ))}

        <div className="flex justify-end">
          <ButtonLink href="/app/workouts" variant="outline">
            Voltar
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
