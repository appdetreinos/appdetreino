"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Power, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TemplateActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("anamnesis_templates").update({ active: !active }).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Apagar este questionário? As respostas dos alunos são mantidas.")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("anamnesis_templates").delete().eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5 shrink-0">
      <Button size="sm" variant="outline" onClick={toggle} disabled={busy} title={active ? "Desativar" : "Ativar"}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
      </Button>
      <Button size="sm" variant="outline" onClick={remove} disabled={busy} title="Apagar">
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
