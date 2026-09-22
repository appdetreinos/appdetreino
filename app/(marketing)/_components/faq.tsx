"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FAQ — dúvidas frequentes.
 * Acordeão com 6 perguntas. Tom: direto, sem juridiquês,BR.
 *
 * Diferencial de design: pergunta 1 fica com ícone de chat
 * destacado e label "A mais perguntada" pra puxar atenção.
 */

const questions = [
  {
    q: "Preciso cadastrar cartão pra testar?",
    a: "Não. Você cria a conta com e-mail e senha, entra no painel e usa o app por 3 dias. Só pedimos cartão quando você decide assinar um plano — e mesmo assim pode cancelar antes da próxima cobrança.",
    badge: "Mais perguntada",
  },
  {
    q: "Como meus alunos recebem treino e dieta?",
    a: "Cada aluno recebe um convite com código de 6 letras. Cria a conta, baixa o app e pronto: treino, dieta e lista de compras aparecem no celular dele no mesmo dia. Você não precisa mandar nada por WhatsApp.",
  },
  {
    q: "Posso migrar alunos de outra plataforma?",
    a: "Sim. Você exporta a lista em CSV do Trainerize, Hevy, Strong, planilha do Google — qualquer formato. Sobe no painel e a gente cruza com os treinos existentes pra puxar histórico. Em 1 tarde você tá migrado.",
  },
  {
    q: "Como funciona a parte de cobrança?",
    a: "Você cadastra a mensalidade do aluno (valor, dia de vencimento, forma de pagamento). O app manda o link de Pix/cartão/boleto no dia certo e confirma o pagamento direto no painel. Você não precisa cobrar ninguém.",
  },
  {
    q: "Atende quantos alunos por plano?",
    a: "Plano Start: até 15 alunos ativos. Pro: até 45. Top: ilimitado. Se você passar do limite, o painel avisa e você decide se faz upgrade ou tira da lista ativa. Sem cortar no meio do mês.",
  },
  {
    q: "Tem teste grátis mesmo, sem pegadinha?",
    a: "Tem. 3 dias completos, todas as funções liberadas (menos a cobrança via Pix, que pede aprovação). Se não gostar, a conta simplesmente expira — ninguém te liga, ninguém te cobra.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
      {/* Decoração de fundo — padrão pontilhado sutil */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,107,53,0.06), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,107,53,0.04), transparent 40%)",
        }}
      />

      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        {/* Cabeçalho */}
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary">
            Dúvidas
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            O que aparece no <span className="text-primary">WhatsApp da galera</span>.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            6 perguntas que a gente mais recebe. Se a sua não tá aqui, manda no{" "}
            <a href="#" className="text-primary hover:underline">
              chat do app
            </a>
            .
          </p>
        </div>

        {/* Lista de perguntas */}
        <div className="mt-10 sm:mt-12 space-y-3">
          {questions.map((item, i) => {
            const isOpen = open === i;
            const isDestaque = i === 0;
            return (
              <div
                key={item.q}
                className={cn(
                  "rounded-xl border transition-colors",
                  isDestaque
                    ? "border-primary/30 bg-primary/[0.03]"
                    : "border-white/5 bg-card/60 hover:border-white/15",
                  isOpen && "border-primary/40"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full text-left px-5 sm:px-6 py-5 flex items-start gap-3"
                >
                  {isDestaque && (
                    <span className="hidden sm:grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                      <MessageCircle className="size-4" />
                    </span>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base sm:text-lg pr-4">
                        {item.q}
                      </span>
                      {isDestaque && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180 text-primary"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p
                      className={cn(
                        "text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl",
                        isDestaque ? "sm:ml-12" : "",
                        "px-5 sm:px-6 pb-5"
                      )}
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
