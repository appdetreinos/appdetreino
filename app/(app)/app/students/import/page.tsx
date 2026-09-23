"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowLeft, Loader2, Upload, Check } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

type Parsed = { full_name: string; email?: string; phone?: string; goal?: string };

/**
 * Importação em massa (migração estilo Prime).
 * Cola CSV: nome;email;telefone;objetivo (cabeçalho opcional).
 */
export default function ImportStudentsPage() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; failed: number } | null>(null);

  function parse(text: string): Parsed[] {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const out: Parsed[] = [];
    for (const line of lines) {
      const [a, b, c, d] = line.split(";").map((s) => s.trim());
      if (!a || /^(nome|name|full_?name)/i.test(a)) continue; // pula cabeçalho
      const row: Parsed = { full_name: a };
      if (b && b.includes("@")) row.email = b;
      else if (b) row.phone = b;
      if (c && c.includes("@") && !row.email) row.email = c;
      else if (c) row.phone = row.phone ?? c;
      if (d) row.goal = d;
      if (row.full_name.length >= 2) out.push(row);
    }
    return out.slice(0, 200);
  }

  const preview = parse(raw);

  async function submit() {
    setError(null);
    setDone(null);
    if (preview.length === 0) {
      setError("Nada pra importar. Cola pelo menos uma linha.");
      return;
    }
    setSaving(true);
    try {
      const res = await csrfFetch("/api/trainer/import-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview }),
      });
      const json = (await res.json()) as { ok: boolean; created?: number; failed?: number; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Não deu pra importar.");
      } else {
        setDone({ created: json.created ?? 0, failed: json.failed ?? 0 });
        setRaw("");
        router.refresh();
      }
    } catch {
      setError("Falha de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/students" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Importar alunos</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-4">
        {done ? (
          <Card className="bg-card/80 border-white/10 p-8 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
              <Check className="size-7" />
            </div>
            <h2 className="mt-4 text-2xl font-bold">{done.created} convites criados</h2>
            <p className="mt-2 text-sm text-foreground/65">
              {done.failed > 0 ? `${done.failed} falharam. ` : ""}Os alunos entram na lista de pendentes.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <ButtonLink href="/app/students">Ver alunos</ButtonLink>
              <Button variant="outline" onClick={() => setDone(null)}>Importar mais</Button>
            </div>
          </Card>
        ) : (
          <Card className="bg-card/80 border-white/10 p-6">
            <p className="text-sm text-foreground/65 mb-4">
              Vindo de planilha ou outra plataforma? Cola aqui — 1 aluno por linha:
              <code className="block mt-2 px-2 py-1.5 rounded bg-background text-xs">nome;email;telefone;objetivo</code>
            </p>
            <Label htmlFor="csv">Lista de alunos</Label>
            <Textarea
              id="csv"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={8}
              placeholder={"Ana Beatriz;ana@email.com;11999998888;emagrecer\nCarlos Eduardo;carlos@email.com;;hipertrofia"}
              className="mt-1.5 font-mono text-xs"
            />
            {preview.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {preview.length} aluno(s) detectado(s): {preview.slice(0, 3).map((p) => p.full_name).join(", ")}
                {preview.length > 3 ? "…" : ""}
              </p>
            )}
            {error && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button onClick={submit} disabled={saving || preview.length === 0} className="font-semibold">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Criar {preview.length > 0 ? `${preview.length} ` : ""}convites
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
