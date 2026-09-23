import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatCents } from "@/lib/types/billing";
import { PaymentLinkForm } from "./payment-link-form";
import { CopyButton } from "./copy-button";
import Link from "next/link";
import { Plus, Link2, ArrowRight } from "lucide-react";

export default async function PaymentLinksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: links } = await supabase
    .from("payment_links")
    .select("id, description, amount_cents, public_code, url, paid_at, expires_at, created_at")
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .order("created_at", { ascending: false })
    .limit(50);

  type Row = NonNullable<typeof links>[number];
  const totalPaid = (links ?? [])
    .filter((l) => l.paid_at != null)
    .reduce((acc, l) => acc + l.amount_cents, 0);

  return (
    <div className="p-5 md:p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Links de pagamento</h1>
        <p className="text-sm text-muted-foreground">
          Crie um link avulso pra cobrar pacotes, avulsa ou avaliação inicial
        </p>
      </header>

      <Card className="bg-card/80 border-white/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <Link2 className="size-4 text-primary" />
            Total recebido em links avulsos
          </h2>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
            {formatBRL(formatCents(totalPaid) / 100)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          ({(links ?? []).filter((l) => l.paid_at != null).length} pagamentos confirmados)
        </p>
      </Card>

      <Card className="bg-card/80 border-white/10 p-5 space-y-4">
        <div>
          <h2 className="font-bold flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            Novo link
          </h2>
          <p className="text-xs text-muted-foreground">
            Compartilhe a URL no WhatsApp ou copie o código curto
          </p>
        </div>
        <PaymentLinkForm />
      </Card>

      <div className="space-y-3">
        {(links ?? []).length === 0 ? (
          <Card className="bg-card border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não criou nenhum link. Crie o primeiro acima.
            </p>
          </Card>
        ) : (
          (links ?? []).map((l: Row) => (
            <Card key={l.id} className="bg-card border-white/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold truncate">{l.description}</div>
                    {l.paid_at ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                        Pago
                      </Badge>
                    ) : l.expires_at && new Date(l.expires_at) < new Date() ? (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
                        Expirado
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="num font-bold text-base text-foreground">
                      {formatBRL(l.amount_cents / 100)}
                    </span>
                    <span>·</span>
                    <span className="font-mono">/pay/{l.public_code}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Criado {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {l.url ? <CopyButton url={l.url} /> : null}
                  <Link
                    href={`/app/payment-links/${l.id}`}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Ver <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
