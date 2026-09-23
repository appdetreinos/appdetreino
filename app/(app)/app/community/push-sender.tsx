"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, Loader2 } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/**
 * Disparo de push pra todos os alunos ativos.
 * Sem VAPID no servidor, mostra como gerar as chaves.
 */
export function PushSender({ configured }: { configured: boolean }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (title.trim().length < 2 || body.trim().length < 2) {
      setMsg({ ok: false, text: "Título e mensagem são obrigatórios." });
      return;
    }
    setSending(true);
    try {
      const res = await csrfFetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const json = (await res.json()) as { ok: boolean; sent?: number; targets?: number; error?: string };
      if (!res.ok || !json.ok) {
        setMsg({
          ok: false,
          text: json.error === "push_not_configured" ? "Push ainda não configurado no servidor." : (json.error ?? "Não deu pra enviar."),
        });
      } else {
        setMsg({ ok: true, text: `Enviado pra ${json.sent} de ${json.targets} alunos (resto sem ativação).` });
        setTitle("");
        setBody("");
      }
    } catch {
      setMsg({ ok: false, text: "Falha de conexão." });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="bg-card border-white/5 p-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2">
        <Bell className="size-4 text-primary" />
        Avisar alunos
      </h2>
      {!configured ? (
        <div className="text-xs text-muted-foreground space-y-2">
          <p>Push desligado. Pra ligar (1 min):</p>
          <code className="block rounded bg-background p-2 font-mono">npx web-push generate-vapid-keys</code>
          <p>
            Adiciona na Vercel: <strong>VAPID_PUBLIC_KEY</strong>,{" "}
            <strong>NEXT_PUBLIC_VAPID_PUBLIC_KEY</strong> (mesmo valor),{" "}
            <strong>VAPID_PRIVATE_KEY</strong> e <strong>VAPID_SUBJECT</strong>{" "}
            (mailto:seu@email.com). Redeploy e pronto.
          </p>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-2.5 mt-2">
          <div>
            <Label htmlFor="push-title" className="text-xs">Título</Label>
            <Input id="push-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Treino novo na área" maxLength={80} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="push-body" className="text-xs">Mensagem</Label>
            <Textarea id="push-body" value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Ex: Atualizei teu treino de pernas. Bora!" maxLength={200} className="mt-1" />
          </div>
          <Button type="submit" size="sm" disabled={sending} className="w-full font-semibold">
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
            Disparar push
          </Button>
          {msg && (
            <p className={`text-xs ${msg.ok ? "text-emerald-500" : "text-destructive"}`}>{msg.text}</p>
          )}
        </form>
      )}
    </Card>
  );
}
