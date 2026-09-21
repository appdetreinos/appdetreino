"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { safeLog } from "@/lib/log/safe";

export function PostComposer() {
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"students" | "all">("students");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!content.trim()) {
      setError("Escreve algo");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/community-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim(), audience }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Erro ao publicar");
          return;
        }
        setContent("");
        if (typeof window !== "undefined") window.location.reload();
      } catch (e) {
        safeLog.error("[post-composer] submit failed", e instanceof Error ? e.message : "unknown");
        setError("Falha de conexão");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        placeholder="No que você está pensando?"
        rows={3}
        disabled={pending}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setAudience("students")}
            className={`px-2 py-1 rounded ${
              audience === "students"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Só alunos
          </button>
          <button
            type="button"
            onClick={() => setAudience("all")}
            className={`px-2 py-1 rounded ${
              audience === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Todos
          </button>
        </div>
        <Button onClick={submit} disabled={pending || !content.trim()} size="sm">
          {pending ? "Publicando..." : "Publicar"}
        </Button>
      </div>
    </div>
  );
}
