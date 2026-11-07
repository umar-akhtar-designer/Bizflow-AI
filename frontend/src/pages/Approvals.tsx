import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Inbox,
  Mail,
  MessageSquareText,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Label, Modal, SectionTitle, Skeleton, Tabs, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { cn, formatDate, money, relativeTime, titleCase } from "@/lib/utils";
import type { Approval } from "@/types";

const actionMeta: Record<
  string,
  { label: string; icon: typeof Mail; tone: string; consequence: string }
> = {
  send_customer_message: {
    label: "Customer message",
    icon: MessageSquareText,
    tone: "bg-blue-50 text-blue-700",
    consequence:
      "Approving queues this message in the demo outbox. No external email provider is configured, so nothing is delivered to the customer.",
  },
  refund_invoice: {
    label: "Refund",
    icon: Undo2,
    tone: "bg-rose-50 text-rose-600",
    consequence:
      "Approving records a negative payment against the invoice, reduces the paid balance and updates the invoice status. This is a real financial write.",
  },
  restock_products: {
    label: "Restock",
    icon: Package,
    tone: "bg-amber-50 text-amber-700",
    consequence:
      "Approving increases stock for each SKU and writes an inventory movement record. Cash is not moved in this demo.",
  },
};

function payloadRows(approval: Approval) {
  const payload = approval.payload || {};
  const rows: [string, string][] = [];
  if (payload.recipient) rows.push(["Recipient", String(payload.recipient)]);
  if (payload.order_number) rows.push(["Order", String(payload.order_number)]);
  if (payload.invoice_number) rows.push(["Invoice", String(payload.invoice_number)]);
  if (payload.amount !== undefined) rows.push(["Amount", money(Number(payload.amount))]);
  if (payload.estimated_cost !== undefined)
    rows.push(["Estimated cost", money(Number(payload.estimated_cost))]);
  if (payload.units_received !== undefined)
    rows.push(["Units received", String(payload.units_received)]);
  if (payload.delivery_status) rows.push(["Delivery", String(payload.delivery_status)]);
  return rows;
}

function ApprovalItem({
  approval,
  onDecide,
}: {
  approval: Approval;
  onDecide: (approval: Approval, decision: "approve" | "reject") => void;
}) {
  const meta = actionMeta[approval.action_type] || {
    label: titleCase(approval.action_type),
    icon: ShieldCheck,
    tone: "bg-paper text-muted",
    consequence: "This action is recorded in the audit log.",
  };
  const Icon = meta.icon;
  const payload = approval.payload || {};
  const rows = payloadRows(approval);
  const pending = approval.status === "pending";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={cn("overflow-hidden", pending ? "border-line" : "bg-cream/60")}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12.5px] font-semibold text-ink">{approval.title}</p>
                <StatusBadge status={approval.status} />
              </div>
              <p className="mt-1 max-w-2xl text-[10.5px] leading-5 text-muted">{approval.description}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-sage">
                <span className="rounded-full bg-paper px-2 py-0.5 font-semibold uppercase tracking-wider">
                  {meta.label}
                </span>
                <span>requested {relativeTime(approval.requested_at)}</span>
                {approval.workflow_id && (
                  <Link
                    to={`/app/workflows/${approval.workflow_id}`}
                    className="inline-flex items-center gap-0.5 font-semibold text-forest-700 hover:underline"
                  >
                    view workflow <ArrowUpRight size={9} />
                  </Link>
                )}
              </div>
            </div>
          </div>
          <p className="shrink-0 font-mono text-[9px] text-sage">
            {approval.id.slice(0, 8)}
          </p>
        </div>

        <div className="px-5 py-4">
          {approval.action_type === "send_customer_message" && payload.subject && (
            <div className="rounded-xl border border-line bg-paper/60 p-3.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Prepared message — not sent</p>
              <p className="mt-1.5 text-[11px] font-semibold text-ink">{payload.subject}</p>
              {payload.body && <p className="prose-email mt-2 line-clamp-6">{payload.body}</p>}
            </div>
          )}

          {rows.length > 0 && (
            <div className="mt-2 grid gap-x-6 gap-y-1.5 rounded-xl border border-line bg-paper/60 px-3.5 py-3 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <span className="text-[9.5px] uppercase tracking-wider text-sage">{label}</span>
                  <span className="truncate font-mono text-[10px] font-medium text-ink">{value}</span>
                </div>
              ))}
            </div>
          )}

          {pending ? (
            <>
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2.5">
                <ShieldCheck size={12} className="mt-0.5 shrink-0 text-violet-700" />
                <p className="text-[9.5px] leading-5 text-violet-900">{meta.consequence}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[9.5px] font-semibold text-violet-800">
                  <Clock3 size={11} /> Awaiting a human decision
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onDecide(approval, "reject")}>
                    <X size={12} /> Reject
                  </Button>
                  <Button size="sm" onClick={() => onDecide(approval, "approve")}>
                    <Check size={13} /> Approve & execute
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div
              className={cn(
                "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5",
                approval.status === "approved"
                  ? "border-forest-200 bg-forest-50/60"
                  : "border-rose-200 bg-rose-50/60"
              )}
            >
              {approval.status === "approved" ? (
                <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-forest-700" />
              ) : (
                <X size={12} className="mt-0.5 shrink-0 text-rose-600" />
              )}
              <div>
                <p className="text-[9.5px] font-semibold text-ink">
                  {approval.status === "approved" ? "Approved and executed" : "Rejected — no action taken"}
                  {approval.decided_at && (
                    <span className="ml-1 font-normal text-sage">
                      · {formatDate(approval.decided_at, true)}
                    </span>
                  )}
                </p>
                {approval.decision_note && (
                  <p className="mt-0.5 text-[9.5px] leading-4 text-muted">"{approval.decision_note}"</p>
                )}
                <p className="mt-0.5 font-mono text-[8.5px] text-sage">
                  {String(approval.payload?.delivery_status || approval.status)}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default function Approvals() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [tab, setTab] = useState("pending");
  const [target, setTarget] = useState<{ approval: Approval; decision: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["approvals", "list"],
    queryFn: () => api.get<{ items: Approval[]; total: number; pending_count: number }>("/api/approvals"),
    refetchInterval: 20_000,
  });

  const decide = useMutation({
    mutationFn: ({ approval, decision, note: decisionNote }: { approval: Approval; decision: "approve" | "reject"; note?: string }) =>
      api.post<Approval>(`/api/approvals/${approval.id}/${decision}`, { note: decisionNote || null }),
    onSuccess: (updated, variables) => {
      push(
        variables.decision === "approve" ? "Approved and executed" : "Request rejected",
        variables.decision === "approve"
          ? `${actionMeta[updated.action_type]?.label || "Action"} completed and written to the audit log.`
          : "No external action was taken.",
        variables.decision === "approve" ? "success" : "info"
      );
      setTarget(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["workflow"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (error: Error) => push("Decision failed", error.message, "error"),
  });

  const counts = useMemo(() => {
    const rows = data?.items || [];
    return {
      pending: rows.filter((item) => item.status === "pending").length,
      approved: rows.filter((item) => item.status === "approved").length,
      rejected: rows.filter((item) => item.status === "rejected").length,
    };
  }, [data]);

  const items = (data?.items || []).filter((item) =>
    tab === "all" ? true : item.status === tab
  );

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Human in the loop"
        title="Approval center"
        description="Sensitive actions never execute silently. Review the prepared payload, then decide — every decision is audited."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw size={13} /> Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "approved", label: "Approved", count: counts.approved },
            { value: "rejected", label: "Rejected", count: counts.rejected },
            { value: "all", label: "All", count: data?.items.length || 0 },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 text-[9.5px] text-sage">
          <span className="inline-flex items-center gap-1"><Clock3 size={10} /> prepared ≠ executed</span>
          <span className="h-3 w-px bg-line" />
          <span className="inline-flex items-center gap-1"><BadgeCheck size={10} /> policy enforced server-side</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : isError ? (
        <Card className="p-10">
          <EmptyState
            icon={AlertTriangle}
            title="Could not load approvals"
            description="Check the API connection and retry."
            action={<Button onClick={() => refetch()}><RefreshCw size={13} /> Retry</Button>}
          />
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Inbox}
            title={tab === "pending" ? "No approvals waiting" : "Nothing here yet"}
            description={
              tab === "pending"
                ? "When an agent prepares a message, refund or restock, it appears here for your decision."
                : "Decided requests will be listed here with their audit note."
            }
            action={
              <Link to="/app/manager">
                <Button variant="soft" size="sm"><Sparkles size={12} /> Run a workflow</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((approval) => (
              <ApprovalItem
                key={approval.id}
                approval={approval}
                onDecide={(selected, decision) => {
                  setTarget({ approval: selected, decision });
                  setNote("");
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Card className="border-dashed bg-paper/40 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cream text-forest-700 ring-1 ring-line">
            <ShieldCheck size={15} />
          </span>
          <div>
            <p className="text-[11.5px] font-semibold text-ink">Why these actions are gated</p>
            <p className="mt-1 max-w-2xl text-[10.5px] leading-5 text-muted">
              External customer communication, refunds, restock purchases and other sensitive financial
              actions create an approval request instead of executing. The agent can prepare the payload
              and show its reasoning, but a named human must approve before any side effect occurs. The
              request, decision, note and timestamp are all persisted in the audit log.
            </p>
          </div>
        </div>
      </Card>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.decision === "approve" ? "Approve and execute" : "Reject request"}
        description={
          target?.decision === "approve"
            ? "This will execute the prepared action and write an audit entry."
            : "The request will be closed with no external side effects."
        }
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={target?.decision === "approve" ? "accent" : "danger"}
              loading={decide.isPending}
              onClick={() => {
                if (!target) return;
                decide.mutate({ approval: target.approval, decision: target.decision, note });
              }}
            >
              {target?.decision === "approve" ? <Check size={13} /> : <X size={13} />}
              {target?.decision === "approve" ? "Approve & execute" : "Reject request"}
            </Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-paper/60 p-3.5">
              <p className="text-[11px] font-semibold text-ink">{target.approval.title}</p>
              <p className="mt-1 text-[10.5px] leading-5 text-muted">{target.approval.description}</p>
            </div>
            <div
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2.5",
                target.decision === "approve"
                  ? "border-violet-200 bg-violet-50/60 text-violet-900"
                  : "border-rose-200 bg-rose-50/60 text-rose-800"
              )}
            >
              {target.decision === "approve" ? (
                <ShieldCheck size={12} className="mt-0.5 shrink-0" />
              ) : (
                <RotateCcw size={12} className="mt-0.5 shrink-0" />
              )}
              <p className="text-[9.5px] leading-5">
                {target.decision === "approve"
                  ? actionMeta[target.approval.action_type]?.consequence
                  : "Rejecting records your decision and prevents execution. The prepared payload is retained for audit."}
              </p>
            </div>
            <div>
              <Label htmlFor="decision-note" hint="Optional">
                Decision note
              </Label>
              <Textarea
                id="decision-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add context for the audit log…"
                maxLength={500}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
