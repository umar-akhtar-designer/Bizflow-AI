import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Undo2,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  KeyValue,
  Label,
  Modal,
  ProgressBar,
  SectionTitle,
  Select,
  Skeleton,
  Tabs,
} from "@/components/ui";
import { StatusBadge } from "@/components/Badges";
import { StatCard, MiniStat } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import {
  cn,
  compactMoney,
  formatDate,
  money,
  number,
  relativeTime,
  titleCase,
} from "@/lib/utils";
import type { FinanceSummary, Invoice, InvoiceItem, Payment } from "@/types";

const methods = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-cream px-3 py-2 shadow-lift">
      <p className="text-[10px] font-semibold text-ink">{label}</p>
      {payload.map((item: any) => (
        <p key={item.name} className="mt-1 font-mono text-[10px] text-muted">
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
          {titleCase(item.name)}: {money(item.value)}
        </p>
      ))}
    </div>
  );
}

function agingLabel(key: string) {
  if (key === "current") return "Current";
  if (key === "60+") return "60+ days";
  return `${key} days`;
}

export default function Finance() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payment, setPayment] = useState({ amount: "", method: "bank_transfer", reference: "" });
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: () => api.get<FinanceSummary>("/api/finance/summary"),
    refetchInterval: 30_000,
  });

  const { data: invoiceData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["invoices", tab, search],
    queryFn: () =>
      api.get<{ items: Invoice[]; total: number; summary: FinanceSummary }>("/api/invoices", {
        status: tab === "all" ? undefined : tab,
        search: search || undefined,
      }),
    refetchInterval: 30_000,
  });

  const { data: detail } = useQuery({
    queryKey: ["invoice", selected?.id],
    queryFn: () => api.get<Invoice & { items?: InvoiceItem[]; payments?: Payment[] }>(`/api/invoices/${selected?.id}`),
    enabled: Boolean(selected?.id),
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      api.post<Invoice>(`/api/invoices/${payTarget?.id}/payments`, {
        amount: Number(payment.amount),
        method: payment.method,
        reference: payment.reference || null,
      }),
    onSuccess: (invoice) => {
      push("Payment recorded", `${invoice.invoice_number} · ${money(invoice.amount_paid, invoice.currency)} paid.`, "success");
      setPayTarget(null);
      setPayment({ amount: "", method: "bank_transfer", reference: "" });
      setPaymentError(null);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => setPaymentError(error.message),
  });

  const invoices = invoiceData?.items || [];

  const totals = useMemo(() => {
    const rows = invoiceData?.items || [];
    const billed = rows.reduce((sum, item) => sum + item.total, 0);
    const balance = rows.reduce((sum, item) => sum + item.balance, 0);
    return { billed, balance };
  }, [invoiceData]);

  const agingTotal = summary
    ? Object.values(summary.aging).reduce((sum, value) => sum + Number(value), 0)
    : 0;

  const openPayment = (invoice: Invoice) => {
    setPayTarget(invoice);
    setPayment({ amount: String(invoice.balance.toFixed(2)), method: "bank_transfer", reference: "" });
    setPaymentError(null);
  };

  const submitPayment = () => {
    if (!payTarget) return;
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a payment amount greater than zero.");
      return;
    }
    if (amount > payTarget.balance + 0.001) {
      setPaymentError(`Payment cannot exceed the outstanding balance of ${money(payTarget.balance)}.`);
      return;
    }
    recordPayment.mutate();
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Cash flow"
        title="Finance"
        description="Receivables, collections and invoice health computed from real ledger records. Payments are applied server-side with deterministic status transitions."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching && !isLoading}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const open = invoices.find((invoice) => invoice.balance > 0);
                if (open) openPayment(open);
              }}
              disabled={!invoices.some((invoice) => invoice.balance > 0)}
            >
              <Plus size={13} /> Record payment
            </Button>
          </div>
        }
      />

      {summaryLoading && !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard index={0} label="Total billed" value={compactMoney(summary?.total_billed || 0)} hint={`${number(summary?.paid_invoices || 0)} paid invoices`} icon={<Receipt size={15} />} accent="violet" />
          <StatCard index={1} label="Collected" value={compactMoney(summary?.collected || 0)} hint={`net ${compactMoney(summary?.net_revenue || 0)}`} icon={<Banknote size={15} />} accent="forest" />
          <StatCard index={2} label="Outstanding" value={compactMoney(summary?.outstanding || 0)} hint={`${number(summary?.open_invoices || 0)} open invoices`} icon={<Wallet size={15} />} accent="amber" />
          <StatCard index={3} label="Overdue" value={compactMoney(summary?.overdue || 0)} hint={Number(summary?.overdue || 0) > 0 ? "needs follow-up" : "all current"} icon={<CalendarClock size={15} />} accent={Number(summary?.overdue || 0) > 0 ? "coral" : "forest"} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Net revenue" value={compactMoney(summary?.net_revenue || 0)} tone="forest" />
        <MiniStat label="Refunds" value={compactMoney(summary?.refunds || 0)} tone={Number(summary?.refunds || 0) > 0 ? "rose" : "ink"} />
        <MiniStat label="Avg. invoice" value={compactMoney((summary?.total_billed || 0) / Math.max(summary?.paid_invoices || 0, 1))} />
        <MiniStat label="Aging exposure" value={compactMoney(agingTotal)} tone={agingTotal > 0 ? "amber" : "forest"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-ink">Billed vs collected</p>
              <p className="text-[9.5px] text-muted">Last six months from invoice records</p>
            </div>
            <Badge tone="read_only">Ledger</Badge>
          </div>
          <div className="mt-4 h-[230px]">
            {summary?.monthly_series?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.monthly_series} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DA" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#8A948D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#8A948D" }} axisLine={false} tickLine={false} tickFormatter={(value) => compactMoney(value)} width={52} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(11,20,16,0.03)" }} />
                  <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
                  <Bar dataKey="billed" name="Billed" fill="#76C4A4" radius={[5, 5, 0, 0]} maxBarSize={34} />
                  <Bar dataKey="collected" name="Collected" fill="#0B7A5C" radius={[5, 5, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Receipt} title="No invoices yet" description="Invoices will appear here as orders are processed." className="py-10" />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-ink">Receivables aging</p>
              <p className="text-[9.5px] text-muted">Outstanding balance by due bucket</p>
            </div>
            <Landmark size={14} className="text-sage" />
          </div>
          <div className="mt-4 space-y-3.5">
            {Object.entries(summary?.aging || {}).map(([key, value]) => {
              const amount = Number(value);
              const pct = agingTotal ? (amount / agingTotal) * 100 : 0;
              const tone = key === "60+" ? "rose" : key === "31-60" ? "amber" : key === "1-30" ? "blue" : "forest";
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-medium text-ink">{agingLabel(key)}</span>
                    <span className="font-mono text-[10px] font-semibold text-ink">{money(amount)}</span>
                  </div>
                  <ProgressBar value={pct} tone={tone as "forest" | "amber" | "rose" | "blue"} className="mt-1.5" />
                </div>
              );
            })}
            {!summary?.aging && (
              <p className="py-8 text-center text-[10px] text-muted">No outstanding balances.</p>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-paper/60 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-sage">
              <ShieldCheck size={10} /> Payment policy
            </p>
            <p className="mt-1 text-[9.5px] leading-4 text-muted">
              Overpayment is rejected. A payment at or above the balance marks the invoice paid in the
              same transaction.
            </p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "All invoices", count: invoiceData?.total },
            { value: "pending", label: "Pending" },
            { value: "partial", label: "Partial" },
            { value: "paid", label: "Paid" },
            { value: "void", label: "Void" },
          ]}
        />
        <div className="relative lg:w-80">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice or customer…" className="pl-8" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : isError ? (
        <Card className="p-10">
          <EmptyState icon={AlertTriangle} title="Could not load invoices" description="Check the API connection and retry." action={<Button onClick={() => refetch()}><RefreshCw size={13} /> Retry</Button>} />
        </Card>
      ) : invoices.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="Invoices are generated automatically when orders are processed."
            action={
              <Link to="/app/manager">
                <Button variant="soft" size="sm"><CircleDollarSign size={12} /> Run an order</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden items-center gap-4 border-b border-line bg-paper/50 px-5 py-2.5 text-[9px] font-bold uppercase tracking-wider text-sage md:flex">
            <span className="flex-1">Invoice</span>
            <span className="w-[150px]">Customer</span>
            <span className="w-[80px]">Status</span>
            <span className="w-[100px] text-right">Total</span>
            <span className="w-[100px] text-right">Balance</span>
            <span className="w-[120px] text-right">Due</span>
          </div>
          <div className="divide-y divide-line/70">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="group flex flex-col gap-2 px-4 py-3.5 transition hover:bg-paper/40 sm:px-5 md:flex-row md:items-center md:gap-4"
              >
                <button onClick={() => setSelected(invoice)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      invoice.status === "paid"
                        ? "bg-forest-50 text-forest-700"
                        : invoice.status === "void"
                        ? "bg-slate-100 text-slate-500"
                        : "bg-violet-50 text-violet-700"
                    )}
                  >
                    <FileText size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold text-ink group-hover:text-forest-800">
                      {invoice.invoice_number}
                    </p>
                    <p className="mt-0.5 text-[9px] text-sage">
                      {invoice.order_number ? `order ${invoice.order_number} · ` : ""}
                      issued {formatDate(invoice.issued_at)}
                    </p>
                  </div>
                </button>
                <div className="hidden w-[150px] shrink-0 md:block">
                  <p className="truncate text-[10.5px] font-medium text-ink">{invoice.customer_name}</p>
                  <p className="truncate text-[9px] text-sage">{invoice.customer_company || "—"}</p>
                </div>
                <div className="w-[80px] shrink-0">
                  <StatusBadge status={invoice.status} dot={false} className="px-2 py-0.5 text-[9px]" />
                </div>
                <div className="w-[100px] shrink-0 text-right">
                  <p className="font-mono text-[10.5px] font-semibold text-ink">{money(invoice.total, invoice.currency)}</p>
                </div>
                <div className="w-[100px] shrink-0 text-right">
                  <p className={cn("font-mono text-[10.5px] font-semibold", invoice.balance > 0 ? "text-amber-700" : "text-forest-700")}>
                    {money(invoice.balance, invoice.currency)}
                  </p>
                </div>
                <div className="flex w-[120px] shrink-0 items-center justify-end gap-1">
                  <span className="hidden text-[9px] text-sage xl:block">{formatDate(invoice.due_date)}</span>
                  {invoice.balance > 0 && invoice.status !== "void" && (
                    <Button variant="ghost" size="sm" onClick={() => openPayment(invoice)} title="Record payment">
                      <CreditCard size={12} /> Pay
                    </Button>
                  )}
                  <ArrowUpRight
                    size={12}
                    className="cursor-pointer text-sage transition hover:text-forest-700"
                    onClick={() => setSelected(invoice)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/50 px-5 py-2.5 text-[9.5px] text-sage">
            <span>{invoices.length} invoice(s) in view</span>
            <span className="font-mono">billed {money(totals.billed)} · balance {money(totals.balance)}</span>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-paper text-sage">
              <Banknote size={13} />
            </span>
            <div>
              <p className="text-[12px] font-semibold text-ink">Recent payments</p>
              <p className="text-[9.5px] text-muted">Latest ledger entries</p>
            </div>
          </div>
          <span className="font-mono text-[9px] text-sage">{summary?.recent_payments?.length || 0} shown</span>
        </div>
        {summary?.recent_payments?.length ? (
          <div className="divide-y divide-line/70">
            {summary.recent_payments.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-5 py-2.5"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    entry.amount < 0 ? "bg-rose-50 text-rose-600" : "bg-forest-50 text-forest-700"
                  )}
                >
                  {entry.amount < 0 ? <Undo2 size={12} /> : <ArrowDownRight size={12} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-ink">
                    {entry.amount < 0 ? "Refund" : "Payment"} · {titleCase(entry.method)}
                  </p>
                  <p className="text-[8.5px] text-sage">
                    {entry.reference || "no reference"} · {relativeTime(entry.paid_at)}
                  </p>
                </div>
                <p className={cn("font-mono text-[10.5px] font-semibold", entry.amount < 0 ? "text-rose-600" : "text-forest-700")}>
                  {entry.amount < 0 ? "−" : "+"}{money(Math.abs(entry.amount))}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-[10px] text-muted">No payments recorded yet.</p>
        )}
      </Card>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.invoice_number || "Invoice"}
        subtitle={selected ? `${selected.customer_name} · ${titleCase(selected.status)}` : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-paper/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Amount due</p>
                  <p className="mt-1 font-mono text-[26px] font-semibold tracking-tight text-ink">
                    {money(selected.balance, selected.currency)}
                  </p>
                  <p className="text-[9.5px] text-muted">
                    of {money(selected.total, selected.currency)} total
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <ProgressBar
                value={selected.total ? (selected.amount_paid / selected.total) * 100 : 0}
                tone={selected.balance > 0 ? "amber" : "forest"}
                className="mt-3"
              />
            </div>

            <div className="rounded-2xl border border-line bg-cream px-4 py-2">
              <KeyValue label="Issued" value={formatDate(selected.issued_at, true)} />
              <KeyValue label="Due" value={formatDate(selected.due_date)} />
              <KeyValue label="Order" value={selected.order_number || "—"} />
              <KeyValue label="Paid" value={money(selected.amount_paid, selected.currency)} />
              <KeyValue label="Balance" value={money(selected.balance, selected.currency)} />
            </div>

            {detail?.items?.length ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold text-ink">Line items</p>
                <div className="divide-y divide-line/60 rounded-xl border border-line bg-cream">
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-medium text-ink">{item.description}</p>
                        <p className="font-mono text-[8.5px] text-sage">
                          {item.quantity} × {money(item.unit_price, selected.currency)}
                        </p>
                      </div>
                      <p className="font-mono text-[10px] font-semibold text-ink">
                        {money(item.line_total, selected.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {detail?.payments?.length ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold text-ink">Payment history</p>
                <div className="divide-y divide-line/60 rounded-xl border border-line bg-cream">
                  {detail.payments.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", entry.amount < 0 ? "bg-rose-50 text-rose-600" : "bg-forest-50 text-forest-700")}>
                        {entry.amount < 0 ? <Undo2 size={10} /> : <Banknote size={10} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9.5px] font-medium text-ink">{titleCase(entry.method)}</p>
                        <p className="text-[8.5px] text-sage">{formatDate(entry.paid_at, true)}</p>
                      </div>
                      <p className={cn("font-mono text-[10px] font-semibold", entry.amount < 0 ? "text-rose-600" : "text-forest-700")}>
                        {entry.amount < 0 ? "−" : "+"}{money(Math.abs(entry.amount), selected.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {selected.balance > 0 && selected.status !== "void" && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  const invoice = selected;
                  setSelected(null);
                  openPayment(invoice);
                }}
              >
                <CreditCard size={13} /> Record a payment
              </Button>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Record payment"
        description={
          payTarget
            ? `${payTarget.invoice_number} — outstanding ${money(payTarget.balance, payTarget.currency)}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={submitPayment} loading={recordPayment.isPending}>
              <Banknote size={13} /> Apply payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {paymentError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10.5px] leading-5 text-rose-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {paymentError}
            </div>
          )}
          <div>
            <Label htmlFor="payment-amount" hint={payTarget ? `max ${money(payTarget.balance)}` : undefined}>Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              min={0.01}
              step="0.01"
              value={payment.amount}
              onChange={(event) => setPayment({ ...payment, amount: event.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="payment-method">Method</Label>
              <Select id="payment-method" value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })}>
                {methods.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-reference" hint="Optional">Reference</Label>
              <Input id="payment-reference" value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} placeholder="TXN-1042" />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-paper/60 px-3.5 py-2.5">
            <p className="text-[9.5px] leading-5 text-muted">
              This writes a real payment record, updates the invoice balance and status, emits a
              notification and appends an audit entry. It cannot exceed the remaining balance.
            </p>
          </div>
        </div>
      </Modal>

      <p className="flex items-center justify-center gap-1.5 text-[9.5px] text-sage">
        <ShieldCheck size={10} /> Refunds are sensitive and require an approval before execution.
      </p>
    </div>
  );
}
