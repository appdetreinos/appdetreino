"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Images } from "lucide-react";

export type PhotoPoint = { id: string; date: string; urls: string[] };

/**
 * Comparador antes/depois (padrão Prime: fotos comparadas).
 * Dois seletores de medição + grade lado a lado.
 */
export function PhotoCompare({ points }: { points: PhotoPoint[] }) {
  const withPhotos = points.filter((p) => p.urls.length > 0);
  const [beforeId, setBeforeId] = useState<string>(withPhotos[0]?.id ?? "");
  const [afterId, setAfterId] = useState<string>(withPhotos[withPhotos.length - 1]?.id ?? "");

  if (withPhotos.length === 0) {
    return (
      <Card className="bg-card border-dashed border-white/10 p-6 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mx-auto">
          <Images className="size-6" />
        </div>
        <h3 className="mt-3 font-semibold text-sm">Sem fotos ainda</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Anexa fotos na próxima medição pra comparar o antes/depois aqui.
        </p>
      </Card>
    );
  }

  const before = withPhotos.find((p) => p.id === beforeId) ?? withPhotos[0];
  const after = withPhotos.find((p) => p.id === afterId) ?? withPhotos[withPhotos.length - 1];

  const label = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Card className="bg-card border-white/5 p-5">
      <h2 className="text-lg font-bold mb-1">Antes / depois</h2>
      <p className="text-xs text-muted-foreground mb-4">Escolhe duas datas pra comparar as fotos.</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-xs space-y-1">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider">Antes</span>
          <select
            value={before.id}
            onChange={(e) => setBeforeId(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
          >
            {withPhotos.map((p) => (
              <option key={p.id} value={p.id}>{label(p.date)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider">Depois</span>
          <select
            value={after.id}
            onChange={(e) => setAfterId(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
          >
            {withPhotos.map((p) => (
              <option key={p.id} value={p.id}>{label(p.date)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { title: `Antes · ${label(before.date)}`, urls: before.urls },
          { title: `Depois · ${label(after.date)}`, urls: after.urls },
        ].map((col) => (
          <div key={col.title}>
            <div className="text-xs font-semibold mb-2 truncate">{col.title}</div>
            <div className="space-y-2">
              {col.urls.slice(0, 3).map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={u}
                  src={u}
                  alt={col.title}
                  loading="lazy"
                  className="w-full rounded-xl border border-white/10 object-cover aspect-[3/4]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
