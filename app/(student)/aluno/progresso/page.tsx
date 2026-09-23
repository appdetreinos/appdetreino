import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MeasurementForm } from "./measurement-form";
import { PhotoCompare, type PhotoPoint } from "./photo-compare";
import { TrendingUp, TrendingDown, Ruler, Sparkles } from "lucide-react";
import type { Database } from "@/lib/supabase/types";
import { Sparkline } from "@/components/ui/sparkline";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/ui/stagger";

type MeasurementRow = Database["public"]["Tables"]["measurements"]["Row"];

const MES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function ProgressoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: measurements, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("student_id", user.id)
    .order("date", { ascending: false })
    .limit(50);

  const list = ((measurements ?? []) as MeasurementRow[]).slice().reverse(); // cronológico pra gráficos

  // Séries por métrica (NUMERIC volta como string — coage na borda)
  const peso = list.filter((m) => m.weight_kg != null).map((m) => Number(m.weight_kg));
  const gordura = list.filter((m) => m.body_fat_pct != null).map((m) => Number(m.body_fat_pct));
  const cintura = list.filter((m) => m.waist_cm != null).map((m) => Number(m.waist_cm));
  const peito = list.filter((m) => m.chest_cm != null).map((m) => Number(m.chest_cm));

  // Variação (primeiro → último)
  const variacao = (arr: number[]) =>
    arr.length >= 2 ? +(arr[arr.length - 1] - arr[0]).toFixed(1) : null;

  const pesoDelta = variacao(peso);
  const gorduraDelta = variacao(gordura);
  const cinturaDelta = variacao(cintura);
  const peitoDelta = variacao(peito);

  // Labels (meses) baseados nas datas REAIS de cada ponto de peso
  const pesoLabels = list
    .filter((m) => m.weight_kg != null)
    .map((m) => {
      const d = new Date(m.date);
      return `${MES_PT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    });

  // Exibição cronológica decrescente (mais recente primeiro)
  const listaExibicao = ((measurements ?? []) as MeasurementRow[]);

  const photoPoints: PhotoPoint[] = listaExibicao
    .filter((m) => Array.isArray(m.photos_urls) && (m.photos_urls as string[]).length > 0)
    .map((m) => ({ id: m.id, date: m.date, urls: (m.photos_urls ?? []) as string[] }))
    .reverse(); // cronológico pro comparador

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Meu progresso</h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas medidas e evolução</p>
      </header>

      <Stagger className="space-y-4" delay={0.05}>
        {/* Gráfico de peso (destaque) */}
        {peso.length >= 2 && (
          <StaggerItem>
            <Card className="bg-card border-white/5 p-5">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-lg font-bold">Peso</h2>
                  <p className="text-xs text-muted-foreground">Últimas {peso.length} medições</p>
                </div>
                {pesoDelta !== null && (
                  <Badge
                    className={
                      pesoDelta < 0
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : pesoDelta > 0
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-secondary text-secondary-foreground border-white/10"
                    }
                  >
                    {pesoDelta < 0 ? <TrendingDown className="size-3 mr-1" /> : <TrendingUp className="size-3 mr-1" />}
                    {pesoDelta > 0 ? "+" : ""}
                    {pesoDelta} kg
                  </Badge>
                )}
              </div>
              <div className="text-primary">
                <Sparkline data={peso} labels={pesoLabels} height={140} showDots showArea />
              </div>
            </Card>
          </StaggerItem>
        )}

        {/* Mini-cards: % gordura, cintura, peito */}
        <StaggerItem>
          <div className="grid grid-cols-3 gap-3">
            <Mini
              label="% gordura"
              atual={gordura.length ? gordura[gordura.length - 1] : null}
              delta={gorduraDelta}
              unit="%"
              melhorQuandoDiminui
            />
            <Mini
              label="Cintura"
              atual={cintura.length ? cintura[cintura.length - 1] : null}
              delta={cinturaDelta}
              unit="cm"
              melhorQuandoDiminui
            />
            <Mini
              label="Peito"
              atual={peito.length ? peito[peito.length - 1] : null}
              delta={peitoDelta}
              unit="cm"
              melhorQuandoDiminui={false}
            />
          </div>
        </StaggerItem>

        {/* Form de nova medição */}
        <StaggerItem>
          <MeasurementForm />
        </StaggerItem>

        {/* Comparador de fotos */}
        <StaggerItem>
          <PhotoCompare points={photoPoints} />
        </StaggerItem>

        {/* Histórico */}
        <StaggerItem>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Histórico
            </h2>
            {error && (
              <p className="text-sm text-destructive mb-3">Erro: {error.message}</p>
            )}
            {listaExibicao.length === 0 ? (
              <Card className="bg-card border-dashed border-white/10 p-8 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
                  <Ruler className="size-6" />
                </div>
                <h3 className="mt-4 font-semibold">Nenhuma medição registrada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Comece registrando seu peso e medidas. Sua linha de evolução aparece aqui.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {listaExibicao.map((m) => (
                  <Card key={m.id} className="bg-card border-white/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {new Date(m.date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {m.notes && (
                        <Sparkles className="size-3.5 text-primary" aria-label="com nota" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {m.weight_kg != null && <Stat label="Peso" value={`${Number(m.weight_kg).toFixed(1)} kg`} />}
                      {m.body_fat_pct != null && <Stat label="Gordura" value={`${Number(m.body_fat_pct).toFixed(1)}%`} />}
                      {m.waist_cm != null && <Stat label="Cintura" value={`${m.waist_cm} cm`} />}
                      {m.chest_cm != null && <Stat label="Peito" value={`${m.chest_cm} cm`} />}
                      {m.arm_cm != null && <Stat label="Braço" value={`${m.arm_cm} cm`} />}
                      {m.thigh_cm != null && <Stat label="Coxa" value={`${m.thigh_cm} cm`} />}
                      {m.hip_cm != null && <Stat label="Quadril" value={`${m.hip_cm} cm`} />}
                    </div>
                    {m.notes && (
                      <p className="text-xs text-muted-foreground mt-3 italic">"{m.notes}"</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </StaggerItem>
      </Stagger>
    </div>
  );
}

function Mini({
  label,
  atual,
  delta,
  unit,
  melhorQuandoDiminui,
}: {
  label: string;
  atual: number | null;
  delta: number | null;
  unit: string;
  melhorQuandoDiminui: boolean;
}) {
  const positivo = delta != null && delta !== 0;
  const bom = delta == null ? null : melhorQuandoDiminui ? delta < 0 : delta > 0;
  return (
    <Card className="bg-card border-white/5 p-3 text-center">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold">
        {atual != null ? (
          <AnimatedNumber value={Number(atual ?? 0)} formatKind="decimal1" />
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
        <span className="text-base text-muted-foreground ml-0.5">{unit}</span>
      </div>
      {delta != null && (
        <div
          className={`mt-1 text-[11px] font-semibold ${
            bom ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)} {unit}
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
