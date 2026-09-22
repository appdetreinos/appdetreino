import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play, Repeat, Timer, Dumbbell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Página de detalhe do exercício — onde o aluno vê o GIF/vídeo
 * de execução + instruções.
 *
 * Acessível direto pelo ID (deep link) ou clicando no nome do
 * exercício na lista de treinos.
 */
export default async function ExercicioPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS já filtra: aluno só vê exercícios dos seus workouts
  const { data: exercise, error } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, instructions, video_url, media_type")
    .eq("id", id)
    .maybeSingle();

  if (error || !exercise) {
    notFound();
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 md:px-8 pt-6 pb-2 max-w-3xl mx-auto flex items-center justify-between gap-3">
        <Link
          href="/aluno/treinos"
          className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Treinos
        </Link>
      </header>

      <main className="px-5 md:px-8 max-w-3xl mx-auto">
        {/* Mídia (GIF ou vídeo) */}
        <Card className="overflow-hidden border-white/5 bg-card p-0">
          {exercise.video_url ? (
            <div className="relative aspect-video bg-black/40">
              {exercise.media_type === "video" ? (
                <video
                  src={exercise.video_url}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                // GIF Wikimedia (image/gif direto do upload.wikimedia.org)
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={exercise.video_url}
                  alt={`Execução de ${exercise.name}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              )}
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                <Play className="size-3" />
                Execução
              </span>
            </div>
          ) : (
            // Placeholder quando ainda não tem vídeo
            <div className="aspect-video grid place-items-center bg-gradient-to-br from-muted to-background">
              <div className="text-center">
                <div className="grid size-14 place-items-center rounded-full bg-background/40 text-muted-foreground mx-auto">
                  <Play className="size-7" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Vídeo de execução em breve
                </p>
              </div>
            </div>
          )}

          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight flex-1">
                {exercise.name}
              </h1>
              {exercise.muscle_group && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {exercise.muscle_group}
                </Badge>
              )}
            </div>

            {/* Quick info: equipamento + grupamento */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {exercise.equipment && (
                <div className="rounded-lg border border-white/5 bg-background/40 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Dumbbell className="size-3" />
                    Equipamento
                  </div>
                  <div className="mt-0.5 text-sm font-semibold capitalize">
                    {exercise.equipment}
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-white/5 bg-background/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Repeat className="size-3" />
                  Grupo
                </div>
                <div className="mt-0.5 text-sm font-semibold capitalize">
                  {exercise.muscle_group ?? "—"}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-background/40 p-3 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Timer className="size-3" />
                  Cadência
                </div>
                <div className="mt-0.5 text-sm font-semibold">2-1-2</div>
              </div>
            </div>

            {/* Instruções */}
            {exercise.instructions && (
              <div className="mt-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Como fazer
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                  {exercise.instructions}
                </p>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
