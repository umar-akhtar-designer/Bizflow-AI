import { AlertCircle, CheckCircle2, Circle, Clock3, Loader2 } from "lucide-react";
import { agent, cn, titleCase, toneFor } from "@/lib/utils";
import type { AIStatus } from "@/types";

export function StatusBadge({
  status,
  className,
  dot = true,
}: {
  status: string;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset",
        toneFor(status),
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {titleCase(status)}
    </span>
  );
}

export function AgentChip({
  agentKey,
  size = "md",
  showName = true,
  className,
}: {
  agentKey: string;
  size?: "sm" | "md";
  showName?: boolean;
  className?: string;
}) {
  const meta = agent(agentKey);
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-bold text-white",
          size === "sm" ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[10px]"
        )}
        style={{ background: meta.color }}
      >
        {meta.initials}
      </span>
      {showName && (
        <span className="text-xs font-medium text-ink">{meta.name.replace(" Agent", "")}</span>
      )}
    </span>
  );
}

export function TaskStatusIcon({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle2 size={16} className="text-forest-600" />;
  if (status === "running")
    return <Loader2 size={16} className="animate-spin text-blue-600" />;
  if (status === "failed")
    return <AlertCircle size={16} className="text-rose-600" />;
  if (status === "rolled_back")
    return <Clock3 size={16} className="text-amber-600" />;
  if (status === "skipped")
    return <Circle size={16} className="text-slate-300" />;
  return <Circle size={16} className="text-slate-300" />;
}

export function AIStatusPill({ status, compact = false }: { status?: AIStatus; compact?: boolean }) {
  const live = status?.mode === "vultr";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
        live
          ? "border-forest-200 bg-forest-50 text-forest-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      )}
      title={status?.label}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-60",
            live ? "animate-pulse-ring bg-forest-500" : "bg-amber-500"
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            live ? "bg-forest-600" : "bg-amber-500"
          )}
        />
      </span>
      {compact ? (live ? "Vultr AI" : "Deterministic") : status?.label || "Checking AI mode"}
    </span>
  );
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-forest-700">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-500 opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-600" />
      </span>
      {label}
    </span>
  );
}
