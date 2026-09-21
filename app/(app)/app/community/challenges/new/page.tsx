import { ButtonLink } from "@/components/ui/button-link";
import { ChallengeForm } from "./challenge-form";

export default function NewChallengePage() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Novo desafio</h1>
          <p className="text-sm text-muted-foreground">Estimule a turma com uma meta</p>
        </div>
        <ButtonLink href="/app/community" variant="outline">
          Voltar
        </ButtonLink>
      </header>

      <ChallengeForm />
    </div>
  );
}
