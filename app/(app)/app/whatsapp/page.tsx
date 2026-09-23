import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { MessageCircle, CheckCircle2, QrCode, Settings2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { isEvolutionConfigured } from "@/lib/evolution/client";
import { WhatsappConnector } from "./connector";

/**
 * WhatsApp — status real da Evolution API.
 *
 * - Sem EVOLUTION_API_URL/KEY: guia de setup (sem mock morto).
 * - Configurado: QR real, estado da conexão, outbox (pendentes)
 *   e histórico de disparos.
 */
export default async function WhatsAppPage() {
  const configured = isEvolutionConfigured();

  if (!configured) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Cobrança e recados automáticos no chip da tua consultoria.
          </p>
        </header>

        <Card className="bg-card border-white/5 p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-yellow-500/15 text-yellow-500">
              <Settings2 className="size-6" />
            </div>
            <div className="flex-1">
              <div className="font-bold">Integração ainda não configurada</div>
              <div className="text-xs text-muted-foreground">
                O servidor precisa das credenciais da Evolution API.
              </div>
            </div>
            <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30">
              Setup pendente
            </Badge>
          </div>

          <ol className="mt-6 space-y-3 text-sm text-foreground/85 list-decimal list-inside">
            <li>Suba uma instância da <strong>Evolution API v2</strong> (VPS ou provedor).</li>
            <li>
              No painel da Vercel → Environment Variables, adicione:
              <code className="mx-1 px-1.5 py-0.5 rounded bg-background text-xs">EVOLUTION_API_URL</code>,
              <code className="mx-1 px-1.5 py-0.5 rounded bg-background text-xs">EVOLUTION_API_KEY</code> e
              <code className="mx-1 px-1.5 py-0.5 rounded bg-background text-xs">EVOLUTION_WEBHOOK_SECRET</code>.
            </li>
            <li>Faça redeploy. Voltando aqui, o QR Code real aparece.</li>
          </ol>

          <div className="mt-6 flex justify-center">
            <ButtonLink href="/app/finance" variant="outline">
              Enquanto isso, cobrar pelo Financeiro
            </ButtonLink>
          </div>
        </Card>

        <Card className="bg-card border-white/5 p-6">
          <h2 className="font-bold flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            Depois de conectar você pode:
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Cobrança automática todo dia 5 (via Financeiro → Recorrente)</li>
            <li>• Lembretes de treino, dieta e hábitos todo dia 7h</li>
            <li>• Histórico de mensagens de cada aluno no painel</li>
          </ul>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: instance }, { data: pending }, { data: history }] = await Promise.all([
    supabase
      .from("evolution_instances")
      .select("instance_name, state, phone, qr_code_base64")
      .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
      .maybeSingle(),
    supabase
      .from("evolution_messages")
      .select("id, to_phone, type, status, scheduled_for, created_at")
      .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("evolution_messages")
      .select("id, to_phone, from_phone, direction, type, status, sent_at, created_at")
      .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const inst = instance as { instance_name: string; state: string; phone: string | null; qr_code_base64: string | null } | null;
  const connected = inst?.state === "open";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            {connected ? `Conectado${inst?.phone ? ` · ${inst.phone}` : ""}` : "Conecta teu chip pra automatizar."}
          </p>
        </div>
        <Badge className={connected ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"}>
          {connected ? "Conectado" : (inst ? "Aguardando leitura" : "Desconectado")}
        </Badge>
      </header>

      <Card className="bg-card border-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid size-12 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <QrCode className="size-6" />
          </div>
          <div className="font-bold">Conectar chip</div>
        </div>
        <WhatsappConnector initialQr={inst?.qr_code_base64 ?? null} initialState={inst?.state ?? null} />
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-white/5 p-6">
          <h2 className="font-bold flex items-center gap-2 mb-3">
            <Send className="size-4 text-primary" />
            Na fila ({(pending ?? []).length})
          </h2>
          {(pending ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada agendado. Cobranças e lembretes entram aqui.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(pending as Array<{ id: string; to_phone: string | null; type: string; scheduled_for: string | null }> ?? []).map((m) => (
                <li key={m.id} className="flex justify-between gap-2 border-b border-white/5 last:border-0 pb-2 last:pb-0">
                  <span className="truncate">{m.to_phone ?? "—"} · {m.type}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {m.scheduled_for ? new Date(m.scheduled_for).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="bg-card border-white/5 p-6">
          <h2 className="font-bold flex items-center gap-2 mb-3">
            <MessageCircle className="size-4 text-primary" />
            Últimos disparos
          </h2>
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum envio ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(history as Array<{ id: string; to_phone: string | null; from_phone: string | null; direction: string; type: string; status: string }> ?? []).map((m) => (
                <li key={m.id} className="flex justify-between gap-2 border-b border-white/5 last:border-0 pb-2 last:pb-0">
                  <span className="truncate">
                    {m.direction === "outbound" ? `→ ${m.to_phone ?? "—"}` : `← ${m.from_phone ?? "—"}`} · {m.type}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{m.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
