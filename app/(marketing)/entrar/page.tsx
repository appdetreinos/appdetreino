import { EntrarClient } from "./entrar-client";

/**
 * Página "Entrar" — segmentação profissional / aluno.
 *
 * Server component delega ao client pra checar a sessão ativa:
 *  - Se não tem sessão → mostra os 2 cards normalmente
 *  - Se tem sessão → modal perguntando "Continuar como X / Entrar com outra conta"
 *
 * Tom próprio: "Continuar aqui" / "Entrar com outra conta" em vez de
 * "Permanecer / Sair".
 */

export const metadata = {
  title: "Entrar · Viva FIT APP",
  description:
    "Escolha como você quer acessar a plataforma Viva FIT APP — como profissional ou como aluno.",
};

export default function EntrarPage() {
  return <EntrarClient />;
}
