import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Waypoints,
} from "lucide-react";
import { Button, Card, EmptyState, Input, SectionTitle, Select, Skeleton, Tabs } from "@/components/ui";
import { StatusBadge } from "@/components/Badges";
import { api } from "@/lib/api";
import { cn, duration, relativeTime, titleCase } from "@/lib/utils";
import type { Workflow } from "@/types";

const intentLabels: Record<string, string> = {
  order: "Order-to-cash",
  report: "Business report",
  inventory_audit: "Inventory audit",
  restock: "Restock request",
  customer_lookup: "Customer briefing",
  finance_summary: "Receivables",
  refund: "Refund",
  message: "Customer message",
  general: "General",
};

export default function Workflows() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [intent, setIntent] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["workflows", "list", status, intent],
    queryFn: () =>
      api.get<{ items: Workflow[]; total: number }>("/api/workflows", {
        limit: 75,
        status: status === "all" ? undefined : status,
        intent: intent === "all" ? undefined : intent,
      }),
    refetchInterval: 15_000,
  });

  const items = useMemo(() => {
    const rows = data?.items || [];
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter(
      (workflow) =>
        workflow.instruction.toLowerCase().includes(term) ||
        workflow.summary?.toLowerCase().includes(term)
    );
  }, [data?.items, search]);

  const counts = useMemo(() => {
    const rows = data?.items || [];
    return {
      all: data?.total || 0,
      completed: rows.filter((item) => item.status === "completed").length,
      failed: rows.filter((item) => item.status === "failed").length,
    };
  }, [data]);

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Audit trail"
        title="Workflow history"
        description="Every instruction, plan, tool call, verification check and approval decision — persisted."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching && !isLoading}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button size="sm" onClick={() => navigate("/app/manager")}>
              <Sparkles size={13} /> New workflow
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: "all", label: "All runs", count: counts.all },
            { value: "completed", label: "Completed" },
            { value: "failed", label: "Failed" },
            { value: "running", label: "In flight" },
          ]}
        />
        <div className="flex flex-1 items-center gap-2 lg:max-w-md">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search instructions…"
              className="pl-8"
            />
          </div>
          <div className="relative">
            <Filter size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sage" />
            <Select
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              className="min-w-[150px] pl-7 text-[11px]"
            >
              <option value="all">All intents</option>
              {Object.entries(intentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[86px]" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-10">
          <EmptyState
            icon={AlertTriangle}
            title="Could not load workflows"
            description="Check the API connection and retry."
            action={<Button onClick={() => refetch()}><RefreshCw size={13} /> Retry</Button>}
          />
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Waypoints}
            title="No matching workflows"
            description="Run an instruction from the AI Business Manager to create the first audited workflow."
            action={<Button onClick={() => navigate("/app/manager")}><Sparkles size={13} /> Open manager</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {items.map((workflow, index) => {
            const live = workflow.status === "running" || workflow.status === "queued";
            const pct = workflow.task_count
              ? Math.round((workflow.completed_tasks / workflow.task_count) * 100)
              : 0;
            return (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
              >
                <Link
                  to={`/app/workflows/${workflow.id}`}
                  className="group block rounded-2xl border border-line/90 bg-cream p-4 shadow-soft transition hover:border-forest-200 hover:shadow-lift sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        workflow.status === "failed"
                          ? "bg-rose-50 text-rose-600"
                          : workflow.status === "completed"
                          ? "bg-forest-50 text-forest-700"
                          : "bg-blue-50 text-blue-600"
                      )}
                    >
                      {live ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : workflow.status === "failed" ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <BadgeCheck size={16} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={workflow.status} />
                        <span className="rounded-full bg-paper px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted">
                          {intentLabels[workflow.intent] || titleCase(workflow.intent)}
                        </span>
                        {workflow.verification_status === "verified" && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-forest-700">
                            <ShieldCheck size={10} /> verified
                          </span>
                        )}
                        {workflow.ai_mode === "vultr" ? (
                          <span className="inline-flex items-center gap-1 text-[9.5px] text-violet-700">
                            <Sparkles size={10} /> Vultr
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9.5px] text-sage">
                            <Terminal size={10} /> deterministic
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] font-medium leading-5 text-ink">
                        {workflow.instruction}
                      </p>
                      {workflow.summary && (
                        <p className="mt-1 line-clamp-1 text-[10.5px] text-muted">{workflow.summary}</p>
                      )}
                      {workflow.status === "failed" && workflow.error && (
                        <p className="mt-1 line-clamp-1 text-[10px] text-rose-600">{workflow.error}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-5 sm:flex-col sm:items-end sm:gap-1.5">
                      <div className="text-right">
                        <p className="font-mono text-[11px] font-semibold text-ink">
                          {duration(workflow.duration_ms)}
                        </p>
                        <p className="text-[9px] text-sage">{relativeTime(workflow.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[10px] text-muted">
                          {workflow.completed_tasks}/{workflow.task_count} steps
                        </p>
                        <p className="text-[9px] text-sage">
                          {workflow.approval_ids.length} approval
                          {workflow.approval_ids.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <ArrowUpRight
                        size={14}
                        className="text-sage transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest-700"
                      />
                    </div>
                  </div>

                  {live && (
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line/60">
                      <motion.div
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4 }}
                        className="h-full rounded-full bg-blue-500"
                      />
                    </div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 pt-1 text-[9.5px] text-sage">
        <Clock3 size={10} /> Status refreshes automatically every 15 seconds.
        <Link to="/app/manager" className="ml-1 inline-flex items-center gap-0.5 font-semibold text-forest-700 hover:underline">
          Run a new workflow <ArrowRight size={10} />
        </Link>
      </p>
    </div>
  );
}
