import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { AppointmentTypeRow } from "./appointment-type-row";
import { Plus } from "lucide-react";

export default async function AppointmentTypesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: types, error } = await supabase
    .from("appointment_types")
    .select("id, name, duration_minutes, type, price_cents, color, active")
    .eq("trainer_id", user.id)
    .order("active", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Tipos de agendamento</h1>
        <p className="text-sm text-destructive">Erro: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tipos de agendamento</h1>
          <p className="text-sm text-muted-foreground">
            Sessões que você oferece aos alunos
          </p>
        </div>
        <ButtonLink href="/app/agenda/types/new" className="font-semibold">
          <Plus className="size-4" />
          Novo tipo
        </ButtonLink>
      </header>

      {(!types || types.length === 0) ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Crie seu primeiro tipo. Ex: "Avaliação inicial" (60min), "Consulta online" (30min).
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {types.map((t) => (
            <AppointmentTypeRow key={t.id} type={t} />
          ))}
        </div>
      )}
    </div>
  );
}
