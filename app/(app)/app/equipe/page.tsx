"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Trash2, Users } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

type Member = {
  id: string;
  member_id: string;
  role: string;
  status: string;
  member: { full_name: string } | { full_name: string }[] | null;
};

/**
 * Equipe (plano Top): colaboradores operam a consultoria junto.
 * A pessoa precisa ter conta de profissional; entra na hora.
 */
export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await csrfFetch("/api/trainer/team");
      const json = (await res.json()) as { ok: boolean; members?: Member[] };
      if (json.ok) setMembers(json.members ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.includes("@")) {
      setMsg({ ok: false, text: "E-mail inválido." });
      return;
    }
    setSaving(true);
    try {
      const res = await csrfFetch("/api/trainer/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMsg({ ok: false, text: json.error ?? "Não deu pra adicionar." });
      } else {
        setEmail("");
        setMsg({ ok: true, text: "Colaborador adicionado." });
        load();
      }
    } catch {
      setMsg({ ok: false, text: "Falha de conexão." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(member_id: string) {
    if (!confirm("Remover esse colaborador da equipe?")) return;
    await csrfFetch("/api/trainer/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id }),
    });
    load();
  }

  const nameOf = (m: Member) => {
    const rel = Array.isArray(m.member) ? m.member[0] : m.member;
    return rel?.full_name ?? "Profissional";
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">Equipe</h1>
          <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Top</Badge>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-4">
        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="font-semibold mb-1">Adicionar colaborador</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Estagiário, sócio ou assistente com conta de profissional enxerga e opera teus alunos, treinos e finanças.
          </p>
          <form onSubmit={add} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="tm-email" className="sr-only">E-mail</Label>
              <Input
                id="tm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parceiro@email.com"
              />
            </div>
            <Button type="submit" disabled={saving} className="font-semibold">
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Adicionar"}
            </Button>
          </form>
          {msg && (
            <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-500" : "text-destructive"}`}>{msg.text}</p>
          )}
        </Card>

        <Card className="bg-card/80 border-white/10 p-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="size-4" />
            Quem opera comigo ({members.length})
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Só você por enquanto.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-background/40 px-3 py-2.5">
                  <span className="flex-1 font-semibold text-sm truncate">{nameOf(m)}</span>
                  <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                  <button
                    type="button"
                    onClick={() => remove(m.member_id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${nameOf(m)}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
