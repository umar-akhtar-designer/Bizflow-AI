import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  SectionTitle,
  Select,
  Skeleton,
  Tabs,
} from "@/components/ui";
import { StatusBadge } from "@/components/Badges";
import { StatCard, MiniStat } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { cn, compactMoney, formatDate, money, number, percent, relativeTime } from "@/lib/utils";
import type { Customer, Order, Product, SalesAnalytics } from "@/types";

interface Line {
  product_id: string;
  quantity: string;
}

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: "1" }]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["orders", status, search],
    queryFn: () =>
      api.get<{ items: Order[]; total: number }>("/api/orders", {
        status: status === "all" ? undefined : status,
        search: search || undefined,
        limit: 150,
      }),
    refetchInterval: 30_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["sales", "analytics"],
    queryFn: () => api.get<SalesAnalytics>("/api/sales/analytics", { days: 30 }),
  });

  const { data: customers } = useQuery({
    queryKey: ["customers", "options"],
    queryFn: () => api.get<{ items: Customer[] }>("/api/customers"),
  });

  const { data: products } = useQuery({
    queryKey: ["products", "options"],
    queryFn: () => api.get<{ items: Product[] }>("/api/products", { status: "active" }),
  });

  const orderItems = data?.items || [];

  const createOrder = useMutation({
    mutationFn: () =>
      api.post<Order>("/api/orders", {
        customer_id: customerId,
        notes: notes || null,
        items: lines
          .filter((line) => line.product_id && Number(line.quantity) > 0)
          .map((line) => ({ product_id: line.product_id, quantity: Number(line.quantity) })),
      }),
    onSuccess: (order) => {
      push("Order created", `${order.order_number} · ${money(order.total, order.currency)}`, "success");
      setCreateOpen(false);
      setCustomerId("");
      setLines([{ product_id: "", quantity: "1" }]);
      setNotes("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      navigate(`/app/orders/${order.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = () => {
    if (!customerId) {
      setError("Choose a customer for this order.");
      return;
    }
    const valid = lines.filter((line) => line.product_id && Number(line.quantity) > 0);
    if (!valid.length) {
      setError("Add at least one product line.");
      return;
    }
    createOrder.mutate();
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Order desk"
        title="Orders & sales"
        description="Every order writes the order, line items, stock movement, sale and invoice in one atomic transaction."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching && !isLoading}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={13} /> New order
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="30-day revenue" value={compactMoney(analytics?.revenue || 0)} hint={`${analytics?.orders || 0} sales`} icon={<CircleDollarSign size={15} />} accent="forest" />
        <StatCard index={1} label="Orders" value={number(data?.total || 0)} hint="all time" icon={<ShoppingCart size={15} />} accent="blue" />
        <StatCard index={2} label="Avg order value" value={compactMoney(analytics?.average_order_value || 0)} hint="last 30 days" icon={<TrendingUp size={15} />} accent="violet" />
        <StatCard index={3} label="Top product" value={<span className="text-[15px]">{analytics?.top_products?.[0]?.name?.split("—")[0] || "—"}</span>} hint={analytics?.top_products?.[0] ? `${analytics.top_products[0].units} units` : "no sales yet"} icon={<Boxes size={15} />} accent="amber" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Fulfilled" value={String(orderItems.filter((o) => o.status === "fulfilled").length)} tone="forest" />
        <MiniStat label="Processing" value={String(orderItems.filter((o) => o.status === "processing").length)} />
        <MiniStat label="Confirmed" value={String(orderItems.filter((o) => o.status === "confirmed").length)} />
        <MiniStat label="Cancelled" value={String(orderItems.filter((o) => o.status === "cancelled").length)} tone="rose" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[
            { value: "all", label: "All", count: data?.total },
            { value: "confirmed", label: "Confirmed" },
            { value: "processing", label: "Processing" },
            { value: "fulfilled", label: "Fulfilled" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
        <div className="relative lg:w-72">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order or customer…" className="pl-8" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : isError ? (
        <Card className="p-10">
          <EmptyState icon={AlertTriangle} title="Could not load orders" description="Check the API connection and retry." action={<Button onClick={() => refetch()}><RefreshCw size={13} /> Retry</Button>} />
        </Card>
      ) : orderItems.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="Create an order manually or ask the AI Business Manager to process one."
            action={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={13} /> New order</Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/app/manager")}><Sparkles size={13} /> Ask AI</Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden items-center gap-4 border-b border-line bg-paper/50 px-5 py-2.5 text-[9px] font-bold uppercase tracking-wider text-sage md:flex">
            <span className="flex-1">Order</span>
            <span className="w-[150px]">Customer</span>
            <span className="w-[90px]">Status</span>
            <span className="w-[90px]">Channel</span>
            <span className="w-[100px] text-right">Total</span>
            <span className="w-[110px] text-right">Created</span>
          </div>
          <div className="divide-y divide-line/70">
            {orderItems.map((order) => (
              <Link
                key={order.id}
                to={`/app/orders/${order.id}`}
                className="group flex flex-col gap-2 px-4 py-3.5 transition hover:bg-paper/40 sm:px-5 md:flex-row md:items-center md:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <ClipboardList size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold text-ink group-hover:text-forest-800">{order.order_number}</p>
                    <p className="mt-0.5 truncate text-[9.5px] text-muted md:hidden">{order.customer_name}</p>
                    <p className="mt-0.5 hidden text-[9px] text-sage md:block">
                      {order.invoice_status ? `invoice ${order.invoice_status}` : "no invoice"}
                    </p>
                  </div>
                </div>
                <div className="hidden w-[150px] shrink-0 md:block">
                  <p className="truncate text-[10.5px] font-medium text-ink">{order.customer_name}</p>
                  <p className="truncate text-[9px] text-sage">{order.customer_company || "—"}</p>
                </div>
                <div className="w-[90px] shrink-0">
                  <StatusBadge status={order.status} dot={false} className="px-2 py-0.5 text-[9px]" />
                </div>
                <div className="hidden w-[90px] shrink-0 md:block">
                  <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[8.5px] font-semibold text-muted">
                    {order.channel.replace("_", " ")}
                  </span>
                </div>
                <div className="w-[100px] shrink-0 text-right">
                  <p className="font-mono text-[10.5px] font-semibold text-ink">{money(order.total, order.currency)}</p>
                </div>
                <div className="hidden w-[110px] shrink-0 text-right md:block">
                  <p className="text-[9px] text-sage">{relativeTime(order.created_at)}</p>
                  <ArrowUpRight size={11} className="ml-auto mt-0.5 text-sage/60" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create an order"
        description="This uses the same atomic order service as the agents: stock, order, sale and invoice commit together."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} loading={createOrder.isPending}>
              <ShoppingCart size={13} /> Create order
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10.5px] leading-5 text-rose-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
          <div>
            <Label htmlFor="order-customer">Customer</Label>
            <Select id="order-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Choose a customer…</option>
              {customers?.items.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.company ? `· ${customer.company}` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button variant="ghost" size="sm" onClick={() => setLines([...lines, { product_id: "", quantity: "1" }])}>
                <Plus size={12} /> Add line
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => {
                const product = products?.items.find((item) => item.id === line.product_id);
                return (
                  <div key={index} className="flex items-end gap-2 rounded-xl border border-line bg-paper/40 p-2.5">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={line.product_id}
                        onChange={(event) => {
                          const next = [...lines];
                          next[index] = { ...line, product_id: event.target.value };
                          setLines(next);
                        }}
                        className="text-[11px]"
                      >
                        <option value="">Choose a product…</option>
                        {products?.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} — {money(item.price)} ({item.stock_quantity} in stock)
                          </option>
                        ))}
                      </Select>
                      {product && (
                        <p className="mt-1 pl-1 text-[8.5px] text-sage">
                          {product.stock_quantity} available · margin {percent(product.margin_pct)}
                          {Number(line.quantity) > product.stock_quantity && (
                            <span className="ml-1 font-semibold text-rose-600">insufficient stock</span>
                          )}
                        </p>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) => {
                        const next = [...lines];
                        next[index] = { ...line, quantity: event.target.value };
                        setLines(next);
                      }}
                      className="w-20 text-center"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLines(lines.length > 1 ? lines.filter((_, i) => i !== index) : lines)}
                      disabled={lines.length === 1}
                      aria-label="Remove line"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="order-notes" hint="Optional">Notes</Label>
            <Input id="order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reference or internal note…" />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
            <p className="text-[9.5px] leading-5 text-amber-900">
              Tax is calculated server-side from the business tax rate. If any line has insufficient
              stock, the entire transaction rolls back and no records are created.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
