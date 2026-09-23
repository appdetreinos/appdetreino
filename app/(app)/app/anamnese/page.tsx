import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ArrowLeft, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { AnamnesisBuilder } from "./builder";
import { TemplateActions } from "./actions";

/**
 * Anamnese do trainer: cria questionários personalizados
 * (upsell do Premium) e lê as respostas dos alunos.
 */
export default async function AnamnesePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: templates } = await supabase
    .from("anamnesis_templates")
    .select("id, title, questions, active, created_at")
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .order("created_at", { ascending: false });

  const list = ((templates ?? []) as Array<{
    id: string;
    title: string;
    questions: Array<{ key: string; label: string }>;
    active: boolean;
    created_at: string;
  }>);

  // Respostas por template (conta + últimas)
  const { data: answers } = await supabase
    .from("anamnesis")
    .select("id, student_id, answers, completed_at, student:student_id(full_name)")
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .order("completed_at", { ascending: false })
    .limit(30);

  const answersList = ((answers ?? []) as Array<{
    id: string;
    student_id: string;
    answers: Record<string, unknown>;
    completed_at: string | null;
    student: { full_name: string } | { full_name: string }[] | null;
  }>);

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Anamnese</h1>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <AnamnesisBuilder />

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card border-white/5 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="size-4" />
              Meus questionários ({list.length})
            </h2>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cria o primeiro acima. O aluno responde no app e você lê aqui.
              </p>
            ) : (
              <ul className="space-y-3">
                {list.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-background/40 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{t.title}</span>
                        <Badge variant="outline" className={t.active ? "border-emerald-500/30 text-emerald-500 text-[10px]" : "text-[10px]"}>
                          {t.active ? "ativo" : "inativo"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {(t.questions ?? []).length} perguntas
                      </div>
                    </div>
                    <TemplateActions id={t.id} active={t.active} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="bg-card border-white/5 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <User className="size-4" />
              Respostas recentes
            </h2>
            {answersList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aluno respondeu ainda.</p>
            ) : (
              <ul className="space-y-3">
                {answersList.map((a) => {
                  const s = Array.isArray(a.student) ? a.student[0] : a.student;
                  const entries = Object.entries(a.answers ?? {}).slice(0, 4);
                  return (
                    <li key={a.id} className="rounded-lg border border-white/5 bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">{s?.full_name ?? "Aluno"}</span>
                        {a.completed_at && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(a.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </div>
                      <dl className="mt-2 space-y-1">
                        {entries.map(([k, v]) => (
                          <div key={k} className="text-xs">
                            <dt className="text-muted-foreground truncate">{k}</dt>
                            <dd className="font-medium break-words">{String(v ?? "—").slice(0, 200)}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
