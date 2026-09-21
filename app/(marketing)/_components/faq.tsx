"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const questions = [
  {
    q: "Preciso de chip profissional no WhatsApp?",
    a: "Não. Você usa o seu chip pessoal. A gente recomenda criar um número dedicado se quiser separar consultoria e vida pessoal — mas o nosso bot funciona em qualquer chip comum.",
  },
  {
    q: "Como funciona o disparo no WhatsApp?",
    a: "Você conecta seu chip via QR Code uma única vez. A partir daí, o Viva FIT APP dispara mensagens usando templates com variáveis (nome, treino do dia, vencimento). Tudo com delay e anti-ban configurados pra não cair o número.",
  },
  {
    q: "E se o aluno mandar áudio ou foto?",
    a: "Tudo cai numa inbox unificada dentro do Viva FIT APP. Você responde pelo painel — ou libera o WhatsApp normal pra responder direto. A escolha é sua.",
  },
  {
    q: "Quantos alunos eu posso atender?",
    a: "Depende do plano: Start até 15, Pro até 45, Top sem limites. Se ultrapassar, mostramos um aviso e você decide se faz upgrade ou se mantém o tamanho atual.",
  },
  {
    q: "Como recebo dos meus alunos?",
    a: "Você cadastra a mensalidade no aluno e o Viva FIT APP gera um link de pagamento Pix/cartão/boleto. O dinheiro cai direto na sua conta Mercado Pago — sem intermediário.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem multa, sem ligação, sem retenção. Você pede pelo painel e o cancelamento acontece no fim do ciclo vigente.",
  },
  {
    q: "Vocês cobram taxa por aluno?",
    a: "Não. Você paga o valor fixo do plano e usa até o limite. Nada de percentual escondido em cima de cada cobrança.",
  },
  {
    q: "Tem comunidade tipo Strava?",
    a: "Tem. Feed de posts, curtidas, comentários e ranking semanal por XP. Cada check-in de treino, dieta ou registro de peso dá pontos. Os Top 3 da semana ganham badge.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-16 sm:py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary">
          Dúvidas
        </span>
        <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
          Pergunta sincera, resposta sincera.
        </h2>

        <div className="mt-10 sm:mt-12 divide-y divide-white/5 border-y border-white/5">
          {questions.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full text-left py-5 sm:py-6 hover:text-primary transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-base sm:text-lg pr-4">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
                        isOpen && "rotate-180 text-primary"
                      )}
                    />
                  </div>
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
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