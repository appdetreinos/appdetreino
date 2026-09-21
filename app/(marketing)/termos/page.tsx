import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso — Viva FIT APP",
  description:
    "Termos e condições para uso da plataforma Viva FIT APP por personal trainers e alunos.",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto max-w-3xl px-6 py-12 prose prose-invert prose-headings:font-extrabold">
        <h1>Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">Última atualização: setembro de 2026.</p>

        <p>
          Ao acessar e usar o <strong>Viva FIT APP</strong>, você concorda com estes Termos
          e com a nossa <Link href="/privacidade" className="underline hover:text-primary">Política de Privacidade</Link>.
        </p>

        <h2>1. Conta</h2>
        <p>
          Você é responsável por manter sigilo da sua senha e por todas as atividades
          realizadas na sua conta. Notifique-nos imediatamente sobre uso não autorizado.
        </p>

        <h2>2. Uso permitido</h2>
        <ul>
          <li>Pessoas físicas ou jurídicas de consultoria fitness legalmente constituídas.</li>
          <li>Gestão de até <em>N</em> alunos, conforme o plano contratado.</li>
          <li>Conteúdo próprio ou licenciado para uso na plataforma.</li>
        </ul>

        <h2>3. Uso proibido</h2>
        <ul>
          <li>Armazenar conteúdo ilícito, fraudulento ou ofensivo.</li>
          <li>Tentar contornar rate-limiting ou mecanismos de segurança.</li>
          <li>Revender o serviço sem autorização.</li>
        </ul>

        <h2>4. Pagamento</h2>
        <p>
          As mensalidades são cobradas pelo plano vigente. Cancelamentos podem ser feitos
          a qualquer momento, com efeito ao final do ciclo corrente. Os valores já pagos
          não são reembolsáveis, salvo erro de cobrança.
        </p>

        <h2>5. Limitação de responsabilidade</h2>
        <p>
          O Viva FIT APP é uma ferramenta de gestão. <strong>Não somos responsáveis</strong>{" "}
          por orientações de treino, dieta ou saúde prestadas pelos personal trainers aos
          seus alunos. Recomendamos que profissionais habilitados validem prescrições.
        </p>

        <h2>6. Suspensão e encerramento</h2>
        <p>
          Podemos suspender contas em caso de violação destes Termos, suspeita de fraude
          ou inadimplência superior a 30 dias.
        </p>

        <h2>7. LGPD</h2>
        <p>
          O tratamento de dados pessoais segue o disposto na{" "}
          <Link href="/privacidade" className="underline hover:text-primary">
            Política de Privacidade
          </Link>
          . Você pode exercer seus direitos como titular via Configurações → Seus dados
          (LGPD) na sua conta.
        </p>

        <h2>8. Foro</h2>
        <p>Fica eleito o foro de São Paulo/SP para dirimir conflitos.</p>

        <p className="mt-10 text-sm">
          <Link href="/" className="underline hover:text-primary">
            ← Voltar para o site
          </Link>
        </p>
      </article>
    </main>
  );
}
