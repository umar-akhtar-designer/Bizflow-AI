import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  ClipboardList,
  Command,
  CornerDownLeft,
  Database,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  Loader2,
  Package,
  Play,
  Receipt,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  SquarePen,
  TrendingUp,
  Users,
  Waypoints,
  X,
  Zap,
} from "lucide-react";
import { WorkflowTimeline } from "@/components/WorkflowTimeline";
import { Alert, Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { AIStatusPill, LiveDot, StatusBadge } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { cn, duration, money, relativeTime, titleCase } from "@/lib/utils";
import type { AIStatus, Approval, Workflow } from "@/types";

const SUGGESTIONS = [
  {
    icon: Zap,
    label: "Order-to-cash",
    prompt:
      "Process an order for Ahmed Raza for 3 units of Product A, generate the invoice, record the sale and prepare a confirmation message.",
    tone: "text-forest-700 bg-forest-50",
  },
  {
    icon: Package,
    label: "Restock planning",
    prompt: "Check low stock and prepare a restock request for the warehouse.",
    tone: "text-amber-700 bg-amber-50",
  },
  {
    icon: TrendingUp,
    label: "Weekly report",
    prompt: "Give me a weekly business report with sales trends and inventory insights.",
    tone: "text-blue-700 bg-blue-50",
  },
  {
    icon: Receipt,
    label: "Receivables",
    prompt: "How much is outstanding on unpaid invoices, and what is overdue?",
    tone: "text-violet-700 bg-violet-50",
  },
  {
    icon: Users,
    label: "Customer briefing",
    prompt: "Pull up a full history and lifetime value for Sara Khan.",
    tone: "text-orange-700 bg-orange-50",
  },
  {
    icon: ShieldCheck,
    label: "Refund request",
    prompt: "Prepare a refund of 120 for Ahmed Raza and hold it for approval.",
    tone: "text-rose-700 bg-rose-50",
  },
];

function VerificationPanel({ workflow }: { workflow: Workflow }) {
  const verifyTask = workflow.tasks?.find((task) => task.action === "reporting.verify_order");
  const checks = (verifyTask?.result?.checks as
    | { name: string; passed: boolean; detail: string }[]
    | undefined) || [];

  if (!checks.length) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
            <BadgeCheck size={14} />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-ink">Independent verification</p>
            <p className="text-[9.5px] text-muted">Records read back from the database</p>
          </div>
        </div>
        <Badge tone={workflow.verification_status}>{workflow.verification_status.replace("_", " ")}</Badge>
      </div>
      <div className="divide-y divide-line/70">
        {checks.map((check) => (
          <div key={check.name} className="flex items-center gap-3 px-5 py-2.5">
            {check.passed ? (
              <CheckCircle2 size={14} className="shrink-0 text-forest-600" />
            ) : (
              <AlertTriangle size={14} className="shrink-0 text-rose-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-ink">{check.name}</p>
              <p className="truncate font-mono text-[9px] text-sage">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ApprovalCard({ approval }: { approval: Approval }) {
  const payload = approval.payload || {};
  const isMessage = approval.action_type === "send_customer_message";
  return (
    <Card className="overflow-hidden border-violet-200">
      <div className="flex items-start justify-between gap-3 border-b border-violet-100 bg-violet-50/60 px-5 py-3.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <ShieldCheck size={14} />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-ink">{approval.title}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted">{approval.description}</p>
          </div>
        </div>
        <StatusBadge status={approval.status} />
      </div>
      <div className="px-5 py-3.5">
        {isMessage && payload.subject && (
          <div className="rounded-xl border border-line bg-paper/60 p-3.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Draft subject</p>
            <p className="mt-1 text-[11px] font-semibold text-ink">{payload.subject}</p>
            {payload.body && (
              <>
                <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-sage">Body</p>
                <p className="prose-email mt-1 line-clamp-5">{payload.body}</p>
              </>
            )}
          </div>
        )}
        {!isMessage && approval.payload?.amount !== undefined && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-paper/60 px-3.5 py-2.5">
            <span className="text-[10px] text-muted">Proposed amount</span>
            <span className="font-mono text-[12px] font-semibold text-ink">
              {money(Number(payload.amount))}
            </span>
          </div>
        )}
        {approval.action_type === "restock_products" && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-paper/60 px-3.5 py-2.5">
            <span className="text-[10px] text-muted">Proposed purchase</span>
            <span className="font-mono text-[12px] font-semibold text-ink">
              {money(Number(payload.estimated_cost || 0))} · {(payload.items || []).length} SKUs
            </span>
          </div>
        )}
        <p className="mt-2.5 inline-flex items-center gap-1.5 text-[9.5px] font-semibold text-violet-800">
          <ShieldCheck size={11} /> Nothing external has happened yet — a human decision is required.
        </p>
        <Link
          to="/app/approvals"
          className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-violet-900 hover:text-violet-950"
        >
          Review in Approval Center <ArrowRight size={11} />
        </Link>
      </div>
    </Card>
  );
}

function ResultSummary({
  workflow,
  onReset,
}: {
  workflow: Workflow;
  onReset: () => void;
}) {
  const navigate = useNavigate();
  const orders = workflow.orders || [];
  const invoices = workflow.invoices || [];
  const approvals = (workflow.approvals || []).filter((item) => item.status === "pending");
  const verifyTask = workflow.tasks?.find((task) => task.action === "reporting.verify_order");
  const finalizeTask = workflow.tasks?.find((task) => task.action === "reporting.finalize");
  const saved = finalizeTask?.result?.estimated_time_saved_minutes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-4"
    >
      <Card
        className={cn(
          "relative overflow-hidden p-5",
          workflow.status === "failed" ? "border-rose-200" : "border-forest-200"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl",
            workflow.status === "failed" ? "bg-rose-100/70" : "bg-forest-100/70"
          )}
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  workflow.status === "failed"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-forest-50 text-forest-700"
                )}
              >
                {workflow.status === "failed" ? (
                  <AlertTriangle size={17} />
                ) : (
                  <BadgeCheck size={17} />
                )}
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink">
                  {workflow.status === "failed"
                    ? "Workflow stopped safely"
                    : workflow.verification_status === "verified"
                    ? "Workflow complete & verified"
                    : "Workflow complete"}
                </p>
                <p className="font-mono text-[9.5px] text-sage">
                  {titleCase(workflow.intent)} · {duration(workflow.duration_ms)} ·{" "}
                  {workflow.tasks?.length || 0} steps · {workflow.ai_mode}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={workflow.status} />
              <Button variant="outline" size="sm" onClick={onReset}>
                <SquarePen size={12} /> New
              </Button>
            </div>
          </div>

          <p className="mt-4 text-[13px] leading-6 text-ink/90">
            {workflow.summary || workflow.error || "Workflow finished."}
          </p>

          {workflow.status !== "failed" && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Verified checks</p>
                <p className="mt-0.5 font-mono text-[13px] font-semibold text-ink">
                  {(verifyTask?.result?.checks as unknown[] | undefined)?.length || 0}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Real duration</p>
                <p className="mt-0.5 font-mono text-[13px] font-semibold text-ink">
                  {duration(workflow.duration_ms)}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sage">
                  Est. time saved
                </p>
                <p className="mt-0.5 font-mono text-[13px] font-semibold text-forest-700">
                  {saved ? `${saved} min` : "—"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigate(`/app/workflows/${workflow.id}`)}>
              <Waypoints size={12} /> Full audit trail
            </Button>
            {orders[0] && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/app/orders/${orders[0].id}`)}
              >
                <ClipboardList size={12} /> {orders[0].order_number}
              </Button>
            )}
            {invoices[0] && (
              <Button size="sm" variant="outline" onClick={() => navigate("/app/finance")}>
                <FileText size={12} /> {invoices[0].invoice_number}
              </Button>
            )}
            {approvals.length > 0 && (
              <Button
                size="sm"
                variant="soft"
                onClick={() => navigate("/app/approvals")}
                className="bg-violet-50 text-violet-800 hover:bg-violet-100"
              >
                <ShieldCheck size={12} /> {approvals.length} approval waiting
              </Button>
            )}
          </div>
          <p className="mt-3 text-[9px] leading-4 text-sage">
            Estimated time saved uses an illustrative 14-minute manual order-to-cash baseline — not a
            timed user study. Actual run duration is measured.
          </p>
        </div>
      </Card>

      <VerificationPanel workflow={workflow} />

      {approvals.map((approval) => (
        <ApprovalCard key={approval.id} approval={approval} />
      ))}
    </motion.div>
  );
}

export default function Manager() {
  const [params, setParams] = useSearchParams();
  const promptParam = params.get("prompt") || "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [instruction, setInstruction] = useState(promptParam);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [submittedInstruction, setSubmittedInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoRan = useRef(false);
  const lastStatus = useRef<string | null>(null);

  const { data: aiStatus } = useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => api.get<AIStatus>("/api/ai/status"),
  });

  useEffect(() => {
    if (promptParam) setInstruction(promptParam);
  }, [promptParam]);

  const start = useMutation({
    mutationFn: (text: string) =>
      api.post<Workflow>("/api/workflows", {
        instruction: text,
        idempotency_key:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `wf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      }),
    onMutate: () => setError(null),
    onSuccess: (workflow, text) => {
      setWorkflowId(workflow.id);
      setSubmittedInstruction(text);
      lastStatus.current = workflow.status;
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => api.get<Workflow>(`/api/workflows/${workflowId}`),
    enabled: Boolean(workflowId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "failed" ? false : 650;
    },
  });

  useEffect(() => {
    if (!workflow) return;
    if (lastStatus.current && lastStatus.current !== workflow.status) {
      if (workflow.status === "completed") {
        push(
          workflow.verification_status === "verified"
            ? "Workflow verified"
            : "Workflow completed",
          workflow.summary || "All steps finished.",
          "success"
        );
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["approvals"] });
        queryClient.invalidateQueries({ queryKey: ["workflows"] });
      }
      if (workflow.status === "failed") {
        push("Workflow stopped safely", workflow.error || "No partial writes were kept.", "error");
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    }
    lastStatus.current = workflow.status;
  }, [workflow, push, queryClient]);

  const run = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setError("Describe the business task you want to run.");
      textareaRef.current?.focus();
      return;
    }
    start.mutate(trimmed);
  };

  // Auto-run when arriving from a dashboard/landing deep link. The ref guard
  // prevents a duplicate run under React StrictMode.
  useEffect(() => {
    if (!promptParam || autoRan.current) return;
    autoRan.current = true;
    setParams({}, { replace: true });
    run(promptParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptParam]);

  const terminal = workflow && (workflow.status === "completed" || workflow.status === "failed");
  const busy = start.isPending || (workflow && !terminal);

  const reset = () => {
    setWorkflowId(null);
    setInstruction("");
    setSubmittedInstruction("");
    setError(null);
    setParams({}, { replace: true });
    lastStatus.current = null;
    window.setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-line bg-cream px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-forest-700">
            <Sparkles size={11} /> AI Business Manager
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-ink sm:text-[30px]">
            What should the team handle?
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-6 text-muted">
            Describe the outcome. BizFlow resolves real customers and products, builds a tool-bound
            plan, writes to the database and verifies its own work before reporting back.
          </p>
        </div>
        <AIStatusPill status={aiStatus} />
      </div>

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-forest-100/60 blur-3xl" />
        <div className="relative p-4 sm:p-5">
          <div className="flex items-center gap-2 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-cream">
              <Bot size={14} />
            </span>
            <div className="flex-1">
              <p className="text-[11.5px] font-semibold text-ink">Instruction</p>
              <p className="text-[9.5px] text-muted">Plain language. Real database operations.</p>
            </div>
            <span className="hidden items-center gap-1 font-mono text-[8.5px] text-sage sm:flex">
              <Command size={9} /> Enter to run
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!busy) run(instruction);
              }
            }}
            rows={3}
            placeholder="e.g. Process an order for Ahmed Raza for 3 units of Product A, generate the invoice, record the sale and prepare a confirmation message."
            className="scrollbar-thin w-full resize-none rounded-xl border border-line bg-white px-3.5 py-3 text-[13px] leading-6 text-ink outline-none transition placeholder:text-sage/70 focus:border-forest-400 focus:ring-4 focus:ring-forest-100"
          />

          {error && (
            <div className="mt-2.5">
              <Alert tone="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[9.5px] leading-4 text-sage">
              {aiStatus?.mode === "vultr"
                ? "Vultr inference refines intent; execution tools stay fixed and validated."
                : "Deterministic planner active — full execution without an LLM key."}
            </p>
            <div className="flex items-center gap-2">
              {busy && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-700">
                  <Loader2 size={12} className="animate-spin" /> running
                </span>
              )}
              <Button
                onClick={() => run(instruction)}
                loading={start.isPending}
                disabled={Boolean(busy) && !start.isPending}
                className="min-w-[132px]"
              >
                {!start.isPending && <Play size={13} />}
                {start.isPending ? "Starting" : "Run workflow"}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative border-t border-line bg-paper/50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-sage">
              Try
            </span>
            {SUGGESTIONS.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={suggestion.label}
                  onClick={() => {
                    setInstruction(suggestion.prompt);
                    textareaRef.current?.focus();
                  }}
                  className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-cream px-2.5 py-1.5 text-[10px] font-medium text-muted transition hover:border-forest-200 hover:text-ink"
                >
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded", suggestion.tone)}>
                    <Icon size={9} />
                  </span>
                  {suggestion.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <AnimatePresence mode="popLayout">
        {workflowId && (
          <motion.div
            key="run"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-cream px-4 py-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-forest-50 text-forest-700">
                    <CornerDownLeft size={11} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Your instruction</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-ink">
                      {submittedInstruction}
                    </p>
                  </div>
                </div>
                {busy ? <LiveDot label="Running" /> : <StatusBadge status={workflow?.status || "queued"} />}
              </div>

              {isLoading && !workflow ? (
                <Skeleton className="h-[420px]" />
              ) : workflow ? (
                <WorkflowTimeline workflow={workflow} />
              ) : null}
            </div>

            <div className="space-y-4">
              {workflow && terminal ? (
                <ResultSummary workflow={workflow} onReset={reset} />
              ) : (
                <Card className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Database size={15} />
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-ink">Working on real records</p>
                      <p className="text-[9.5px] text-muted">
                        Every step below is a validated backend tool
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {[
                      ["1", "Resolve entities", "Customer and product matched against the live database."],
                      ["2", "Plan & guard", "Stock is validated before the first write; the order core is atomic."],
                      ["3", "Write & verify", "Order, sale, invoice and movement are read back and compared."],
                      ["4", "Hold for approval", "Customer messages and refunds wait for a human decision."],
                    ].map(([step, title, copy]) => (
                      <div key={step} className="flex gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-[9px] font-bold text-sage ring-1 ring-line">
                          {step}
                        </span>
                        <div>
                          <p className="text-[11px] font-semibold text-ink">{title}</p>
                          <p className="mt-0.5 text-[10px] leading-5 text-muted">{copy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-800">
                      <ShieldCheck size={11} /> Safe failure by design
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-amber-900">
                      Insufficient stock or a failed check rolls back the entire order core. A workflow
                      is never marked complete with missing records.
                    </p>
                  </div>
                </Card>
              )}

              <Card className="border-dashed bg-paper/40 p-4">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-sage">
                  <Lightbulb size={11} /> Demo tip
                </p>
                <p className="mt-1.5 text-[10.5px] leading-5 text-muted">
                  After a successful order run, open{" "}
                  <Link to="/app/approvals" className="font-semibold text-forest-700 hover:underline">
                    Approvals
                  </Link>{" "}
                  to send the prepared message, or{" "}
                  <Link to="/app/inventory" className="font-semibold text-forest-700 hover:underline">
                    Inventory
                  </Link>{" "}
                  to confirm the stock decrement.
                </p>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!workflowId && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-forest-700" />
              <p className="text-[12px] font-semibold text-ink">What can it do?</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ["Create orders", "Real order, items, stock movement and totals"],
                ["Issue invoices", "Deterministic tax, 14-day due date, payments"],
                ["Audit inventory", "Reorder risk with recommended quantities"],
                ["Compile reports", "Revenue, top products and receivables"],
                ["Customer briefings", "History, lifetime value and balances"],
                ["Prepare sensitive actions", "Refunds, restocks and messages held for approval"],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-xl border border-line/80 bg-paper/50 px-3 py-2.5">
                  <p className="text-[10.5px] font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-[9.5px] leading-4 text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Waypoints size={15} className="text-forest-700" />
              <p className="text-[12px] font-semibold text-ink">Recently run</p>
            </div>
            <RecentWorkflows />
          </Card>
        </div>
      )}
    </div>
  );
}

function RecentWorkflows() {
  const { data, isLoading } = useQuery({
    queryKey: ["workflows", "recent-manager"],
    queryFn: () => api.get<{ items: Workflow[] }>("/api/workflows", { limit: 4 }),
  });

  if (isLoading) {
    return (
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <EmptyState
        icon={Waypoints}
        title="No runs yet"
        description="Your first workflow will appear here with its full audit trail."
        className="py-8"
      />
    );
  }

  return (
    <div className="mt-2 divide-y divide-line/70">
      {data.items.map((item) => (
        <Link
          key={item.id}
          to={`/app/workflows/${item.id}`}
          className="flex items-center gap-3 py-2.5 transition hover:opacity-75"
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
              item.status === "failed"
                ? "bg-rose-50 text-rose-600"
                : item.status === "completed"
                ? "bg-forest-50 text-forest-700"
                : "bg-blue-50 text-blue-600"
            )}
          >
            {item.status === "failed" ? <AlertTriangle size={11} /> : <Zap size={11} />}
          </span>
          <p className="min-w-0 flex-1 truncate text-[10.5px] text-ink">{item.instruction}</p>
          <span className="shrink-0 font-mono text-[8.5px] text-sage">
            {relativeTime(item.created_at)}
          </span>
          <ArrowUpRight size={11} className="shrink-0 text-sage" />
        </Link>
      ))}
    </div>
  );
}
