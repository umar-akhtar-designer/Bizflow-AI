import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  FileText,
  Gauge,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  Waypoints,
} from "lucide-react";
import { WorkflowTimeline } from "@/components/WorkflowTimeline";
import { StatusBadge, AgentChip } from "@/components/Badges";
import { Badge, Button, Card, Divider, EmptyState, KeyValue, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { cn, duration, formatDate, money, titleCase } from "@/lib/utils";
import type { Workflow } from "@/types";

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();

  const { data: workflow, isLoading, isError, refetch } = useQuery({
    queryKey: ["workflow", id],
    queryFn: () => api.get<Workflow>(`/api/workflows/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 700;
    },
  });

  const retry = useMutation({
    mutationFn: () => api.post<Workflow>(`/api/workflows/${id}/retry`),
    onSuccess: (created) => {
      push("Workflow restarted", "A fresh run was created with a new idempotency key.", "success");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      navigate(`/app/workflows/${created.id}`);
    },
    onError: (error: Error) => push("Could not retry", error.message, "error"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[520px]" />
        </div>
      </div>
    );
  }

  if (isError || !workflow) {
    return (
      <Card className="p-10">
        <EmptyState
          icon={AlertTriangle}
          title="Workflow not found"
          description="This run may have been removed, or you may not have access to it."
          action={
            <Button onClick={() => navigate("/app/workflows")}>
              <ArrowLeft size={13} /> Back to history
            </Button>
          }
        />
      </Card>
    );
  }

  const orders = workflow.orders || [];
  const invoices = workflow.invoices || [];
  const approvals = workflow.approvals || [];
  const executions = workflow.executions || [];
  const verifyTask = workflow.tasks?.find((task) => task.action === "reporting.verify_order");
  const verifyChecks = (verifyTask?.result?.checks as
    | { name: string; passed: boolean; detail: string }[]
    | undefined) || [];
  const canRetry = workflow.status === "completed" || workflow.status === "failed";
  const live = workflow.status === "queued" || workflow.status === "running";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/app/workflows")}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={13} /> All workflows
        </button>
        <div className="flex items-center gap-2">
          {canRetry && (
            <Button variant="outline" size="sm" onClick={() => retry.mutate()} loading={retry.isPending}>
              <RotateCcw size={12} /> Retry run
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw size={12} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-forest-100/60 blur-3xl" />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={workflow.status} />
            <Badge tone="pending">{titleCase(workflow.intent)}</Badge>
            {workflow.verification_status === "verified" && (
              <Badge tone="verified">
                <BadgeCheck size={10} /> Verified
              </Badge>
            )}
            {workflow.verification_status === "read_only" && (
              <Badge tone="read_only">
                <Database size={10} /> Read-only
              </Badge>
            )}
            {workflow.ai_mode === "vultr" ? (
              <Badge tone="info">
                <Sparkles size={10} /> {workflow.ai_model || "Vultr inference"}
              </Badge>
            ) : (
              <Badge tone="queued">
                <Terminal size={10} /> Deterministic planner
              </Badge>
            )}
          </div>

          <h1 className="mt-3 max-w-3xl text-[18px] font-semibold leading-7 tracking-[-0.02em] text-ink sm:text-[21px]">
            {workflow.instruction}
          </h1>

          {workflow.summary && (
            <p className="mt-2 max-w-3xl text-[12.5px] leading-6 text-muted">{workflow.summary}</p>
          )}

          {workflow.status === "failed" && workflow.error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <p className="text-[10.5px] font-semibold text-rose-800">
                  Stopped safely — no partial writes retained
                </p>
                <p className="mt-0.5 text-[10.5px] leading-5 text-rose-700">{workflow.error}</p>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Run time", value: duration(workflow.duration_ms), icon: Timer },
              { label: "Steps", value: `${workflow.completed_tasks}/${workflow.task_count}`, icon: Waypoints },
              { label: "Checks", value: String(verifyChecks.length || "—"), icon: ShieldCheck },
              { label: "Tokens", value: workflow.tokens_used ? workflow.tokens_used.toLocaleString() : "0", icon: Cpu },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sage">
                    <Icon size={9} /> {item.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[12px] font-semibold text-ink">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9.5px] text-sage">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={10} /> created {formatDate(workflow.created_at, true)}
            </span>
            {workflow.finished_at && <span>finished {formatDate(workflow.finished_at, true)}</span>}
            <span className="font-mono">id {workflow.id.slice(0, 8)}</span>
            {live && <span className="font-semibold text-blue-700">live · polling</span>}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
        <div className="space-y-4">
          {live ? (
            <WorkflowTimeline workflow={workflow} compact />
          ) : (
            <WorkflowTimeline workflow={workflow} />
          )}

          {executions.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-paper text-sage">
                    <Gauge size={13} />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-ink">Execution ledger</p>
                    <p className="text-[9.5px] text-muted">Tool calls with measured latency</p>
                  </div>
                </div>
                <span className="font-mono text-[9px] text-sage">{executions.length} calls</span>
              </div>
              <div className="scrollbar-thin max-h-[320px] divide-y divide-line/60 overflow-y-auto">
                {executions.map((execution) => (
                  <div key={execution.id} className="flex items-center gap-3 px-5 py-2.5">
                    <AgentChip agentKey={execution.agent} size="sm" showName={false} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[10px] text-ink">{execution.tool}</p>
                      <p className="text-[9px] text-sage">
                        {execution.status} · {formatDate(execution.created_at, true)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-[9.5px] font-semibold",
                        execution.status === "error" ? "text-rose-600" : "text-forest-700"
                      )}
                    >
                      {execution.latency_ms}ms
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {verifyChecks.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                    <ShieldCheck size={13} />
                  </span>
                  <p className="text-[12px] font-semibold text-ink">Verification checks</p>
                </div>
                <Badge tone={workflow.verification_status}>{verifyChecks.filter((c) => c.passed).length}/{verifyChecks.length}</Badge>
              </div>
              <div className="divide-y divide-line/70">
                {verifyChecks.map((check) => (
                  <div key={check.name} className="flex items-start gap-2.5 px-5 py-2.5">
                    {check.passed ? (
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-forest-600" />
                    ) : (
                      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-rose-600" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-medium text-ink">{check.name}</p>
                      <p className="truncate font-mono text-[9px] text-sage">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(orders.length > 0 || invoices.length > 0) && (
            <Card className="p-5">
              <p className="text-[12px] font-semibold text-ink">Records created</p>
              <p className="text-[9.5px] text-muted">Linked business records from this run</p>
              <div className="mt-3 space-y-2">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/app/orders/${order.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 px-3.5 py-2.5 transition hover:border-forest-200 hover:bg-white"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <FileText size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10.5px] font-semibold text-ink">{order.order_number}</p>
                      <p className="text-[9px] text-muted">{order.customer_name}</p>
                    </div>
                    <p className="font-mono text-[10.5px] font-semibold text-ink">
                      {money(order.total, order.currency)}
                    </p>
                    <ArrowUpRight size={12} className="text-sage" />
                  </Link>
                ))}
                {invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to="/app/finance"
                    className="flex items-center gap-3 rounded-xl border border-line bg-paper/50 px-3.5 py-2.5 transition hover:border-forest-200 hover:bg-white"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <FileText size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10.5px] font-semibold text-ink">{invoice.invoice_number}</p>
                      <p className="text-[9px] text-muted">{titleCase(invoice.status)} invoice</p>
                    </div>
                    <p className="font-mono text-[10.5px] font-semibold text-ink">
                      {money(invoice.total, invoice.currency)}
                    </p>
                    <ArrowUpRight size={12} className="text-sage" />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {approvals.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-ink">Approvals</p>
                <Link to="/app/approvals" className="text-[10px] font-semibold text-forest-700 hover:underline">
                  Open center
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {approvals.map((approval) => (
                  <div key={approval.id} className="rounded-xl border border-line bg-paper/50 px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10.5px] font-semibold text-ink">{approval.title}</p>
                      <StatusBadge status={approval.status} dot={false} />
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-4 text-muted">{approval.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <p className="text-[12px] font-semibold text-ink">Run metadata</p>
            <div className="mt-2 divide-y divide-line/60">
              <KeyValue label="Workflow ID" value={<span className="font-mono text-[10px]">{workflow.id.slice(0, 18)}…</span>} />
              <KeyValue label="Verification" value={titleCase(workflow.verification_status)} />
              <KeyValue label="Planner mode" value={workflow.ai_mode === "vultr" ? "Vultr inference" : "Deterministic"} />
              <KeyValue label="Model" value={workflow.ai_model || "—"} />
              <KeyValue label="Tokens used" value={workflow.tokens_used || 0} />
              <KeyValue label="Idempotency" value="Enforced" />
              <KeyValue label="Transactional writes" value="Order core atomic" />
            </div>
            {workflow.status === "completed" && (
              <>
                <Divider className="my-3" />
                <p className="flex items-start gap-1.5 text-[9.5px] leading-4 text-sage">
                  <BadgeCheck size={11} className="mt-0.5 shrink-0 text-forest-600" />
                  A workflow is only marked complete after its tools succeed. Sensitive actions remain
                  pending until a human decides.
                </p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
