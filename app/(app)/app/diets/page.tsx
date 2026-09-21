import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Salad, ChevronRight } from "lucide-react";

type DietListItem = {
  id: string;
  title: string;
  kcal_target: number | null;
  p_target: number | null;
  student_id: string | null;
};

export default async function DietsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: diets, error } = await supabase
    .from("diets")
    .select("id, title, kcal_target, p_target, student_id")
    .eq("trainer_id", user.id)
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

  const list = (diets ?? []) as DietListItem[];
  const templates = list.filter((d) => !d.student_id);
  const assigned = list.filter((d) => d.student_id);

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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Templates
        </h2>
        {templates.length === 0 ? (
          <EmptyState
            title="Nenhuma dieta ainda"
            description="Cria um plano alimentar base que você adapta pra cada aluno."
            cta={{ href: "/app/diets/new", label: "Criar primeira dieta" }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((d) => (
              <DietCard key={d.id} diet={d} />
            ))}
          </div>
        )}
      </section>

      {assigned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
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
