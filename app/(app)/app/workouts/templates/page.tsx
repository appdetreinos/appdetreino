import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Clock,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/stagger";
import { TemplateUseButton } from "./template-use-button";
import { AiSuggest } from "./ai-suggest";

/**
 * Biblioteca de templates — mostra os 4 templates globais + opção
 * de "usar template" que abre dialog de seleção de aluno.
 */
export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Busca templates globais + itens (com nome do exercício pra mostrar na lista)
  const { data: templates } = await supabase
    .from("workout_templates")
    .select(
      `id, slug, title, description, category, difficulty, estimated_minutes,
       workout_template_items(
         position, sets, reps,
         exercises:exercise_id(name)
       )`,
    )
    .eq("is_global", true)
    .order("title");

  // Lista de alunos do trainer (pra atribuir).
  // NÃO filtra por status — `/app/students` não filtra, então a definição
  // canônica de "tem aluno" aqui é qualquer row em `student_profiles`
  // pra esse trainer. Caso contrário, alunos recém-criados/inativos
  // fariam o CTA "Convide um aluno primeiro" persistir nos templates.
  const { data: students } = await supabase
    .from("student_profiles")
    .select("user_id, full_name")
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .order("full_name");

  const studentOptions = (students ?? []).map((s) => ({
    id: s.user_id,
    name: s.full_name,
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/workouts" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Templates prontos</h1>
            <p className="text-xs text-foreground/65">Começa do que já funciona</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-4">
        <AiSuggest />
        {/* CTA primário */}
        <Card className="bg-card/80 border-white/10 p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary shrink-0">
              <Plus className="size-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">Treino do zero</h2>
              <p className="text-sm text-foreground/65 mt-0.5">
                Monta exercício por exercício, com séries e cargas customizadas.
              </p>
            </div>
            <ButtonLink href="/app/workouts/new" variant="outline" className="shrink-0">
              Montar do zero
              <ChevronRight className="size-4" />
            </ButtonLink>
          </div>
        </Card>

        <Stagger className="grid sm:grid-cols-2 gap-4" delay={0.05}>
          {(templates ?? []).map((t) => {
            const items = (t.workout_template_items ?? []) as Array<{
              position: number;
              sets: number;
              reps: string;
              exercises: { name: string } | { name: string }[] | null;
            }>;
            const exerciseNames = items
              .slice(0, 4)
              .map((i) => {
                const ex = Array.isArray(i.exercises) ? i.exercises[0] : i.exercises;
                return ex?.name ?? "—";
              });

            return (
              <StaggerItem key={t.id}>
                <Card className="bg-card/80 border-white/10 p-5 flex flex-col hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg">{t.title}</h3>
                      <p className="text-sm text-foreground/65 mt-0.5 line-clamp-2">
                        {t.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.category && (
                      <Badge variant="secondary" className="capitalize bg-primary/10 text-primary border-primary/20">
                        <Dumbbell className="size-3 mr-1" />
                        {t.category.replace("_", " ")}
                      </Badge>
                    )}
                    {t.estimated_minutes && (
                      <Badge variant="secondary" className="bg-background/40">
                        <Clock className="size-3 mr-1" />
                        ~{t.estimated_minutes} min
                      </Badge>
                    )}
                    {t.difficulty && (
                      <Badge variant="secondary" className="bg-background/40 capitalize">
                        <TrendingUp className="size-3 mr-1" />
                        {t.difficulty}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5">
                    {exerciseNames.map((name, i) => (
                      <div
                        key={i}
                        className="text-sm text-foreground/85 flex items-center gap-2"
                      >
                        <span className="size-5 grid place-items-center rounded-full bg-background/60 text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        {name}
                      </div>
                    ))}
                    {items.length > 4 && (
                      <div className="text-xs text-muted-foreground pl-7">
                        +{items.length - 4} exercícios
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/5 flex justify-end">
                    <TemplateUseButton
                      templateId={t.id}
                      templateTitle={t.title}
                      students={studentOptions}
                    />
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      </main>
    </div>
  );
}
