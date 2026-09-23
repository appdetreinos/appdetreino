"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2, Send } from "lucide-react";
import { csrfFetch } from "@/lib/security/client";

export type ThreadComment = {
  id: string;
  content: string;
  created_at: string;
  authorName: string;
};

/** Comentários do post (trainer lê e responde). */
export function PostComments({
  postId,
  initial,
}: {
  postId: string;
  initial: ThreadComment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const v = reply.trim();
    if (!v) return;
    setSending(true);
    try {
      const res = await csrfFetch(`/api/community/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: v }),
      });
      if (res.ok) {
        setReply("");
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <MessageCircle className="size-3.5" />
        {initial.length} comentário{initial.length === 1 ? "" : "s"}
        {open ? " · ocultar" : " · ver"}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-white/5 bg-background/40 p-3">
          {initial.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem comentários ainda.</p>
          ) : (
            initial.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-semibold">{c.authorName}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
                <p className="text-foreground/85 break-words">{c.content}</p>
              </div>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={1}
              maxLength={500}
              placeholder="Responder como coach…"
              className="resize-none text-sm"
            />
            <Button size="sm" onClick={send} disabled={sending || reply.trim().length === 0} className="shrink-0">
              {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
