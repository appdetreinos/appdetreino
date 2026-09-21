"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Initial {
  pix_key: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random";
  pix_beneficiary_name: string;
  default_charge_message: string;
  default_overdue_message: string;
}

const DEFAULT_CHARGE =
  "Oi, {{nome}}! 💪 Passando pra avisar que tua mensalidade de {{valor}} tá em aberto. Paga direto no Pix: {{chave_pix}} (em nome de {{beneficiario}}). Qualquer coisa me chama! 🔥";

const DEFAULT_OVERDUE =
  "Fala, {{nome}}. Tua mensalidade de {{valor}} venceu há {{dias_atraso}} dias. Quando puder pagar, a chave Pix é {{chave_pix}} (em nome de {{beneficiario}}). Tô no WhatsApp se precisar! 💬";

export function PixSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pixKey, setPixKey] = useState(initial.pix_key);
  const [pixKeyType, setPixKeyType] = useState<Initial["pix_key_type"]>(initial.pix_key_type);
  const [pixBeneficiaryName, setPixBeneficiaryName] = useState(initial.pix_beneficiary_name);
  const [chargeMessage, setChargeMessage] = useState(
    initial.default_charge_message || DEFAULT_CHARGE,
  );
  const [overdueMessage, setOverdueMessage] = useState(
    initial.default_overdue_message || DEFAULT_OVERDUE,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirou.");
      setSaving(false);
      return;
    }

    // Upsert em trainer_settings (1:1 com trainer_profiles)
    const { error: upErr } = await supabase
      .from("trainer_settings")
      .upsert(
        {
          user_id: user.id,
          pix_key: pixKey || null,
          pix_key_type: pixKey ? pixKeyType : null,
          pix_beneficiary_name: pixBeneficiaryName || null,
          default_charge_message: chargeMessage,
          default_overdue_message: overdueMessage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    startTransition(() => router.refresh());
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-5">
      <div className="grid sm:grid-cols-[1fr_180px] gap-3">
        <div>
          <Label htmlFor="pix_key">Chave Pix</Label>
          <Input
            id="pix_key"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="11999998888 ou email@dominio.com"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pix_key_type">Tipo</Label>
          <select
            id="pix_key_type"
            value={pixKeyType}
            onChange={(e) => setPixKeyType(e.target.value as Initial["pix_key_type"])}
            className="mt-1.5 w-full h-11 rounded-md border border-white/10 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="email">E-mail</option>
            <option value="phone">Celular</option>
            <option value="random">Chave aleatória</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="pix_beneficiary_name">Nome do beneficiário</Label>
        <Input
          id="pix_beneficiary_name"
          value={pixBeneficiaryName}
          onChange={(e) => setPixBeneficiaryName(e.target.value)}
          placeholder="Bruno Silva MEI"
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-foreground/65">
          Aparece na mensagem do aluno pra ele saber pra quem tá pagando.
        </p>
      </div>

      <details className="rounded-xl border border-white/10 bg-background/40 p-4 group">
        <summary className="cursor-pointer font-semibold text-sm">
          Templates de mensagem (avançado)
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="default_charge_message">Cobrança normal</Label>
            <textarea
              id="default_charge_message"
              value={chargeMessage}
              onChange={(e) => setChargeMessage(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <Label htmlFor="default_overdue_message">Cobrança em atraso</Label>
            <textarea
              id="default_overdue_message"
              value={overdueMessage}
              onChange={(e) => setOverdueMessage(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-foreground/65">
            Variáveis: <code>{`{{nome}}`}</code>, <code>{`{{valor}}`}</code>,{" "}
            <code>{`{{chave_pix}}`}</code>, <code>{`{{beneficiario}}`}</code>,{" "}
            <code>{`{{dias_atraso}}`}</code>.
          </p>
        </div>
      </details>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving || pending} className="font-semibold">
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando…
            </>
          ) : (
            "Salvar"
          )}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-500">
            <CheckCircle2 className="size-4" />
            Salvo
          </span>
        )}
      </div>
    </form>
  );
}
