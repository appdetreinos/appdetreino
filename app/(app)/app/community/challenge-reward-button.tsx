"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Award } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/** Encerra o desafio e premia todos os participantes (XP + badge). */
export function ChallengeRewardButton({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  async function reward() {
    if (!confirm("Encerrar e premiar todos os participantes?")) return;
    setLoading(true);
    try {
      const res = await csrfFetch("/api/trainer/challenge-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId }),
      });
      const json = (await res.json()) as { ok: boolean; rewarded?: number; error?: string };
      if (json.ok) {
        setDone(json.rewarded ?? 0);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (done !== null) {
    return <span className="text-xs font-semibold text-emerald-500">✓ {done} premiado(s)</span>;
  }

  return (
    <Button size="sm" variant="outline" onClick={reward} disabled={loading}>
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Award className="size-3.5" />}
      Premiar
    </Button>
  );
}
