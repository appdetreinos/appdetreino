"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Criador de template de anamnese.
 * Uma pergunta por linha: "Pergunta | tipo | opcao1;opcao2"
 * tipos: text, textarea, number, select, multiselect
 */
export function AnamnesisBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parse(): Array<{ key: string; label: string; type: string; options?: string[]; required: boolean }> | null {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const validTypes = ["text", "textarea", "number", "select", "multiselect"];
    const out: Array<{ key: string; label: string; type: string; options?: string[]; required: boolean }> = [];
    for (let i = 0; i < lines.length; i++) {
      const [label, typeRaw, optsRaw] = lines[i].split("|").map((s) => s.trim());
      const type = (typeRaw || "text").toLowerCase();
      if (!label || !validTypes.includes(type)) return null;
      const q: { key: string; label: string; type: string; options?: string[]; required: boolean } = {
        key: `q${i + 1}`,
        label,
        type,
        required: false,
      };
      if ((type === "select" || type === "multiselect") && optsRaw) {
        q.options = optsRaw.split(";").map((o) => o.trim()).filter(Boolean);
      }
      out.push(q);
    }
    return out;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const questions = parse();
    if (title.trim().length < 3) {
      setError("Dá um título pro questionário.");
      return;
    }
    if (!questions) {
      setError("Formato inválido. Usa: Pergunta | tipo | opcao1;opcao2");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessão expirada. Entra de novo.");
        setSaving(false);
        return;
      }
      const { error: insErr } = await supabase.from("anamnesis_templates").insert({
        trainer_id: user.id,
        title: title.trim(),
        questions,
        active: true,
      });
      if (insErr) {
        setError("Não deu pra salvar.");
        setSaving(false);
        return;
      }
      setTitle("");
      setRaw("");
      router.refresh();
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-card border-white/5 p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2">
        <Plus className="size-4" />
        Novo questionário
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Uma pergunta por linha: <code className="px-1 rounded bg-background">Pergunta | tipo | opcao1;opcao2</code>
        <br />
        Tipos: text, textarea, number, select, multiselect. O aluno responde no app.
      </p>
      <form onSubmit={save} className="space-y-3">
        <div>
          <Label htmlFor="ana-title">Título</Label>
          <Input id="ana-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Anamnse inicial" maxLength={120} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="ana-qs">Perguntas</Label>
          <Textarea
            id="ana-qs"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={6}
            placeholder={"Qual seu objetivo? | select | emagrecer;hipertrofia;condicionamento\nTem alguma lesão? | textarea\nHá quanto tempo treina? | text"}
            className="mt-1.5 font-mono text-xs"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="font-semibold">
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar questionário"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
