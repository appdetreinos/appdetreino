import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { MessageSquare, Phone } from "lucide-react";
import { sanitizePhone } from "@/lib/security/sanitize";

export default async function MensagensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Pega trainer do aluno + telefone DO TRAINER (não do aluno — o link wa.me precisa
  // abrir conversa com o personal, não consigo mesmo)
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("trainer_id, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: trainerProfile } = studentProfile?.trainer_id
    ? await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("id", studentProfile.trainer_id)
        .maybeSingle()
    : { data: null };

  // Mensagens do trainer do aluno onde to_phone ou from_phone = telefone do aluno
  const messages: Array<{
    id: string;
    direction: string;
    type: string;
    payload_jsonb: unknown;
    sent_at: string | null;
    created_at: string;
  }> = [];

  if (studentProfile?.trainer_id && studentProfile?.phone) {
    // Sanitize: tira qualquer caractere fora do alfabeto de telefone.
    // Impede PostgREST injection (",..,(), etc).
    const safePhone = sanitizePhone(studentProfile.phone);

    // Duas queries explícitas em vez de `.or(...)` com interpolação.
    const [{ data: toData }, { data: fromData }] = await Promise.all([
      supabase
        .from("evolution_messages")
        .select("id, direction, type, payload_jsonb, sent_at, created_at")
        .eq("trainer_id", studentProfile.trainer_id)
        .eq("to_phone", safePhone)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("evolution_messages")
        .select("id, direction, type, payload_jsonb, sent_at, created_at")
        .eq("trainer_id", studentProfile.trainer_id)
        .eq("from_phone", safePhone)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const merged = [...(toData ?? []), ...(fromData ?? [])].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    messages.push(...(merged as typeof messages));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de mensagens com seu personal
        </p>
      </header>

      {messages.length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <MessageSquare className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Sem mensagens ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">
            A integração WhatsApp chega em breve. Seu personal já tem seus dados de contato.
          </p>
          {trainerProfile?.phone ? (
            <a
              href={`https://wa.me/55${trainerProfile.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
            >
              <Phone className="size-4" />
              Abrir WhatsApp do {trainerProfile.full_name?.split(" ")[0] ?? "personal"}
            </a>
          ) : null}
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map((m) => (
            <Card
              key={m.id}
              className={`bg-card p-4 ${
                m.direction === "outbound" ? "border-primary/30 ml-8" : "mr-8"
              }`}
            >
              <div className="text-xs text-muted-foreground mb-1">
                {m.direction === "outbound" ? "Você enviou" : "Personal"} ·{" "}
                {new Date(m.sent_at ?? m.created_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-sm">
                {typeof m.payload_jsonb === "object" &&
                m.payload_jsonb !== null &&
                "text" in (m.payload_jsonb as Record<string, unknown>)
                  ? String((m.payload_jsonb as Record<string, unknown>).text)
                  : <span className="text-muted-foreground italic">[{m.type}]</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
