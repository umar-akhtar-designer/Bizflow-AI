import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Mail,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  SectionTitle,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { StatCard, MiniStat } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { cn, compactMoney, formatDate, money, number, relativeTime } from "@/lib/utils";
import type { Customer } from "@/types";

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
}

const empty: CustomerForm = { name: "", email: "", phone: "", company: "", address: "", notes: "" };

const palette = ["#0B7A5C", "#B45309", "#1D4ED8", "#7C3AED", "#BE123C", "#0F766E"];

export default function Customers() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(empty);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["customers", search],
    queryFn: () =>
      api.get<{ items: Customer[]; total: number }>("/api/customers", {
        search: search || undefined,
      }),
    refetchInterval: 30_000,
  });

  const items = data?.items || [];

  const stats = useMemo(() => {
    const lifetime = items.reduce((sum, item) => sum + item.lifetime_value, 0);
    const outstanding = items.reduce((sum, item) => sum + item.outstanding, 0);
    const withOrders = items.filter((item) => item.order_count > 0).length;
    return {
      lifetime,
      outstanding,
      withOrders,
      avg: withOrders ? lifetime / withOrders : 0,
    };
  }, [items]);

  const createCustomer = useMutation({
    mutationFn: () => api.post<Customer>("/api/customers", { ...form }),
    onSuccess: (customer) => {
      push("Customer created", customer.name, "success");
      setCreateOpen(false);
      setForm(empty);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = () => {
    if (form.name.trim().length < 2) {
      setError("A customer name is required.");
      return;
    }
    createCustomer.mutate();
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Relationships"
        title="Customers"
        description="Lifetime value, outstanding balances and order history — computed from real records, never cached stats."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching && !isLoading}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus size={13} /> Add customer
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Customers" value={number(data?.total || 0)} hint="in the directory" icon={<Users size={15} />} accent="forest" />
        <StatCard index={1} label="Lifetime value" value={compactMoney(stats.lifetime)} hint="all orders" icon={<CircleDollarSign size={15} />} accent="violet" />
        <StatCard index={2} label="Outstanding" value={compactMoney(stats.outstanding)} hint="unpaid invoices" icon={<Wallet size={15} />} accent="amber" />
        <StatCard index={3} label="Avg. per buyer" value={compactMoney(stats.avg)} hint={`${stats.withOrders} active buyers`} icon={<Building2 size={15} />} accent="blue" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or company…" className="pl-8" />
        </div>
        <p className="text-[9.5px] text-sage">
          Showing {items.length} customer{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : isError ? (
        <Card className="p-10">
          <EmptyState icon={AlertTriangle} title="Could not load customers" description="Check the API connection and retry." action={<Button onClick={() => refetch()}><RefreshCw size={13} /> Retry</Button>} />
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Users}
            title="No customers found"
            description="Add a customer or create one through an AI workflow."
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={13} /> Add customer</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((customer, index) => (
            <Link
              key={customer.id}
              to={`/app/customers/${customer.id}`}
              className="group rounded-2xl border border-line/90 bg-cream p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-lift"
            >
              <div className="flex items-start gap-3">
                <Avatar name={customer.name} color={palette[index % palette.length]} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-ink group-hover:text-forest-800">
                    {customer.name}
                  </p>
                  {customer.company && (
                    <p className="truncate text-[9.5px] text-muted">{customer.company}</p>
                  )}
                  {customer.email && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-sage">
                      <Mail size={9} /> {customer.email}
                    </p>
                  )}
                </div>
                <ArrowUpRight size={13} className="shrink-0 text-sage transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest-700" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-paper/60 px-2 py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-sage">Orders</p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold text-ink">{customer.order_count}</p>
                </div>
                <div className="rounded-lg bg-paper/60 px-2 py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-sage">Lifetime</p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold text-ink">{compactMoney(customer.lifetime_value)}</p>
                </div>
                <div className={cn("rounded-lg px-2 py-1.5", customer.outstanding > 0 ? "bg-amber-50" : "bg-paper/60")}>
                  <p className="text-[8px] font-bold uppercase tracking-wider text-sage">Open</p>
                  <p className={cn("mt-0.5 font-mono text-[11px] font-semibold", customer.outstanding > 0 ? "text-amber-700" : "text-ink")}>
                    {compactMoney(customer.outstanding)}
                  </p>
                </div>
              </div>

              <p className="mt-2.5 text-[8.5px] text-sage">
                {customer.last_order_at ? `Last order ${relativeTime(customer.last_order_at)}` : "No orders yet"}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Active buyers" value={String(stats.withOrders)} tone="forest" />
        <MiniStat label="No orders yet" value={String(items.length - stats.withOrders)} />
        <MiniStat label="Avg. lifetime" value={compactMoney(stats.avg)} />
        <MiniStat label="Open balance" value={money(stats.outstanding)} tone={stats.outstanding > 0 ? "amber" : "forest"} />
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add a customer"
        description="Creates a real customer record in this workspace."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} loading={createCustomer.isPending}>
              <UserPlus size={13} /> Create customer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10.5px] leading-5 text-rose-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="customer-name">Name</Label>
              <Input id="customer-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ahmed Raza" />
            </div>
            <div>
              <Label htmlFor="customer-company" hint="Optional">Company</Label>
              <Input id="customer-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Atlas Logistics" />
            </div>
            <div>
              <Label htmlFor="customer-email" hint="Optional">Email</Label>
              <Input id="customer-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ahmed@company.com" />
            </div>
            <div>
              <Label htmlFor="customer-phone" hint="Optional">Phone</Label>
              <Input id="customer-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 415 555 0134" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="customer-address" hint="Optional">Address</Label>
              <Input id="customer-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="San Francisco, CA" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="customer-notes" hint="Optional">Notes</Label>
              <Textarea id="customer-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Account context, preferences, payment terms…" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
