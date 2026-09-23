"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DirectMessage = {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

/**
 * Thread 1:1 trainer <-> aluno (feedback personalizado).
 * RLS garante: cada lado só vê o próprio thread e só envia como si.
 */
export function DirectThread({
  trainerId,
  studentId,
  emptyHint,
}: {
  trainerId: string;
  studentId: string;
  emptyHint: string;
}) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setSelfId(user.id);
    const { data } = await supabase
      .from("direct_messages")
      .select("id, sender_id, text, created_at")
      .eq("trainer_id", trainerId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data ?? []) as DirectMessage[]);
    setLoading(false);
    // Marca como lidas as recebidas
    const unread = ((data ?? []) as DirectMessage[]).filter(
      (m) => m.sender_id !== user.id,
    );
    if (unread.length > 0) {
      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("trainer_id", trainerId)
        .eq("student_id", studentId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerId, studentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (v.length === 0 || v.length > 2000) return;
    setSending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }
    const { error } = await supabase.from("direct_messages").insert({
      trainer_id: trainerId,
      student_id: studentId,
      sender_id: user.id,
      text: v,
    });
    if (!error) {
      setText("");
      await load();
    }
    setSending(false);
  }

  return (
    <Card className="bg-card border-white/5 p-4 flex flex-col min-h-[320px]">
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] pr-1">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando conversa…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyHint}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === selfId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    mine ? "bg-primary/15 border border-primary/30" : "bg-background/60 border border-white/10"
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{m.text}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          maxLength={2000}
          placeholder="Escreve aqui…"
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e as unknown as React.FormEvent);
            }
          }}
        />
        <Button type="submit" disabled={sending || text.trim().length === 0} className="shrink-0">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </Card>
  );
}
