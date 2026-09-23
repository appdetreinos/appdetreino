import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Salad, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/types/billing";
import { BuyButton } from "./buy-button";
import { SellManager, type OwnTemplate } from "./sell-manager";

/**
 * Vitrine (Prime: vender planilhas dentro da plataforma).
 * Compra planilha de outro trainer; pagamento via MP;
 * entrega automática no webhook (clone pro comprador).
 */
export default async function MarketplacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: workouts }, { data: diets }, { data: ownW }, { data: ownD }] = await Promise.all([
    supabase
      .from("workout_templates")
      .select("id, title, description, category, difficulty, price_cents, created_by, author:created_by(full_name)")
      .eq("is_for_sale", true)
      .neq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("diet_templates")
      .select("id, title, description, goal, kcal_target, price_cents, trainer_id, author:trainer_id(full_name)")
      .eq("is_for_sale", true)
      .neq("trainer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("workout_templates")
      .select("id, title, is_for_sale, price_cents")
      .eq("created_by", user.id)
      .eq("is_global", false)
      .order("title"),
    supabase
      .from("diet_templates")
      .select("id, title, is_for_sale, price_cents")
      .eq("trainer_id", user.id)
      .order("title"),
  ]);

  const wList = ((workouts ?? []) as Array<{
    id: string; title: string; description: string | null; category: string;
    difficulty: string; price_cents: number | null;
    author: { full_name: string } | { full_name: string }[] | null;
  }>);
  const dList = ((diets ?? []) as Array<{
    id: string; title: string; description: string | null; goal: string | null;
    kcal_target: number | null; price_cents: number | null;
    author: { full_name: string } | { full_name: string }[] | null;
  }>);

  const own: OwnTemplate[] = [
    ...((ownW ?? []) as Array<{ id: string; title: string; is_for_sale: boolean; price_cents: number | null }>).map((t) => ({ ...t, kind: "workout" as const })),
    ...((ownD ?? []) as Array<{ id: string; title: string; is_for_sale: boolean; price_cents: number | null }>).map((t) => ({ ...t, kind: "diet" as const })),
  ];

  const authorName = (a: { full_name: string } | { full_name: string }[] | null) =>
    (Array.isArray(a) ? a[0] : a)?.full_name ?? "Trainer";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Store className="size-6 text-primary" />
          Vitrine
        </h1>
        <p className="text-sm text-muted-foreground">
          Compra planilha pronta de outro profissional — cai direto nos teus templates.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Dumbbell className="size-4" />
          Treinos à venda ({wList.length})
        </h2>
        {wList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada à venda por enquanto.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wList.map((t) => (
              <Card key={t.id} className="bg-card border-white/5 p-5 flex flex-col">
                <h3 className="font-bold">{t.title}</h3>
                {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{t.difficulty}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">por {authorName(t.author)}</p>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <BuyButton kind="workout" templateId={t.id} priceCents={t.price_cents ?? 0} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Salad className="size-4" />
          Dietas à venda ({dList.length})
        </h2>
        {dList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada à venda por enquanto.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dList.map((t) => (
              <Card key={t.id} className="bg-card border-white/5 p-5 flex flex-col">
                <h3 className="font-bold">{t.title}</h3>
                {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                <div className="mt-2 flex gap-2">
                  {t.goal && <Badge variant="outline" className="text-[10px] capitalize">{t.goal}</Badge>}
                  {t.kcal_target != null && <Badge variant="outline" className="text-[10px]">{t.kcal_target} kcal</Badge>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  por {authorName(t.author)}{t.price_cents != null ? ` · ${formatBRL(t.price_cents / 100)}` : ""}
                </p>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <BuyButton kind="diet" templateId={t.id} priceCents={t.price_cents ?? 0} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Meus anúncios
        </h2>
        <Card className="bg-card border-white/5 p-5">
          <SellManager initial={own} />
        </Card>
      </section>
    </div>
  );
}
