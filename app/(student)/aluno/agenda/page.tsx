import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Calendar, MapPin, Video } from "lucide-react";

type Appt = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  location: string | null;
  notes: string | null;
  appointment_types:
    | { name: string; type: string; color?: string }
    | { name: string; type: string; color?: string }[]
    | null;
};

export default async function AgendaAlunoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nowIso = new Date().toISOString();

  // Próximos agendamentos do aluno
  const { data: upcoming } = await supabase
    .from("appointments")
    .select(
      `id, title, starts_at, ends_at, status, location, notes,
       appointment_types:appointment_type_id(name, type, color)`,
    )
    .eq("student_id", user.id)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(10);

  // Histórico
  const { data: past } = await supabase
    .from("appointments")
    .select(
      `id, title, starts_at, ends_at, status,
       appointment_types:appointment_type_id(name, type)`,
    )
    .eq("student_id", user.id)
    .lt("starts_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(5);

  const upList = (upcoming ?? []) as Appt[];
  const pastList = (past ?? []) as Appt[];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Minha agenda</h1>
          <p className="text-sm text-muted-foreground">
            {upList.length} agendamento{upList.length === 1 ? "" : "s"} futuro{upList.length === 1 ? "" : "s"}
          </p>
        </div>
        <ButtonLink href="#" className="font-semibold" variant="outline">
          <Calendar className="size-4" />
          Agendar
        </ButtonLink>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Próximos
        </h2>
        {upList.length === 0 ? (
          <Card className="bg-card border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sem agendamentos futuros. Solicite um horário com seu personal.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {upList.map((a) => (
              <ApptCard key={a.id} apt={a} />
            ))}
          </div>
        )}
      </section>

      {pastList.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Histórico
          </h2>
          <div className="space-y-2 opacity-70">
            {pastList.map((a) => (
              <ApptCard key={a.id} apt={a} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ApptCard({ apt, muted = false }: { apt: Appt; muted?: boolean }) {
  const start = new Date(apt.starts_at);
  const end = new Date(apt.ends_at);
  const type = Array.isArray(apt.appointment_types) ? apt.appointment_types[0] : apt.appointment_types;
  const Icon = type?.type === "online" ? Video : MapPin;

  return (
    <Card className={`bg-card border-white/5 p-4 flex items-center gap-4 ${muted ? "opacity-60" : ""}`}>
      <div className="text-center w-16 shrink-0">
        <div className="text-2xl font-bold leading-none">
          {start.toLocaleDateString("pt-BR", { day: "2-digit" })}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
          {start.toLocaleDateString("pt-BR", { weekday: "short" })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{apt.title}</h3>
          <Badge variant="outline" className="shrink-0 text-xs">
            {apt.status}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">
          {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {" → "}
          {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {apt.location && ` · ${apt.location}`}
        </div>
      </div>
      {type && (
        <div className="flex items-center gap-1.5 shrink-0">
          {type.color && (
            <span className="size-2 rounded-full" style={{ backgroundColor: type.color }} />
          )}
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium hidden sm:inline">{type.name}</span>
        </div>
      )}
    </Card>
  );
}
