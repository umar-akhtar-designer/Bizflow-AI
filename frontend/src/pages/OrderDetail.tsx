import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileText,
  Mail,
  Package,
  Receipt,
  ShieldCheck,
  User,
} from "lucide-react";
import { Badge, Button, Card, Divider, EmptyState, KeyValue, Modal, SectionTitle, Select, Skeleton } from "@/components/ui";
import { StatusBadge } from "@/components/Badges";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { cn, formatDate, money } from "@/lib/utils";
import type { Order } from "@/types";
import { useState } from "react";

const statuses = ["pending", "confirmed", "processing", "fulfilled", "cancelled"];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<Order>(`/api/orders/${id}`),
    enabled: Boolean(id),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch<Order>(`/api/orders/${id}/status`, { status }),
    onSuccess: (updated) => {
      push("Order updated", `Status changed to ${updated.status}.`, "success");
      setConfirmCancel(false);
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (error: Error) => push("Update failed", error.message, "error"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <Card className="p-10">
        <EmptyState
          icon={AlertTriangle}
          title="Order not found"
          description="This order may have been removed or belongs to another workspace."
          action={<Button onClick={() => navigate("/app/orders")}><ArrowLeft size={13} /> Back to orders</Button>}
        />
      </Card>
    );
  }

  const invoice = order.invoice;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/app/orders")}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={13} /> All orders
        </button>
        <div className="flex items-center gap-2">
          {order.workflow_id && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/workflows/${order.workflow_id}`)}>
              <BadgeCheck size={12} /> Source workflow
            </Button>
          )}
          <Select
            value={order.status}
            onChange={(event) => {
              if (event.target.value === "cancelled") setConfirmCancel(true);
              else updateStatus.mutate(event.target.value);
            }}
            disabled={updateStatus.isPending || order.status === "cancelled"}
            className="w-[150px] text-[11px]"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <Badge tone="info">{order.channel.replace("_", " ")}</Badge>
              {invoice && <Badge tone={invoice.status}>invoice {invoice.status}</Badge>}
            </div>
            <h1 className="mt-3 font-mono text-[22px] font-semibold tracking-[-0.02em] text-ink">
              {order.order_number}
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Created {formatDate(order.created_at, true)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Order total</p>
            <p className="mt-1 font-mono text-[26px] font-semibold tracking-tight text-ink">
              {money(order.total, order.currency)}
            </p>
            <p className="text-[9px] text-sage">
              incl. {money(order.tax, order.currency)} tax
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-forest-700" />
                <p className="text-[12px] font-semibold text-ink">Line items</p>
              </div>
              <span className="font-mono text-[9px] text-sage">{order.items?.length || 0} item(s)</span>
            </div>
            <div className="divide-y divide-line/70">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper text-sage">
                    <Package size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-ink">{item.product_name}</p>
                    <p className="font-mono text-[9px] text-sage">
                      {item.quantity} × {money(item.unit_price, order.currency)}
                    </p>
                  </div>
                  <p className="font-mono text-[11px] font-semibold text-ink">
                    {money(item.line_total, order.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-line bg-paper/40 px-5 py-3.5">
              <div className="flex justify-between text-[10.5px] text-muted">
                <span>Subtotal</span>
                <span className="font-mono">{money(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-[10.5px] text-muted">
                <span>Tax</span>
                <span className="font-mono">{money(order.tax, order.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1.5 text-[12px] font-semibold text-ink">
                <span>Total</span>
                <span className="font-mono">{money(order.total, order.currency)}</span>
              </div>
            </div>
          </Card>

          {order.notes && (
            <Card className="p-5">
              <p className="text-[11px] font-semibold text-ink">Notes</p>
              <p className="mt-1 text-[10.5px] leading-5 text-muted">{order.notes}</p>
            </Card>
          )}

          {invoice && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Receipt size={14} className="text-violet-700" />
                  <p className="text-[12px] font-semibold text-ink">Linked invoice</p>
                </div>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11.5px] font-semibold text-ink">{invoice.invoice_number}</p>
                    <p className="text-[9.5px] text-muted">
                      Issued {formatDate(invoice.issued_at)} · due {formatDate(invoice.due_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[13px] font-semibold text-ink">{money(invoice.total, invoice.currency)}</p>
                    <p className="text-[9px] text-sage">paid {money(invoice.amount_paid, invoice.currency)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link to="/app/finance" className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest-700 hover:underline">
                    Open finance <ArrowUpRight size={10} />
                  </Link>
                  <span className="text-[9px] text-sage">balance {money(invoice.balance, invoice.currency)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <User size={14} className="text-blue-700" />
              <p className="text-[12px] font-semibold text-ink">Customer</p>
            </div>
            <div className="mt-3 rounded-xl border border-line bg-paper/50 p-3.5">
              <p className="text-[12px] font-semibold text-ink">{order.customer_name}</p>
              {order.customer_company && (
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                  <Building2 size={10} /> {order.customer_company}
                </p>
              )}
              <Link
                to={`/app/customers/${order.customer_id}`}
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-forest-700 hover:underline"
              >
                View profile <ArrowUpRight size={10} />
              </Link>
            </div>
            <Divider className="my-3" />
            <KeyValue label="Order ID" value={<span className="font-mono text-[9.5px]">{order.id.slice(0, 18)}…</span>} />
            <KeyValue label="Status" value={order.status} />
            <KeyValue label="Channel" value={order.channel.replace("_", " ")} />
            <KeyValue label="Currency" value={order.currency} />
            <KeyValue label="Source" value={order.workflow_id ? "AI workflow" : "Manual"} />
          </Card>

          <Card className="border-forest-200 bg-forest-50/40 p-5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-forest-700 shadow-sm">
                <CheckCircle2 size={15} />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-ink">Committed atomically</p>
                <p className="mt-1 text-[10px] leading-5 text-muted">
                  The order, line items, sale, invoice and stock movement were written in a single
                  transaction. Cancelling an order compensates stock and voids unpaid financial records.
                </p>
              </div>
            </div>
          </Card>

          {order.workflow_id && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-forest-700" />
                <p className="text-[11.5px] font-semibold text-ink">Agent provenance</p>
              </div>
              <p className="mt-1.5 text-[10px] leading-5 text-muted">
                This order was created by an audited multi-agent workflow. Inspect every tool call,
                latency and verification check.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => navigate(`/app/workflows/${order.workflow_id}`)}
              >
                <Mail size={12} /> Inspect audit trail
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this order?"
        description="This is a compensating transaction: stock is restored and unpaid financial records are voided."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmCancel(false)}>Keep order</Button>
            <Button variant="danger" size="sm" loading={updateStatus.isPending} onClick={() => updateStatus.mutate("cancelled")}>
              Cancel order
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3">
          <p className="text-[10.5px] leading-5 text-amber-900">
            Each line item's quantity will be added back to inventory with an "Order cancelled — stock
            restored" movement. If the invoice has no payments, it becomes <strong>void</strong>. The
            action is written to the audit log.
          </p>
        </div>
      </Modal>
    </div>
  );
}
