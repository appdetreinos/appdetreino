import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { MessageSquare, Phone } from "lucide-react";
import { sanitizePhone } from "@/lib/security/sanitize";
import { Stagger, StaggerItem } from "@/components/ui/stagger";
import { DirectThread } from "@/components/direct-thread";

export default async function MensagensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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

  // Recados do coach (posts da comunidade) — canal de feedback 1:N
  const { data: recados } = studentProfile?.trainer_id
    ? await supabase
        .from("community_posts")
        .select("id, content, created_at, pinned")
        .eq("trainer_id", studentProfile.trainer_id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: null };

  const messages: Array<{
    id: string;
    direction: string;
    type: string;
    payload_jsonb: unknown;
    sent_at: string | null;
    created_at: string;
  }> = [];

  if (studentProfile?.trainer_id && studentProfile?.phone) {    const safePhone = sanitizePhone(studentProfile.phone);
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
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Histórico com seu personal
          {trainerProfile?.full_name ? (
            <>
              {" · "}
              <span className="font-semibold text-foreground">
                {trainerProfile.full_name.split(" ")[0]}
              </span>
            </>
          ) : null}
        </p>
      </header>

      {studentProfile?.trainer_id && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Conversa com {trainerProfile?.full_name?.split(" ")[0] ?? "personal"}
          </h2>
          <DirectThread
            trainerId={studentProfile.trainer_id}
            studentId={user.id}
            emptyHint="Manda a primeira mensagem pro teu personal."
          />
        </section>
      )}

      {((recados ?? []).length > 0) && (
        <Card className="bg-card border-white/5 p-5">
          <h2 className="font-semibold mb-3">Recados do seu personal</h2>
          <ul className="space-y-3">
            {(recados as Array<{ id: string; content: string; created_at: string; pinned: boolean }> ?? []).map((r) => (
              <li key={r.id} className="text-sm border-l-2 border-primary/40 pl-3">
                <p className="whitespace-pre-line">{r.content}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  {r.pinned ? " · fixado" : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {messages.length === 0 ? (
        <Card className="bg-card border-dashed border-white/10 p-10 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
            <MessageSquare className="size-6" />
          </div>
          <h3 className="mt-4 font-semibold">Sem mensagens ainda</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            A integração WhatsApp chega em breve. Seu personal já tem seus dados de contato.
          </p>
          {trainerProfile?.phone ? (
            <a
              href={`https://wa.me/55${trainerProfile.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Phone className="size-4" />
              Abrir WhatsApp do {trainerProfile.full_name?.split(" ")[0] ?? "personal"}
            </a>
          ) : null}
        </Card>
      ) : (
        <Stagger className="space-y-2" delay={0.05}>
          {messages.map((m) => {
            const outbound = m.direction === "outbound";
            const text =
              typeof m.payload_jsonb === "object" &&
              m.payload_jsonb !== null &&
              "text" in (m.payload_jsonb as Record<string, unknown>)
                ? String((m.payload_jsonb as Record<string, unknown>).text)
                : null;
            return (
              <StaggerItem key={m.id}>
                <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                  <Card
                    className={`max-w-[80%] p-3.5 ${
                      outbound
                        ? "bg-primary/15 border-primary/30"
                        : "bg-card border-white/10"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      {outbound ? "Você" : trainerProfile?.full_name?.split(" ")[0] ?? "Personal"}{" · "}
                      {new Date(m.sent_at ?? m.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-sm whitespace-pre-line">
                      {text ?? <span className="text-muted-foreground italic">[{m.type}]</span>}
                    </div>
                  </Card>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
