import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, MapPin, Video, Clock } from "lucide-react";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function AgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Tipos de agendamento
  const { data: types } = await supabase
    .from("appointment_types")
    .select("id, name, duration_minutes, type, price_cents, color, active")
    .eq("trainer_id", user.id)
    .order("active", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);

  // Próximos agendamentos (a partir de hoje)
  const nowIso = new Date().toISOString();
  const { data: upcoming } = await supabase
    .from("appointments")
    .select(
      `id, title, starts_at, ends_at, status, location, notes,
       appointment_types:appointment_type_id(name, type, color),
       student:student_id(full_name)`,
    )
    .eq("trainer_id", user.id)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(20);

  // Disponibilidade semanal
  const { data: availability } = await supabase
    .from("trainer_availability")
    .select("id, weekday, start_time, end_time")
    .eq("trainer_id", user.id)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  const list = (upcoming ?? []) as UpcomingAppointment[];
  const todayList = list.filter((a) => {
    const d = new Date(a.starts_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {todayList.length} atendimento{todayList.length === 1 ? "" : "s"} hoje
          </p>
        </div>
        <ButtonLink href="/app/agenda/new" className="font-semibold">
          <Plus className="size-4" />
          Novo agendamento
        </ButtonLink>
      </header>

      <section className="grid lg:grid-cols-3 gap-6">
        {/* Tipos de agendamento */}
        <Card className="bg-card border-white/5 p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="size-4" />
            Tipos
          </h2>
          {(types ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {(types ?? []).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-sm font-medium truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <span>{t.duration_minutes}min</span>
                    {!t.active && <Badge variant="outline">Inativo</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ButtonLink
            href="/app/agenda/types"
            variant="outline"
            className="w-full mt-3"
            size="sm"
          >
            Gerenciar tipos
          </ButtonLink>
        </Card>

        {/* Disponibilidade */}
        <Card className="bg-card border-white/5 p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="size-4" />
            Disponibilidade
          </h2>
          {(availability ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Configure os dias e horários que você atende.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {(availability ?? []).map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="font-medium">{DAY_NAMES[a.weekday]}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {a.start_time} → {a.end_time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Resumo rápido */}
        <Card className="bg-card border-white/5 p-5">
          <h2 className="font-semibold mb-3">Resumo</h2>
          <div className="space-y-2 text-sm">
            <Row label="Total tipos" value={String((types ?? []).length)} />
            <Row label="Tipos ativos" value={String((types ?? []).filter((t) => t.active).length)} />
            <Row label="Agendamentos futuros" value={String(list.length)} />
            <Row label="Dias com horário" value={String(new Set((availability ?? []).map((a) => a.weekday)).size)} />
          </div>
        </Card>
      </section>

      {/* Próximos atendimentos */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Próximos atendimentos
        </h2>
        {list.length === 0 ? (
          <Card className="bg-card border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum agendamento futuro. Crie o primeiro.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.slice(0, 10).map((a) => (
              <AppointmentRow key={a.id} apt={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type UpcomingAppointment = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  location: string | null;
  notes: string | null;
  appointment_types:
    | { name: string; type: string; color: string }
    | { name: string; type: string; color: string }[]
    | null;
  student: { full_name: string } | { full_name: string }[] | null;
};

function AppointmentRow({ apt }: { apt: UpcomingAppointment }) {
  const start = new Date(apt.starts_at);
  const end = new Date(apt.ends_at);
  const type = Array.isArray(apt.appointment_types) ? apt.appointment_types[0] : apt.appointment_types;
  const student = Array.isArray(apt.student) ? apt.student[0] : apt.student;
  const Icon = type?.type === "online" ? Video : MapPin;

  return (
    <Card className="bg-card border-white/5 p-4 flex items-center gap-4">
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
          <Badge variant="outline" className="shrink-0">
            {apt.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="font-mono">
            {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            {" → "}
            {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {student && (
            <span className="truncate">· {student.full_name}</span>
          )}
          {apt.location && (
            <span className="truncate">· {apt.location}</span>
          )}
        </div>
      </div>
      {type && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: type.color }}
          />
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{type.name}</span>
        </div>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
