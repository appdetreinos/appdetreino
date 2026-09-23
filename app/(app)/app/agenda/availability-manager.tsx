"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Slot = { id: string; weekday: number; start_time: string; end_time: string };

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Disponibilidade semanal do trainer (dias/horários que atende).
 */
export function AvailabilityManager({ initial }: { initial: Slot[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [weekday, setWeekday] = useState("1");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (start >= end) {
      setError("Fim precisa ser depois do início.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessão expirada.");
        setSaving(false);
        return;
      }
      const { data, error: insErr } = await supabase
        .from("trainer_availability")
        .insert({
          trainer_id: user.id,
          weekday: Number(weekday),
          start_time: start,
          end_time: end,
        })
        .select("id, weekday, start_time, end_time")
        .single();
      if (insErr || !data) {
        setError("Não deu pra salvar (horário duplicado?).");
      } else {
        setSlots((s) =>
          [...s, data as Slot].sort(
            (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time),
          ),
        );
        router.refresh();
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const prev = slots;
    setSlots((s) => s.filter((x) => x.id !== id));
    const supabase = createClient();
    const { error: delErr } = await supabase.from("trainer_availability").delete().eq("id", id);
    if (delErr) setSlots(prev);
    else router.refresh();
  }

  return (
    <div>
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Configure os dias e horários que você atende.
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm mb-3">
          {slots.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <span className="font-medium">{DAY_NAMES[a.weekday]}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">
                  {a.start_time.slice(0, 5)} → {a.end_time.slice(0, 5)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remover horário"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-3 pt-3 border-t border-white/5 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <div>
            <Label className="text-[11px]">Dia</Label>
            <select
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-background px-2 py-1.5 text-xs"
            >
              {DAY_NAMES.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[11px]">Início</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[11px]">Fim</Label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 h-8 text-xs" />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" variant="outline" disabled={saving} className="w-full">
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Adicionar horário
        </Button>
      </form>
    </div>
  );
}
