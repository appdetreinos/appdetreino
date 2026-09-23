import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { ArrowLeft, CheckCircle2, Clock, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTrainerScopeIds } from "@/lib/supabase/scope";
import { formatBRL } from "@/lib/types/billing";
import { CopyButton } from "../copy-button";

type Props = { params: Promise<{ id: string }> };

/** Detalhe do link avulso: status, valor, link público. */
export default async function PaymentLinkDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: link } = await supabase
    .from("payment_links")
    .select("id, description, amount_cents, public_code, url, paid_at, expires_at, created_at")
    .eq("id", id)
    .in("trainer_id", await getTrainerScopeIds(supabase, user.id))
    .maybeSingle();

  if (!link) notFound();

  const paid = link.paid_at != null;
  const expired =
    !paid && link.expires_at != null && new Date(link.expires_at) < new Date();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center gap-3">
          <Link href="/app/payment-links" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold truncate">{link.description}</h1>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-4">
        <Card className="bg-card/80 border-white/10 p-6 text-center">
          <Badge
            className={
              paid
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                : expired
                  ? "bg-white/10 text-foreground/60 border-white/10"
                  : "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
            }
          >
            {paid ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Pago
              </span>
            ) : expired ? (
              "Expirado"
            ) : (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" /> Aguardando
              </span>
            )}
          </Badge>
          <div className="num mt-3 text-4xl font-extrabold">
            {formatBRL(link.amount_cents / 100)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            /pay/{link.public_code}
          </p>
          {link.paid_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Pago em {new Date(link.paid_at).toLocaleDateString("pt-BR")}
            </p>
          )}
        </Card>

        {link.url && !paid && (
          <Card className="bg-card/80 border-white/10 p-6">
            <h2 className="font-bold flex items-center gap-2 mb-3">
              <Link2 className="size-4 text-primary" />
              Link de cobrança
            </h2>
            <p className="text-xs text-muted-foreground break-all mb-3">{link.url}</p>
            <CopyButton url={link.url} />
          </Card>
        )}

        <div className="flex justify-end">
          <ButtonLink href="/app/payment-links" variant="outline">
            Voltar
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
