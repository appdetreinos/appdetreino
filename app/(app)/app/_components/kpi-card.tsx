import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
  formatKind?: "currency" | "percent" | "number";
  badge?: React.ReactNode;
}

export function KpiCard({ 
  icon: Icon, 
  label, 
  value, 
  hint, 
  formatKind = "number", 
  badge 
}: KpiCardProps) {
  const formattedValue = formatKind === "currency" 
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value))
    : formatKind === "percent" 
    ? `${value}%` 
    : value;

  return (
    <Card className="p-4 border-white/10 bg-card/50 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        {badge}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold truncate">{formattedValue}</p>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/60 truncate">{hint}</p>}
    </Card>
  );
}
