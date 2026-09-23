"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Pin, PinOff, Trash2 } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

/** Fixar/desafixar + apagar post (dono ou equipe). */
export function PostManager({ postId, pinned }: { postId: string; pinned: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function togglePin() {
    setBusy(true);
    try {
      await csrfFetch(`/api/community/${postId}/manage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !pinned }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Apagar este post?")) return;
    setBusy(true);
    try {
      await csrfFetch(`/api/community/${postId}/manage`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1 ml-auto">
      <Button size="sm" variant="ghost" onClick={togglePin} disabled={busy} title={pinned ? "Desafixar" : "Fixar"}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
      </Button>
      <Button size="sm" variant="ghost" onClick={remove} disabled={busy} title="Apagar">
        <Trash2 className="size-3.5" />
      </Button>
    </span>
  );
}
