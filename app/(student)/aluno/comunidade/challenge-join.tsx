"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Participação em desafio: entrar + barra de progresso.
 * RLS student_all permite insert/update próprio.
 */
export function ChallengeJoin({
  challengeId,
  initialProgress,
}: {
  challengeId: string;
  initialProgress: number | null;
}) {
  const [progress, setProgress] = useState<number | null>(initialProgress);
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("challenge_participants").insert({
      challenge_id: challengeId,
      student_id: user.id,
      progress: 0,
    });
    if (!error) setProgress(0);
    setLoading(false);
  }

  if (progress == null) {
    return (
      <Button size="sm" onClick={join} disabled={loading} className="mt-3 font-semibold">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trophy className="size-3.5" />}
        Participar
      </Button>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
        <Check className="size-3.5" />
        Participando · {progress} treino{progress === 1 ? "" : "s"} no desafio
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-primary rounded-full transition-all"
          style={{ width: `${Math.min(100, progress * 10)}%` }}
        />
      </div>
    </div>
  );
}
