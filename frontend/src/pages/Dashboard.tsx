import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  Waypoints,
  Zap,
} from "lucide-react";
import { SectionTitle } from "@/components/ui";
import { StatCard, MiniStat } from "@/components/StatCard";
import { AIStatusPill, LiveDot, StatusBadge, AgentChip } from "@/components/Badges";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  compactMoney,
  duration,
  money,
  number,
  percent,
  relativeTime,
  shortDate,
  titleCase,
} from "@/lib/utils";
import type { DashboardData } from "@/types";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-cream px-3 py-2 shadow-lift">
      <p className="text-[10px] font-semibold text-ink">{label}</p>
      <p className="mt-1 font-mono text-[11px] font-semibold text-forest-700">
        {money(payload[0]?.value)}
      </p>
      {payload[0]?.payload?.orders !== undefined && (
        <p className="text-[9px] text-muted">{payload[0].payload.orders} orders</p>
      )}
    </div>
  );
}

function ActivityIcon({ action }: { action: string }) {
  const map: Record<string, typeof Zap> = {
    workflow: Waypoints,
    order: ShoppingCart,
    product: Package,
    inventory: Boxes,
    payment: CircleDollarSign,
    approval: ShieldCheck,
    auth: Users,
    customer: Users,
    settings: Zap,
  };
  const key = Object.keys(map).find((item) => action.includes(item)) || "workflow";
  const Icon = map[key];
  return <Icon size={12} />;
}

export default function Dashboard() {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
    refetchInterval: 30_000,
  });

  const currency = business?.currency || "USD";
  const first = user?.full_name?.split(" ")[0] || "there";

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-80" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="p-10">
        <EmptyState
          icon={AlertTriangle}
          title="Could not load the dashboard"
          description="Check that the BizFlow API is running, then retry."
          action={<Button onClick={() => refetch()}><RefreshCw size={14} /> Retry</Button>}
        />
      </Card>
    );
  }

  const { metrics, workflow_stats: wf, revenue_series } = data;
  const donut = [
    { name: "Completed", value: wf.completed, color: "#0B7A5C" },
    { name: "Failed", value: wf.failed, color: "#E11D48" },
    { name: "Other", value: Math.max(wf.total - wf.completed - wf.failed, 0), color: "#D6D4CA" },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
        title={`${greeting()}, ${first}.`}
        description="Your operations at a glance — every number is read from the live database."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/app/reports")}>
              <FileText size={13} /> Reports
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate("/app/manager")}>
              <Sparkles size={13} /> Run a workflow
            </Button>
          </div>
        }
      />

      {data.ai.mode !== "vultr" && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="mt-0.5 text-amber-700" />
            <p className="text-[11px] leading-5 text-amber-900">
              <strong className="font-semibold">Demo mode.</strong> No Vultr inference key is configured,
              so planning runs on the built-in deterministic parser. Execution, database writes and
              verification are fully real.
            </p>
          </div>
          <Link to="/app/settings" className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-800 hover:text-amber-950">
            Configure AI <ArrowRight size={11} className="ml-0.5 inline" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Total revenue"
          value={money(metrics.revenue, currency)}
          change={metrics.revenue_change_pct}
          hint="vs. yesterday"
          icon={<CircleDollarSign size={15} />}
          accent="forest"
        />
        <StatCard
          index={1}
          label="Orders"
          value={number(metrics.orders)}
          hint={`${metrics.today_orders} today`}
          icon={<ShoppingCart size={15} />}
          accent="blue"
        />
        <StatCard
          index={2}
          label="Customers"
          value={number(metrics.customers)}
          hint="active directory"
          icon={<Users size={15} />}
          accent="violet"
        />
        <StatCard
          index={3}
          label="Inventory value"
          value={compactMoney(metrics.inventory_value, currency)}
          hint={`${metrics.low_stock_count} low-stock SKUs`}
          icon={<Package size={15} />}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Pending invoices" value={`${metrics.pending_invoices_count} · ${money(metrics.pending_invoices_amount, currency)}`} tone="amber" />
        <MiniStat label="Low stock" value={`${metrics.low_stock_count} product(s)`} tone={metrics.low_stock_count ? "amber" : "forest"} />
        <MiniStat label="Approvals waiting" value={`${metrics.pending_approvals} request(s)`} tone={metrics.pending_approvals ? "rose" : "forest"} />
        <MiniStat label="Workflow success" value={percent(wf.success_rate)} tone="forest" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">Revenue · last 14 days</h2>
                <LiveDot label="Live" />
              </div>
              <p className="mt-1 text-[11px] text-muted">Recorded sales, grouped by day</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-paper px-2.5 py-1.5">
              <TrendingUp size={12} className="text-forest-600" />
              <span className="text-[10px] font-semibold text-muted">
                Today {money(metrics.today_revenue, currency)}
              </span>
            </div>
          </div>

          <div className="mt-5 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_series} margin={{ top: 6, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B7A5C" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0B7A5C" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E5E3DA" strokeDasharray="3 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => shortDate(value)}
                  tick={{ fontSize: 9, fill: "#8A948D" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(value) => compactMoney(value, currency)}
                  tick={{ fontSize: 9, fill: "#8A948D" }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#0B7A5C", strokeDasharray: "3 3" }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0B7A5C"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                  activeDot={{ r: 4, fill: "#0B7A5C", stroke: "#FBFAF7", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">Workflow health</h2>
                <p className="mt-1 text-[11px] text-muted">All-time agent runs</p>
              </div>
              <StatusBadge status={wf.failed ? "partial" : "healthy"} />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-[130px] w-[130px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      innerRadius={44}
                      outerRadius={60}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {donut.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[20px] font-semibold tracking-tight text-ink">{percent(wf.success_rate)}</span>
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-sage">success</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {donut.slice(0, 2).map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-ink">{item.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-line pt-2">
                  <span className="text-[10px] text-muted">Total runs</span>
                  <span className="font-mono text-[10px] font-semibold text-ink">{wf.total}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-forest-50/70 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-forest-800">
                <CheckCircle2 size={12} /> {wf.completed} completed
              </span>
              <Link to="/app/workflows" className="text-[10px] font-bold text-forest-800 hover:text-forest-950">
                History <ArrowUpRight size={10} className="inline" />
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-ink">AI engine</h3>
              <AIStatusPill status={data.ai} compact />
            </div>
            <p className="mt-2 text-[10.5px] leading-5 text-muted">
              {data.ai.mode === "vultr"
                ? `${data.ai.provider} · ${data.ai.model}`
                : "Deterministic planner. Full workflow execution without an LLM key."}
            </p>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">Low stock</h2>
              <p className="mt-0.5 text-[10.5px] text-muted">At or below reorder level</p>
            </div>
            <Link to="/app/inventory" className="text-[10px] font-semibold text-forest-700 hover:text-forest-900">
              Inventory <ArrowRight size={10} className="inline" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.low_stock.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-5 text-center">
                <CheckCircle2 size={18} className="mx-auto text-forest-500" />
                <p className="mt-2 text-[11px] font-medium text-ink">All stock is healthy</p>
              </div>
            ) : (
              data.low_stock.slice(0, 4).map((product) => (
                <div key={product.id} className="group">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-medium text-ink">{product.name}</p>
                    <span className="shrink-0 font-mono text-[10px] font-semibold text-amber-700">
                      {product.stock_quantity}/{product.reorder_level}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min((product.stock_quantity / Math.max(product.reorder_level, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <Button
            variant="soft"
            size="sm"
            className="mt-4 w-full"
            onClick={() => navigate("/app/manager?prompt=" + encodeURIComponent("Check low stock and prepare a restock request."))}
          >
            <Sparkles size={12} /> Restock with AI
          </Button>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">Recent workflows</h2>
              <p className="mt-0.5 text-[10.5px] text-muted">Agent runs with verification state</p>
            </div>
            <Link to="/app/workflows" className="text-[10px] font-semibold text-forest-700 hover:text-forest-900">
              View all <ArrowRight size={10} className="inline" />
            </Link>
          </div>
          <div className="mt-3 divide-y divide-line/70">
            {data.recent_workflows.length === 0 ? (
              <EmptyState
                icon={Waypoints}
                title="No workflows yet"
                description="Run your first instruction from the AI Business Manager."
                action={<Button size="sm" onClick={() => navigate("/app/manager")}><Sparkles size={12} /> Open manager</Button>}
              />
            ) : (
              data.recent_workflows.map((workflow) => (
                <Link
                  key={workflow.id}
                  to={`/app/workflows/${workflow.id}`}
                  className="group flex items-start gap-3 py-3 transition first:pt-1 hover:opacity-80"
                >
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${workflow.status === "completed" ? "bg-forest-50 text-forest-700" : workflow.status === "failed" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                    {workflow.status === "failed" ? <AlertTriangle size={13} /> : <Waypoints size={13} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-ink">{workflow.instruction}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={workflow.status} />
                      <span className="text-[9.5px] text-sage">{titleCase(workflow.intent)}</span>
                      <span className="text-[9.5px] text-sage">·</span>
                      <span className="text-[9.5px] text-sage">{relativeTime(workflow.created_at)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[10px] font-medium text-muted">{duration(workflow.duration_ms)}</p>
                    <p className={`mt-1 text-[9px] font-semibold ${workflow.verification_status === "verified" ? "text-forest-700" : "text-sage"}`}>
                      {workflow.verification_status === "verified" ? "verified" : workflow.verification_status.replace("_", " ")}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold tracking-tight text-ink">Activity ledger</h2>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-sage">Audit log</span>
          </div>
          <div className="mt-3 space-y-1">
            {data.recent_activity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2.5 rounded-xl px-1 py-2 transition hover:bg-paper/80">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-paper text-sage">
                  <ActivityIcon action={entry.action} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-ink">
                    {titleCase(entry.action.replace(/\./g, " "))}
                  </p>
                  <p className="text-[9.5px] text-sage">
                    {entry.entity_type} · {relativeTime(entry.created_at)}
                  </p>
                </div>
                <ArrowUpRight size={11} className="mt-1 text-sage/50" />
              </div>
            ))}
            {!data.recent_activity.length && (
              <p className="py-6 text-center text-[11px] text-muted">No activity recorded yet.</p>
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-ink p-6 text-cream">
          <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-30" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-forest-600/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-forest-300">
              <Sparkles size={12} /> The strongest demo
            </div>
            <h2 className="mt-3 text-[20px] font-semibold leading-tight tracking-[-0.03em]">
              One instruction → five agents → verified records.
            </h2>
            <p className="mt-2 max-w-md text-[11.5px] leading-6 text-white/50">
              Ask BizFlow to process an order for Ahmed Raza. Watch the plan execute against the
              live catalog, then inspect the five verification checks and the prepared message
              waiting for your approval.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-cream text-ink hover:bg-white"
                onClick={() =>
                  navigate(
                    "/app/manager?prompt=" +
                      encodeURIComponent(
                        "Process an order for Ahmed Raza for 3 units of Product A, generate the invoice, record the sale and prepare a confirmation message."
                      )
                  )
                }
              >
                <Zap size={12} /> Run order-to-cash
              </Button>
              <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => navigate("/app/workflows")}>
                Inspect history
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-white/35">
              <span className="inline-flex items-center gap-1"><Clock3 size={10} /> live timeline</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck size={10} /> approval gate</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 size={10} /> read-back checks</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
