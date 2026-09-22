import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Salad, ChevronRight, Globe, User } from "lucide-react";
import { ApplyTemplateButton } from "./apply-template-button";

type DietListItem = {
  id: string;
  title: string;
  kcal_target: number | null;
  p_target: number | null;
  student_id: string | null;
};

type StudentOption = { id: string; name: string };

export default async function DietsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Templates globais + templates próprios do trainer
  const { data: templatesRaw } = await supabase
    .from("diet_templates")
    .select("id, title, description, kcal_target, p_target, goal, is_global, trainer_id")
    .or(`is_global.eq.true,trainer_id.eq.${user.id}`)
    .order("is_global", { ascending: false })
    .order("title");

  // Alunos ativos do trainer (pra aplicar template)
  const { data: studentsRaw } = await supabase
    .from("student_profiles")
    .select("user_id, full_name")
    .eq("trainer_id", user.id)
    .eq("status", "active")
    .order("full_name");
  const students = (studentsRaw ?? []).map((s) => ({
    id: s.user_id as string,
    name: (s.full_name as string) ?? "Aluno",
  }));

  // Dietas atribuídas (trainer criou e atribuiu a aluno)
  const { data: assignedRaw, error } = await supabase
    .from("diets")
    .select("id, title, kcal_target, p_target, student_id")
    .eq("trainer_id", user.id)
    .not("student_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Dietas</h1>
        <p className="text-sm text-destructive">Erro ao carregar: {error.message}</p>
      </div>
    );
  }

  const templates = (templatesRaw ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    kcal_target: number | null;
    p_target: number | null;
    goal: string | null;
    is_global: boolean;
    trainer_id: string | null;
  }>;
  const assigned = (assignedRaw ?? []) as DietListItem[];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dietas</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} templates · {assigned.length} atribuídas
          </p>
        </div>
        <ButtonLink href="/app/diets/new" className="font-semibold">
          <Plus className="size-4" />
          Nova dieta
        </ButtonLink>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Globe className="size-4" />
          Templates prontos
        </h2>
        {templates.length === 0 ? (
          <EmptyState
            title="Nenhum template ainda"
            description="Cria um plano alimentar base que você adapta pra cada aluno."
            cta={{ href: "/app/diets/new", label: "Criar primeiro template" }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <TemplateCard key={t.id} tpl={t} students={students} />
            ))}
          </div>
        )}
      </section>

      {assigned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <User className="size-4" />
            Atribuídas
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assigned.map((d) => (
              <DietCard key={d.id} diet={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TemplateCard({
  tpl,
  students,
}: {
  tpl: {
    id: string;
    title: string;
    description: string | null;
    kcal_target: number | null;
    p_target: number | null;
    goal: string | null;
    is_global: boolean;
    trainer_id: string | null;
  };
  students: StudentOption[];
}) {
  return (
    <Card className="bg-card border-white/5 p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Salad className="size-5" />
        </div>
        {tpl.is_global ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded">
            Pronto
          </span>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60 bg-muted px-2 py-0.5 rounded">
            Seu
          </span>
        )}
      </div>
      <h3 className="mt-4 font-bold">{tpl.title}</h3>
      {tpl.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {tpl.kcal_target != null && <span className="num font-bold text-foreground">{tpl.kcal_target} kcal</span>}
        {tpl.p_target != null && <span>{tpl.p_target}g P</span>}
        {tpl.goal && <span className="capitalize">· {tpl.goal}</span>}
      </div>
      <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
        <ApplyTemplateButton
          templateId={tpl.id}
          templateTitle={tpl.title}
          students={students}
        />
      </div>
    </Card>
  );
}

function DietCard({ diet }: { diet: DietListItem }) {
  const hasMacros = diet.kcal_target != null || diet.p_target != null;
  return (
    <Link href={`/app/diets/${diet.id}`} className="block group">
      <Card className="bg-card border-white/5 p-5 hover:border-primary/40 transition-colors">
        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Salad className="size-5" />
        </div>
        <h3 className="mt-4 font-bold truncate">{diet.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {hasMacros
              ? `${diet.kcal_target ?? "—"} kcal · ${diet.p_target ?? "—"}g P`
              : "Sem macros definidos"}
          </span>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <Card className="bg-card border-dashed border-white/10 p-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
        <Salad className="size-6" />
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

