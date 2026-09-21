import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 group", className)}>
      <span
        className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-extrabold text-[15px] transition-all duration-300 group-hover:rotate-[8deg]"
        aria-hidden="true"
      >
        v
        <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-md bg-background text-primary text-[8px] font-black tracking-tighter">
          A
        </span>
      </span>
      <span className="flex items-baseline gap-1.5 font-extrabold text-lg tracking-tight">
        <span>Viva</span>
        <span className="text-primary">Fit</span>
        <span className="rounded-md bg-white/10 px-1 py-0.5 text-[10px] font-black tracking-widest text-muted-foreground">
          APP
        </span>
      </span>
    </Link>
  );
}
