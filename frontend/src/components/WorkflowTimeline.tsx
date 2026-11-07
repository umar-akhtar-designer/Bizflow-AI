import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  Clock3,
  Database,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Waypoints,
} from "lucide-react";
import { AgentChip, TaskStatusIcon } from "@/components/Badges";
import { Badge } from "@/components/ui";
import { agent, cn, duration, titleCase } from "@/lib/utils";
import type { Workflow, WorkflowTask } from "@/types";

function prettyValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 4);
    return entries.map(([key, val]) => `${titleCase(key)}: ${prettyValue(val)}`).join(" · ");
  }
  return String(value);
}

function ResultPreview({ task }: { task: WorkflowTask }) {
  const entries = Object.entries(task.result || {}).filter(
    ([key]) =>
      !key.startsWith("__") &&
      !["items", "orders", "invoices", "series", "top_products", "low_stock"].includes(key)
  );
  if (!entries.length) return null;
  return (
    <div className="mt-2 grid gap-1 rounded-xl border border-line/70 bg-paper/60 px-3 py-2 sm:grid-cols-2">
      {entries.slice(0, 6).map(([key, value]) => (
        <div key={key} className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="truncate text-[9.5px] uppercase tracking-wider text-sage">
            {titleCase(key)}
          </span>
          <span className="truncate font-mono text-[9.5px] font-medium text-ink/80">
            {prettyValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  index,
  isLast,
  active,
}: {
  task: WorkflowTask;
  index: number;
  isLast: boolean;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const meta = agent(task.agent);
  const settled = ["completed", "failed", "rolled_back", "skipped"].includes(task.status);
  const detail = task.error || task.verification_note || task.description;
  const expandable = Object.keys(task.result || {}).length > 0 || Boolean(task.error);

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.3 }}
      className="relative flex gap-3 pb-4 last:pb-0"
    >
      {!isLast && (
        <span
          className={cn(
            "absolute left-[15px] top-8 h-[calc(100%-1.75rem)] w-px",
            settled ? "bg-line" : "bg-gradient-to-b from-line to-transparent"
          )}
        />
      )}
      <div className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream ring-1 ring-line">
        <TaskStatusIcon status={task.status} />
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => expandable && setOpen((value) => !value)}
          className={cn(
            "group flex w-full items-start justify-between gap-3 rounded-xl px-2 py-1.5 text-left transition",
            expandable && "hover:bg-paper/70"
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-[9px] font-semibold text-sage">
                {String(task.sequence).padStart(2, "0")}
              </span>
              <p
                className={cn(
                  "text-[12px] font-semibold",
                  task.status === "failed" ? "text-rose-700" : "text-ink"
                )}
              >
                {task.title}
              </p>
              {task.verified && (
                <BadgeCheck size={12} className="shrink-0 text-forest-600" aria-label="Verified" />
              )}
              {active && task.status === "running" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-700">
                  executing
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <AgentChip agentKey={task.agent} size="sm" />
              <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[8.5px] text-sage">
                {task.action}
              </code>
              {task.status === "rolled_back" && (
                <span className="text-[9px] font-semibold text-amber-700">rolled back</span>
              )}
              {task.status === "skipped" && (
                <span className="text-[9px] font-semibold text-sage">skipped</span>
              )}
            </div>
            {detail && (
              <p
                className={cn(
                  "mt-1.5 line-clamp-2 text-[10.5px] leading-5",
                  task.error ? "text-rose-600" : "text-muted"
                )}
              >
                {detail}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {task.started_at && task.finished_at && (
              <span className="hidden font-mono text-[8.5px] text-sage sm:block">
                {Math.max(
                  0,
                  Math.round(
                    (new Date(task.finished_at).getTime() - new Date(task.started_at).getTime()) / 1000
                  )
                )}
                s
              </span>
            )}
            {expandable && (
              <ChevronDown
                size={13}
                className={cn("text-sage transition-transform", open && "rotate-180")}
              />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden pl-2"
            >
              <ResultPreview task={task} />
              {task.error && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0 text-rose-600" />
                  <p className="text-[10px] leading-5 text-rose-700">{task.error}</p>
                </div>
              )}
              {task.verification_note && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-forest-200 bg-forest-50/70 px-3 py-2">
                  <ShieldCheck size={12} className="mt-0.5 shrink-0 text-forest-700" />
                  <p className="text-[10px] leading-5 text-forest-800">{task.verification_note}</p>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2 font-mono text-[8.5px] text-sage">
                <span>agent: {meta.name}</span>
                <span>·</span>
                <span>status: {task.status}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

export function WorkflowTimeline({
  workflow,
  compact = false,
}: {
  workflow: Workflow;
  compact?: boolean;
}) {
  const tasks = workflow.tasks || [];
  const running = workflow.status === "queued" || workflow.status === "running";
  const completed = tasks.filter((task) => task.status === "completed").length;
  const verified = tasks.filter((task) => task.verified).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!autoScroll || !running) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [completed, running, autoScroll]);

  return (
    <div className="rounded-2xl border border-line/90 bg-cream shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-cream">
            <Waypoints size={13} />
          </span>
          <div>
            <p className="text-[11.5px] font-semibold text-ink">Execution plan</p>
            <p className="font-mono text-[9px] text-sage">
              {completed}/{tasks.length} steps · {verified} verified record(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {workflow.ai_mode === "vultr" ? (
            <Badge tone="verified">
              <Sparkles size={10} /> Vultr
            </Badge>
          ) : (
            <Badge tone="pending">
              <Terminal size={10} /> Deterministic
            </Badge>
          )}
          <Badge tone={workflow.status}>
            {titleCase(workflow.status)}
          </Badge>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden bg-line/60">
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "h-full",
            workflow.status === "failed" ? "bg-rose-500" : "bg-forest-500"
          )}
        />
      </div>

      <div
        ref={scrollRef}
        onWheel={() => setAutoScroll(false)}
        className={cn(
          "scrollbar-thin overflow-y-auto px-4 py-4",
          compact ? "max-h-[420px]" : "max-h-[560px]"
        )}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clock3 size={18} className="text-sage" />
            <p className="mt-2 text-[11px] font-medium text-ink">Planning the workflow…</p>
            <p className="text-[10px] text-muted">Resolving real entities before any writes</p>
          </div>
        ) : (
          <ul>
            {tasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                index={index}
                isLast={index === tasks.length - 1}
                active={running}
              />
            ))}
          </ul>
        )}
      </div>

      {workflow.status === "failed" && workflow.error && (
        <div className="flex items-start gap-2 border-t border-rose-200 bg-rose-50/70 px-4 py-3">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-rose-600" />
          <div>
            <p className="text-[10.5px] font-semibold text-rose-800">
              Stopped safely — no partial writes were kept
            </p>
            <p className="mt-0.5 text-[10px] leading-5 text-rose-700">{workflow.error}</p>
          </div>
        </div>
      )}

      {workflow.status === "completed" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-forest-50/50 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-forest-800">
            <FileCheck2 size={12} />
            {workflow.verification_status === "verified"
              ? "Independent read-back verified"
              : workflow.verification_status === "read_only"
              ? "Read-only analysis — no writes"
              : "Verification pending"}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-sage">
            <Database size={10} /> persisted · {duration(workflow.duration_ms)}
          </span>
        </div>
      )}
    </div>
  );
}
