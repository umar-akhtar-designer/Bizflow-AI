import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  change,
  icon,
  accent = "forest",
  index = 0,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  change?: number | null;
  icon?: ReactNode;
  accent?: "forest" | "amber" | "blue" | "violet" | "coral";
  index?: number;
  className?: string;
}) {
  const accents = {
    forest: "bg-forest-50 text-forest-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    coral: "bg-orange-50 text-coral",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line/90 bg-cream p-5 shadow-soft transition hover:shadow-lift",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", accents[accent])}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-ink">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {change !== undefined && change !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold",
              change >= 0 ? "text-forest-700" : "text-rose-600"
            )}
          >
            {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </span>
        )}
        {hint && <p className="text-[11px] text-sage">{hint}</p>}
      </div>
      <div className="pointer-events-none absolute -bottom-10 -right-6 h-24 w-24 rounded-full bg-gradient-to-br from-forest-100/0 to-forest-100/70 opacity-0 blur-2xl transition group-hover:opacity-100" />
    </motion.div>
  );
}

export function MiniStat({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  tone?: "ink" | "forest" | "amber" | "rose";
}) {
  const tones = {
    ink: "text-ink",
    forest: "text-forest-700",
    amber: "text-amber-700",
    rose: "text-rose-600",
  };
  return (
    <div className="rounded-xl border border-line/80 bg-white/60 px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", tones[tone])}>{value}</p>
    </div>
  );
}
