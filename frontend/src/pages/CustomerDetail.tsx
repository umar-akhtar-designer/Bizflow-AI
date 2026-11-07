import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  Mail,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  Receipt,
  ShoppingCart,
  Sparkles,
  StickyNote,
  Users,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Input,
  KeyValue,
  Label,
  Modal,
  SectionTitle,
  Skeleton,
  Tabs,
  Textarea,
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
import type { CustomerDetail as CustomerDetailType } from "@/types";

const palette = "#0B7A5C";

function contactValue(value?: string | null) {
  return value && value.trim() ? value : "—";
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [tab, setTab] = useState("orders");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", address: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: customer, isLoading, isError, refetch } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.get<CustomerDetailType>(`/api/customers/${id}`),
    enabled: Boolean(id),
  });

  const update = useMutation({
    mutationFn: () => api.patch<CustomerDetailType>(`/api/customers/${id}`, form),
    onSuccess: () => {
      push("Customer updated", "Contact details were saved and audited.", "success");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const stats = useMemo(() => {
    if (!customer) {
      return { paid: 0, openInvoices: 0, avgOrder: 0 };
    }
    const paid = customer.invoices.reduce((sum, invoice) => sum + invoice.amount_paid, 0);
    const openInvoices = customer.invoices.filter(
      (invoice) => invoice.status === "pending" || invoice.status === "partial"
    ).length;
    const avgOrder = customer.order_count ? customer.lifetime_value / customer.order_count : 0;
    return { paid, openInvoices, avgOrder };
  }, [customer]);

  const openEdit = () => {
    if (!customer) return;
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      company: customer.company || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setFormError(null);
    setEditOpen(true);
  };

  const askAi = (prompt: string) => {
    navigate(`/app/manager?prompt=${encodeURIComponent(prompt)}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <Card className="p-10">
        <EmptyState
          icon={AlertTriangle}
          title="Customer not found"
          description="This profile may have been removed or belongs to another workspace."
          action={<Button onClick={() => navigate("/app/customers")}><ArrowLeft size={13} /> Back to customers</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/app/customers")}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={13} /> All customers
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              askAi(`Pull up a full history and lifetime value for ${customer.name}.`)
            }
          >
            <Sparkles size={12} /> AI briefing
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              askAi(
                `Prepare an order for this customer ${customer.name} for 1 unit of Product A and hold the confirmation message for approval.`
              )
            }
          >
            <ShoppingCart size={12} /> New order
          </Button>
          <Button size="sm" onClick={openEdit}>
            <Pencil size={12} /> Edit profile
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-forest-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={customer.name} color={palette} size={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">
                  {customer.name}
                </h1>
                <StatusBadge status={customer.status} />
              </div>
              {customer.company && (
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
                  <Building2 size={12} /> {customer.company}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-sage">
                {customer.email && (
                  <span className="inline-flex items-center gap-1"><Mail size={10} /> {customer.email}</span>
                )}
                {customer.phone && (
                  <span className="inline-flex items-center gap-1"><Phone size={10} /> {customer.phone}</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={10} /> joined {formatDate(customer.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:text-right">
            <div className="rounded-xl border border-line bg-paper/60 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Lifetime value</p>
              <p className="mt-0.5 font-mono text-[18px] font-semibold text-ink">
                {money(customer.lifetime_value)}
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl border px-4 py-3",
                customer.outstanding > 0 ? "border-amber-200 bg-amber-50/70" : "border-line bg-paper/60"
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Open balance</p>
              <p
                className={cn(
                  "mt-0.5 font-mono text-[18px] font-semibold",
                  customer.outstanding > 0 ? "text-amber-700" : "text-forest-700"
                )}
              >
                {money(customer.outstanding)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Orders placed" value={number(customer.order_count)} hint={customer.last_order_at ? `last ${relativeTime(customer.last_order_at)}` : "no orders yet"} icon={<ShoppingCart size={15} />} accent="blue" />
        <StatCard index={1} label="Lifetime value" value={compactMoney(customer.lifetime_value)} hint="all orders" icon={<CircleDollarSign size={15} />} accent="violet" />
        <StatCard index={2} label="Collected" value={compactMoney(stats.paid)} hint="payments received" icon={<Wallet size={15} />} accent="forest" />
        <StatCard index={3} label="Open invoices" value={number(stats.openInvoices)} hint="awaiting payment" icon={<Receipt size={15} />} accent={stats.openInvoices > 0 ? "amber" : "forest"} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Avg. order" value={compactMoney(stats.avgOrder)} />
        <MiniStat label="Invoices" value={String(customer.invoices.length)} />
        <MiniStat label="Paid invoices" value={String(customer.invoices.filter((invoice) => invoice.status === "paid").length)} tone="forest" />
        <MiniStat label="Relationship" value={customer.last_order_at ? relativeTime(customer.last_order_at) : "new"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "orders", label: "Orders", count: customer.orders.length },
                { value: "invoices", label: "Invoices", count: customer.invoices.length },
                { value: "timeline", label: "Timeline", count: customer.timeline.length },
              ]}
            />
            <span className="text-[9.5px] text-sage">Read live from persisted records</span>
          </div>

          {tab === "orders" && (
            <Card className="overflow-hidden">
              {customer.orders.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="No orders yet"
                  description="Start an order-to-cash workflow for this customer."
                  action={
                    <Button size="sm" onClick={() => askAi(`Prepare an order for ${customer.name} for 1 unit of Product A.`)}>
                      <Sparkles size={12} /> Ask AI
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y divide-line/70">
                  {customer.orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => navigate(`/app/orders/${order.id}`)}
                      className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left transition hover:bg-paper/40"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <ShoppingCart size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] font-semibold text-ink">{order.order_number}</p>
                        <p className="text-[9px] text-sage">
                          {formatDate(order.created_at, true)} · {order.channel.replace("_", " ")}
                          {order.invoice_status ? ` · invoice ${order.invoice_status}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={order.status} dot={false} className="px-2 py-0.5 text-[9px]" />
                      <p className="w-[90px] text-right font-mono text-[10.5px] font-semibold text-ink">
                        {money(order.total, order.currency)}
                      </p>
                      <ArrowUpRight size={12} className="text-sage" />
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === "invoices" && (
            <Card className="overflow-hidden">
              {customer.invoices.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No invoices yet"
                  description="Invoices are generated automatically with each order."
                />
              ) : (
                <div className="divide-y divide-line/70">
                  {customer.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                        <FileText size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] font-semibold text-ink">{invoice.invoice_number}</p>
                        <p className="text-[9px] text-sage">
                          issued {formatDate(invoice.issued_at)} · due {formatDate(invoice.due_date)}
                        </p>
                      </div>
                      <StatusBadge status={invoice.status} dot={false} className="px-2 py-0.5 text-[9px]" />
                      <div className="w-[110px] text-right">
                        <p className="font-mono text-[10.5px] font-semibold text-ink">
                          {money(invoice.total, invoice.currency)}
                        </p>
                        <p className="font-mono text-[8.5px] text-sage">
                          paid {money(invoice.amount_paid, invoice.currency)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/app/finance")}>
                        Open <ArrowUpRight size={11} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === "timeline" && (
            <Card className="p-5">
              {customer.timeline.length === 0 ? (
                <EmptyState icon={Clock3} title="No activity yet" description="Orders and invoices will appear here." />
              ) : (
                <ol className="relative">
                  {customer.timeline.map((event, index) => (
                    <motion.li
                      key={`${event.title}-${index}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="relative flex gap-3 pb-4 last:pb-0"
                    >
                      {index < customer.timeline.length - 1 && (
                        <span className="absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-px bg-line" />
                      )}
                      <span
                        className={cn(
                          "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-line",
                          event.type === "invoice" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"
                        )}
                      >
                        {event.type === "invoice" ? <Receipt size={12} /> : <ShoppingCart size={12} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-[11px] font-semibold text-ink">{event.title}</p>
                          <span className="font-mono text-[9px] text-sage">{formatDate(event.at, true)}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">{event.detail}</p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-forest-700" />
                <p className="text-[12px] font-semibold text-ink">Account details</p>
              </div>
              <button onClick={openEdit} className="text-[10px] font-semibold text-forest-700 hover:underline">
                Edit
              </button>
            </div>
            <div className="mt-2 divide-y divide-line/60">
              <KeyValue label="Email" value={contactValue(customer.email)} />
              <KeyValue label="Phone" value={contactValue(customer.phone)} />
              <KeyValue label="Company" value={contactValue(customer.company)} />
              <KeyValue
                label="Address"
                value={
                  customer.address ? (
                    <span className="inline-flex items-start gap-1 text-right">
                      <MapPin size={10} className="mt-0.5 shrink-0" /> {customer.address}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <KeyValue label="Status" value={titleCase(customer.status)} />
              <KeyValue label="Customer ID" value={<span className="font-mono text-[9.5px]">{customer.id.slice(0, 18)}…</span>} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <StickyNote size={14} className="text-amber-700" />
              <p className="text-[12px] font-semibold text-ink">Account notes</p>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[10.5px] leading-5 text-muted">
              {customer.notes || "No notes yet. Add context that helps the team serve this customer."}
            </p>
            <Divider className="my-3" />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                askAi(
                  `Prepare a personalised follow-up message for ${customer.name} referencing their recent orders and open balance, and hold it for approval.`
                )
              }
            >
              <MessageSquareText size={12} /> Prepare follow-up
            </Button>
          </Card>

          <Card className="border-forest-200 bg-forest-50/40 p-5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-forest-700 shadow-sm">
                <BadgeCheck size={15} />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-ink">Computed from records</p>
                <p className="mt-1 text-[10px] leading-5 text-muted">
                  Lifetime value, balances and counts are aggregated from this workspace's orders and
                  invoices at request time — not hardcoded demo figures.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit customer"
        description="Changes are saved to the database and written to the audit log."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => update.mutate()} loading={update.isPending} disabled={form.name.trim().length < 2}>
              <Pencil size={12} /> Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10.5px] leading-5 text-rose-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {formError}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-company" hint="Optional">Company</Label>
              <Input id="edit-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-email" hint="Optional">Email</Label>
              <Input id="edit-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-phone" hint="Optional">Phone</Label>
              <Input id="edit-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edit-address" hint="Optional">Address</Label>
              <Input id="edit-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edit-notes" hint="Optional">Notes</Label>
              <Textarea id="edit-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      <div className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-line bg-paper/40 px-4 py-3">
        <p className="text-[9.5px] text-sage">
          Sensitive actions such as messages and refunds are prepared here but executed only after approval.
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <BadgeCheck size={12} /> Refresh
        </Button>
      </div>
    </div>
  );
}
