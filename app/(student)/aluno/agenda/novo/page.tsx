"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Calendar, MapPin, Video, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { csrfFetch } from "@/lib/security/client";

type ApptType = {
  id: string;
  name: string;
  duration_minutes: number;
  type: "presencial" | "online" | "avaliacao";
  color?: string;
};

type Slot = { start: string; end: string };

export default function NovoAgendamentoAlunoPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [types, setTypes] = useState<ApptType[]>([]);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [pickedType, setPickedType] = useState<ApptType | null>(null);
  const [pickedDate, setPickedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingTypes(false);
        return;
      }
      const { data: sp } = await supabase
        .from("student_profiles")
        .select("trainer_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!sp?.trainer_id) {
        setError("Você ainda não tem um personal vinculado.");
        setLoadingTypes(false);
        return;
      }
      setTrainerId(sp.trainer_id);
      const { data: aptTypes } = await supabase
        .from("appointment_types")
        .select("id, name, duration_minutes, type, color")
        .eq("trainer_id", sp.trainer_id)
        .eq("active", true)
        .order("name");
      setTypes((aptTypes ?? []) as ApptType[]);
      setLoadingTypes(false);
    })();
  }, []);

  // Quando escolhe tipo + data, busca slots livres
  useEffect(() => {
    if (!pickedType || !pickedDate || !trainerId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setPickedSlot(null);
    (async () => {
      const supabase = createClient();
      const weekday = new Date(pickedDate + "T12:00:00").getDay(); // 0=dom

      const { data: avail } = await supabase
        .from("trainer_availability")
        .select("start_time, end_time")
        .eq("trainer_id", trainerId)
        .eq("weekday", weekday);

      const dayStart = new Date(pickedDate + "T00:00:00");
      const dayEnd = new Date(pickedDate + "T23:59:59");
      const { data: busy } = await supabase
        .from("appointments")
        .select("starts_at, ends_at")
        .eq("trainer_id", trainerId)
        .neq("status", "cancelled")
        .gte("starts_at", dayStart.toISOString())
        .lte("starts_at", dayEnd.toISOString());

      // Gera slots por duração do tipo dentro de cada janela de disponibilidade
      const dur = pickedType.duration_minutes;
      const free: Slot[] = [];
      for (const w of avail ?? []) {
        const [sh, sm] = w.start_time.split(":").map(Number);
        const [eh, em] = w.end_time.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        for (let m = startMin; m + dur <= endMin; m += dur) {
          const s = new Date(pickedDate);
          s.setHours(Math.floor(m / 60), m % 60, 0, 0);
          const e = new Date(s.getTime() + dur * 60_000);
          // Pula slots passados (se for hoje)
          if (s.getTime() <= Date.now()) continue;
          // Verifica conflito com agendamentos existentes
          const conflict = (busy ?? []).some(
            (b) => new Date(b.starts_at) < e && new Date(b.ends_at) > s,
          );
          if (!conflict) free.push({ start: s.toISOString(), end: e.toISOString() });
        }
      }
      setSlots(free);
      setLoadingSlots(false);
    })();
  }, [pickedType, pickedDate, trainerId]);

  async function handleSubmit() {
    if (!pickedType || !pickedSlot || !trainerId) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessão expirou.");
        setSubmitting(false);
        return;
      }
      const res = await csrfFetch("/api/me/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainer_id: trainerId,
          student_id: user.id,
          appointment_type_id: pickedType.id,
          title: pickedType.name,
          starts_at: pickedSlot.start,
          ends_at: pickedSlot.end,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string };
        setError(body?.error ?? "Não deu pra agendar. Tenta outro horário.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setSubmitting(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Erro de rede.");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="bg-card/80 border-white/10 p-8 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
            <Calendar className="size-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold">Agendamento feito!</h2>
          <p className="mt-2 text-sm text-foreground/65">
            Teu personal vai receber e confirmar. Fica de olho no WhatsApp.
          </p>
          <ButtonLink href="/aluno/agenda" className="mt-6 font-semibold">
            Ver minha agenda
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const todayBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/aluno/agenda" className="text-foreground/70 hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">Novo agendamento</h1>
      </header>

      {error && (
        <Card className="bg-destructive/10 border-destructive/30 p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      {/* Passo 1 — Escolher tipo */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          1. Escolhe o tipo
        </h2>
        {loadingTypes ? (
          <div className="flex items-center gap-2 text-sm text-foreground/65">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : types.length === 0 ? (
          <Card className="bg-card/80 border-white/10 p-5 text-sm text-foreground/65">
            Seu personal ainda não configurou os tipos de agendamento. Fala com ele.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {types.map((t) => {
              const Icon = t.type === "online" ? Video : t.type === "avaliacao" ? Activity : MapPin;
              const active = pickedType?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPickedType(t)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-card hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.color && <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />}
                    <Icon className="size-4" />
                    <span className="font-semibold">{t.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t.duration_minutes} minutos
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Passo 2 — Escolher data */}
      {pickedType && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            2. Escolhe a data
          </h2>
          <input
            type="date"
            value={pickedDate}
            min={todayBR}
            onChange={(e) => setPickedDate(e.target.value)}
            className="h-11 rounded-md border border-white/10 bg-background px-3 text-sm"
          />
        </section>
      )}

      {/* Passo 3 — Escolher horário */}
      {pickedDate && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            3. Escolhe o horário
          </h2>
          {loadingSlots ? (
            <div className="flex items-center gap-2 text-sm text-foreground/65">
              <Loader2 className="size-4 animate-spin" /> Buscando horários livres…
            </div>
          ) : slots.length === 0 ? (
            <Card className="bg-card/80 border-white/10 p-5 text-sm text-foreground/65">
              Sem horários livres nesse dia. Tenta outra data.
            </Card>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((s) => {
                const active = pickedSlot?.start === s.start;
                const label = new Date(s.start).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => setPickedSlot(s)}
                    className={`rounded-md border px-3 py-2 text-sm font-mono font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/10 bg-card hover:border-white/30"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Passo 4 — Notas + confirmar */}
      {pickedSlot && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            4. Observações (opcional)
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Ex: Pode ser presencial, trazer roupa extra…"
            className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
          />
        </section>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <ButtonLink href="/aluno/agenda" variant="outline">
          Cancelar
        </ButtonLink>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!pickedSlot || submitting || pending}
          className="font-semibold"
        >
          {submitting || pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Agendando…
            </>
          ) : (
            "Confirmar agendamento"
          )}
        </Button>
      </div>
    </div>
  );
}
