"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/** Cancela a renovação automática (plano segue até o fim do ciclo). */
export function CancelSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function cancel() {
    if (!confirm("Cancelar a renovação automática? Teu plano segue ativo até o fim do ciclo atual.")) return;
    setLoading(true);
    try {
      const getCookie = (name: string) => {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return null;
      };
      const res = await fetch("/api/mercadopago/cancel-subscription", {
        method: "POST",
        headers: { "x-csrf-token": getCookie("csrf") ?? "" },
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p className="text-xs font-semibold text-emerald-500">Renovação cancelada.</p>;
  }

  return (
    <button
      type="button"
      onClick={cancel}
      disabled={loading}
      className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2"
    >
      {loading ? <Loader2 className="size-3 animate-spin inline" /> : "Cancelar renovação automática"}
    </button>
  );
}
