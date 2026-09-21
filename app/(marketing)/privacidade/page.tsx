import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade — Viva FIT APP",
  description:
    "Como coletamos, usamos e protegemos seus dados pessoais na plataforma Viva FIT APP. Em conformidade com a LGPD (Lei 13.709/2018).",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="mx-auto max-w-3xl px-6 py-12 prose prose-invert prose-headings:font-extrabold">
        <h1>Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: setembro de 2026.</p>

        <p>
          O <strong>Viva FIT APP</strong> é operado pela Viva FIT Tecnologia, com
          compromisso com a privacidade e a proteção dos dados pessoais dos seus
          usuários, em conformidade com a <strong>Lei 13.709/2018 (LGPD)</strong>.
        </p>

        <h2>1. Dados que coletamos</h2>
        <ul>
          <li>
            <strong>Dados de cadastro</strong>: nome, e-mail, telefone, CPF/CNPJ quando
            aplicável.
          </li>
          <li>
            <strong>Dados de alunos</strong>: peso, altura, idade, objetivos, registro de
            treinos, dietas e hábitos — fornecidos pelo personal trainer.
          </li>
          <li>
            <strong>Dados de pagamento</strong>: status de mensalidades, comprovantes Pix.
            <em>Não armazenamos dados de cartão.</em>
          </li>
          <li>
            <strong>Dados técnicos</strong>: endereço IP, agente do navegador, logs de
            acesso (retidos por 90 dias).
          </li>
        </ul>

        <h2>2. Finalidades de uso</h2>
        <ul>
          <li>Operar a plataforma de gestão de consultoria fitness.</li>
          <li>Processar cobranças e emitir recibos.</li>
          <li>Enviar comunicações transacionais (treinos, dietas, cobranças).</li>
          <li>Cumprir obrigações legais e fiscais.</li>
          <li>Melhorar o produto (análises agregadas e anonimizadas).</li>
        </ul>

        <h2>3. Base legal</h2>
        <p>
          Tratamos dados pessoais com base em (a) <strong>execução de contrato</strong>{" "}
          (cadastro e prestação do serviço), (b) <strong>obrigações legais</strong>{" "}
          (fiscalização contábil e financeira), e (c) <strong>consentimento</strong> para
          comunicações de marketing e integrações opcionais.
        </p>

        <h2>4. Direitos do titular (art. 18 da LGPD)</h2>
        <p>Você pode, a qualquer momento, solicitar:</p>
        <ul>
          <li>Confirmação da existência de tratamento e acesso aos dados.</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
          <li>Portabilidade dos dados em formato JSON.</li>
          <li>Revogação do consentimento.</li>
        </ul>
        <p>
          Para exercer esses direitos, acesse <strong>Configurações → Seus dados (LGPD)</strong>{" "}
          na sua conta, ou entre em contato pelo e-mail abaixo.
        </p>

        <h2>5. Retenção</h2>
        <ul>
          <li>
            <strong>Dados de conta</strong>: enquanto você mantiver cadastro ativo.
          </li>
          <li>
            <strong>Dados de cobrança</strong>: 5 anos após o término (obrigação fiscal).
          </li>
          <li>
            <strong>Logs de acesso</strong>: 90 dias.
          </li>
        </ul>

        <h2>6. Compartilhamento</h2>
        <p>
          Não vendemos dados pessoais. Compartilhamos apenas com (a) processadores de
          pagamento (Mercado Pago), (b) provedor de infraestrutura (Vercel + Supabase/AWS),
          (c) autoridades quando exigido por lei.
        </p>

        <h2>7. Segurança</h2>
        <p>
          Aplicamos criptografia em trânsito (HTTPS/TLS 1.2+) e em repouso (AES-256),
          autenticação multifator para equipe interna, registro de auditoria de todas
          alterações de dados sensíveis e rate-limiting em endpoints públicos.
        </p>

        <h2>8. Encarregado (DPO)</h2>
        <p>
          E-mail: <strong>dpo@vivafit.com.br</strong>
        </p>

        <p className="mt-10 text-sm">
          <Link href="/" className="underline hover:text-primary">
            ← Voltar para o site
          </Link>
        </p>
      </article>
    </main>
  );
}
