import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default async function AdminTrainersPage() {
  const supabase = await createClient();

  // Lista todos os trainers
  const { data: trainers } = await supabase
    .from("trainer_profiles")
    .select(
      `user_id, bio, plan_tier, trial_ends_at, onboarding_step,
       profile:user_id(full_name, email, created_at)`,
    )
    .order("user_id", { ascending: true })
    .limit(100);

  type Trainer = {
    user_id: string;
    bio: string | null;
    plan_tier: string;
    trial_ends_at: string | null;
    onboarding_step: number;
    profile: { full_name: string; email: string; created_at: string } | { full_name: string; email: string; created_at: string }[] | null;
  };

  const list = ((trainers ?? []) as Trainer[]).map((t) => {
    const p = Array.isArray(t.profile) ? t.profile[0] : t.profile;
    return {
      id: t.user_id,
      fullName: p?.full_name ?? "—",
      email: p?.email ?? "—",
      createdAt: p?.created_at ?? "",
      plan: t.plan_tier,
      onboarding: t.onboarding_step,
      trial: t.trial_ends_at,
    };
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Trainers</h1>
        <p className="text-sm text-muted-foreground">{list.length} cadastrados</p>
      </header>

      {list.length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <Users className="size-12 text-muted-foreground mx-auto" />
          <h3 className="mt-4 font-semibold">Nenhum trainer ainda</h3>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((t) => (
            <Card key={t.id} className="bg-card border-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold">
                  {t.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{t.fullName}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.email}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Badge variant="outline">{t.plan}</Badge>
                <Badge variant="outline">Step {t.onboarding}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Desde {new Date(t.createdAt).toLocaleDateString("pt-BR")}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
