import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { notFound } from "next/navigation";
import { Phone, Mail, Calendar, Dumbbell, Salad } from "lucide-react";
import { MeasurementForm } from "./measurement-form";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Profile + student_profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url")
    .eq("id", id)
    .maybeSingle();

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("status, birth_date, goals, plan_tier, xp_total")
    .eq("user_id", id)
    .maybeSingle();

  // Garante que o aluno pertence ao trainer logado
  if (!studentProfile || !profile) {
    notFound();
  }

  const { data: trainerCheck } = await supabase
    .from("student_profiles")
    .select("trainer_id")
    .eq("user_id", id)
    .eq("trainer_id", user.id)
    .maybeSingle();

  if (!trainerCheck) {
    notFound();
  }

  // Medições recentes
  const { data: measurements } = await supabase
    .from("measurements")
    .select("id, date, weight_kg, body_fat_pct, waist_cm")
    .eq("student_id", id)
    .order("date", { ascending: false })
    .limit(5);

  // Workouts atribuídos
  const { data: workouts } = await supabase
    .from("workouts")
    .select("id, title, goal")
    .eq("student_id", id)
    .limit(5);

  // Dietas
  const { data: diets } = await supabase
    .from("diets")
    .select("id, title, kcal_target")
    .eq("student_id", id)
    .limit(5);

  // Pagamentos pendentes
  const { data: pendingPayments } = await supabase
    .from("payments")
    .select("id, amount, due_date, description")
    .eq("student_id", id)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
    .limit(5);

  const initials = profile.full_name.slice(0, 2).toUpperCase();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header do perfil */}
      <Card className="bg-card border-white/5 p-6">
        <div className="flex items-start gap-4">
          <div className="size-16 rounded-full bg-primary/10 text-primary grid place-items-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                {profile.full_name}
              </h1>
              <Badge variant="outline">{studentProfile.status}</Badge>
              {studentProfile.plan_tier && (
                <Badge variant="outline">{studentProfile.plan_tier}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {profile.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {profile.email}
                </span>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {profile.phone}
                </span>
              )}
              {studentProfile.birth_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {new Date(studentProfile.birth_date).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
            {studentProfile.goals && (
              <p className="text-sm mt-3 italic">"{studentProfile.goals}"</p>
            )}
          </div>
          <ButtonLink href={`/app/finance/new?student_id=${id}`} size="sm">
            Nova cobrança
          </ButtonLink>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Medições */}
        <Card className="bg-card border-white/5 p-5">
          <h2 className="font-semibold mb-3">Últimas medições</h2>
          <MeasurementForm studentId={id} />
          {(!measurements || measurements.length === 0) ? (
            <p className="text-sm text-muted-foreground mt-3">
              Nenhuma medição registrada.
            </p>
          ) : (
            <ul className="space-y-2 mt-4">
              {measurements.map((m) => (
                <li key={m.id} className="text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {new Date(m.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    <span className="font-mono">
                      {m.weight_kg != null && `${m.weight_kg.toFixed(1)} kg`}
                      {m.body_fat_pct != null && ` · ${m.body_fat_pct.toFixed(1)}%`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Treinos */}
        <Card className="bg-card border-white/5 p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Dumbbell className="size-4" />
            Treinos atribuídos
          </h2>
          {(!workouts || workouts.length === 0) ? (
            <p className="text-sm text-muted-foreground">Nenhum treino atribuído.</p>
          ) : (
            <ul className="space-y-2">
              {workouts.map((w) => (
                <li key={w.id} className="text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                  <div className="font-medium">{w.title}</div>
                  {w.goal && (
                    <div className="text-xs text-muted-foreground">{w.goal}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Dietas */}
        <Card className="bg-card border-white/5 p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Salad className="size-4" />
            Dietas
          </h2>
          {(!diets || diets.length === 0) ? (
            <p className="text-sm text-muted-foreground">Nenhuma dieta.</p>
          ) : (
            <ul className="space-y-2">
              {diets.map((d) => (
                <li key={d.id} className="text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                  <div className="font-medium">{d.title}</div>
                  {d.kcal_target != null && (
                    <div className="text-xs text-muted-foreground">
                      {d.kcal_target} kcal/dia
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Pagamentos */}
        <Card className="bg-card border-white/5 p-5">
          <h2 className="font-semibold mb-3">Pagamentos pendentes</h2>
          {(!pendingPayments || pendingPayments.length === 0) ? (
            <p className="text-sm text-muted-foreground">Nada em aberto.</p>
          ) : (
            <ul className="space-y-2">
              {pendingPayments.map((p) => (
                <li key={p.id} className="text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                  <div className="flex justify-between">
                    <span className="truncate">{p.description ?? "—"}</span>
                    <span className="font-mono">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(p.amount))}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vence {new Date(p.due_date).toLocaleDateString("pt-BR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
