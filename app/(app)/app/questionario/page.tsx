import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ step?: string }>;
}

export default async function QuestionarioPage({ searchParams }: PageProps) {
  const { step } = await searchParams;
  const currentStep = Number(step ?? "1");
  if (!step || currentStep < 1) redirect("/app/questionario?step=1");

  return (
    <div className="min-h-screen bg-background">
      <QuestionarioClient step={currentStep} />
    </div>
  );
}

import { QuestionarioClient } from "./client";