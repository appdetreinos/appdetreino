"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/types/billing";

interface Props {
  paymentId: string;
  phone: string;
  studentName: string;
  valor: number;
}

/**
 * Botão "Cobrar" — abre WhatsApp com mensagem pré-pronta de cobrança Pix.
 *
 * 1. Lê `trainer_settings` (chave Pix + template)
 * 2. Substitui {{nome}}, {{valor}}, {{chave_pix}}, {{beneficiario}} no template
 * 3. Grava em `payment_messages` o conteúdo enviado (audit log)
 * 4. Abre wa.me com o texto montado
 */
export function PixCobrarButton({ paymentId, phone, studentName, valor }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Lê settings do trainer (chave Pix + template)
    const { data: settings } = await supabase
      .from("trainer_settings")
      .select("pix_key, pix_beneficiary_name, default_charge_message")
      .eq("user_id", user.id)
      .maybeSingle();

    const pixKey = settings?.pix_key;
    const beneficiario = settings?.pix_beneficiary_name ?? "seu coach";
    const template =
      settings?.default_charge_message ??
      "Oi, {{nome}}! 💪 Passando pra avisar que tua mensalidade de {{valor}} tá em aberto. Paga direto no Pix: {{chave_pix}} (em nome de {{beneficiario}}). Qualquer coisa me chama! 🔥";

    // Substitui vars
    const message = template
      .replaceAll("{{nome}}", studentName.split(" ")[0])
      .replaceAll("{{valor}}", formatBRL(valor))
      .replaceAll("{{chave_pix}}", pixKey ?? "[cadastra tua chave Pix]")
      .replaceAll("{{beneficiario}}", beneficiario);

    // Grava audit da mensagem
    const digits = phone.replace(/\D/g, "");
    await supabase.from("payment_messages").insert({
      trainer_id: user.id,
      payment_id: paymentId,
      resolved_text: message,
      whatsapp_to: digits ? `55${digits}` : null,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    // Abre WhatsApp
    const waUrl = digits
      ? `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");

    setLoading(false);
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || pending}
      className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
      title="Mandar cobrança no WhatsApp"
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <MessageCircle className="size-3" />
      )}
      Cobrar
    </button>
  );
}
