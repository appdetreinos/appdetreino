"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Initial {
  fullName: string;
  phone: string;
  cref: string;
}

export function ProfileForm({ fullName, phone, cref }: Initial) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(fullName);
  const [phoneVal, setPhoneVal] = useState(phone ?? "");
  const [crefVal, setCrefVal] = useState(cref ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirou.");
      setSaving(false);
      return;
    }

    const { error: upErr } = await supabase
      .from("profiles")
      .update({ full_name: name, phone: phoneVal || null, cref: crefVal || null })
      .eq("id", user.id);

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    startTransition(() => router.refresh());
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Card className="bg-card/80 border-white/10 p-6">
      <h2 className="text-lg font-bold">Perfil</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1.5"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Celular</Label>
            <Input
              id="phone"
              value={phoneVal}
              onChange={(e) => setPhoneVal(e.target.value)}
              placeholder="11999998888"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="cref">CREF</Label>
            <Input
              id="cref"
              value={crefVal}
              onChange={(e) => setCrefVal(e.target.value)}
              placeholder="000000-G/SP"
              className="mt-1.5"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || pending} className="font-semibold">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando…
              </>
            ) : (
              "Salvar perfil"
            )}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-500">
              <CheckCircle2 className="size-4" />
              Salvo
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
