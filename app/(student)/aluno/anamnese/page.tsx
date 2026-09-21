import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { AnamnesisForm } from "./anamnesis-form";
import { AnamnesisWizard } from "./anamnesis-wizard";
import { ClipboardList, Check } from "lucide-react";

type Question = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "multiselect" | "number";
  options?: string[];
  required?: boolean;
};

// Acima desse nº de perguntas o aluno vê uma wizard com progresso;
// abaixo, formulário contínuo (mais rápido em templates curtos).
const WIZARD_THRESHOLD = 4;

export default async function AnamnesePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Pega template ativo do trainer do aluno
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("trainer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const templateQuery = studentProfile?.trainer_id
    ? await supabase
        .from("anamnesis_templates")
        .select("id, title, questions")
        .eq("trainer_id", studentProfile.trainer_id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const template = templateQuery.data as
    | { id: string; title: string; questions: Question[] }
    | null;

  // Anamnese já respondida?
  const { data: existing } = await supabase
    .from("anamnesis")
    .select("id, answers, completed_at")
    .eq("student_id", user.id)
    .maybeSingle();

  if (!template) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight">Anamnese</h1>
        <Card className="bg-card border-dashed border-white/10 p-8 text-center mt-6">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <ClipboardList className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Sem questionário configurado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Seu personal ainda não criou um questionário. Fale com ele.
          </p>
        </Card>
      </div>
    );
  }

  const useWizard = (template.questions ?? []).length >= WIZARD_THRESHOLD;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Anamnese</h1>
        <p className="text-sm text-muted-foreground">{template.title}</p>
      </header>

      {existing?.completed_at && !useWizard && (
        <Card className="bg-emerald-500/10 border-emerald-500/30 p-4 flex items-center gap-3">
          <Check className="size-5 text-emerald-500 shrink-0" />
          <div className="text-sm">
            <strong>Anamnese concluída.</strong> Seu personal já viu suas respostas.
            <br />
            <span className="text-xs text-muted-foreground">
              Você pode atualizar abaixo se algo mudou.
            </span>
          </div>
        </Card>
      )}

      {useWizard ? (
        <AnamnesisWizard
          template={template}
          existingAnswers={(existing?.answers as Record<string, unknown>) ?? {}}
        />
      ) : (
        <AnamnesisForm
          template={template}
          existingAnswers={(existing?.answers as Record<string, unknown>) ?? {}}
        />
      )}
    </div>
  );
}
