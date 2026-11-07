import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Boxes,
  CalendarRange,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Package,
  Printer,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Terminal,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AIStatusPill, LiveDot } from "@/components/Badges";
import { Badge, Button, Card, EmptyState, ProgressBar, SectionTitle, Select, Skeleton, Tabs } from "@/components/ui";
import { StatCard, MiniStat } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import {
  cn,
  compactMoney,
  formatDate,
  money,
  number,
  percent,
  shortDate,
} from "@/lib/utils";
import type { ReportSummary } from "@/types";

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

function downloadCsv(report: ReportSummary, businessName: string) {
  const rows: string[][] = [
    ["BizFlow AI business report"],
    ["Business", businessName],
    ["Period", `Last ${report.period_days} days`],
    ["Generated", report.generated_at],
    [],
    ["Metric", "Value"],
    ["Revenue", String(report.metrics.revenue)],
    ["Previous revenue", String(report.metrics.previous_revenue)],
    ["Revenue change %", String(report.metrics.revenue_change_pct)],
    ["Orders", String(report.metrics.orders)],
    ["Average order value", String(report.metrics.average_order_value)],
    ["Outstanding", String(report.metrics.outstanding)],
    ["Units sold", String(report.metrics.units_sold)],
    ["Low stock SKUs", String(report.metrics.low_stock_count)],
    [],
    ["Date", "Revenue", "Orders"],
    ...report.series.map((point) => [point.date, String(point.revenue), String(point.orders)]),
    [],
    ["Top product", "Units", "Revenue"],
    ...report.top_products.map((product) => [product.name, String(product.units), String(product.revenue)]),
    [],
    ["Insight"],
    ...report.insights.map((insight) => [insight]),
  ];
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bizflow-report-${report.period_days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { push } = useToast();
  const [days, setDays] = useState("7");
  const [chart, setChart] = useState("revenue");

  const { data: report, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["reports", "summary", days],
    queryFn: () => api.get<ReportSummary>("/api/reports/summary", { days }),
    refetchInterval: 60_000,
  });

  const topMax = useMemo(() => {
    if (!report?.top_products?.length) return 1;
    return Math.max(...report.top_products.map((product) => product.revenue), 1);
  }, [report]);

  const handleExport = () => {
    if (!report) return;
    downloadCsv(report, report.business?.name || "Workspace");
    push("Report exported", "A CSV snapshot was generated from the same database records.", "success");
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Intelligence"
        title="Business reports"
        description="A live operating snapshot: revenue trend, top products, receivables and reorder risk — with an honest label on where the narrative came from."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AIStatusPill status={report?.ai_status} compact />
            <Select value={days} onChange={(event) => setDays(event.target.value)} className="h-8 w-[118px] py-0 text-[11px]">
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching && !isLoading}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button size="sm" onClick={handleExport} disabled={!report}>
              <Download size={13} /> Export CSV
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-[340px]" />
        </div>
      ) : isError || !report ? (
        <Card className="p-10">
          <EmptyState
            icon={AlertTriangle}
            title="Could not generate the report"
            description="Check the API connection and retry."
            action={<Button onClick={() => refetch()}><RefreshCw size={13} /> Retry</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9.5px] text-sage">
            <span className="inline-flex items-center gap-1"><CalendarRange size={10} /> Period {formatDate(report.series[0]?.date)} → {formatDate(report.series[report.series.length - 1]?.date)}</span>
            <span>·</span>
            <span>generated {formatDate(report.generated_at, true)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><FileSpreadsheet size={10} /> {report.source}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              index={0}
              label="Revenue"
              value={compactMoney(report.metrics.revenue)}
              change={report.metrics.revenue_change_pct}
              hint={`prev ${compactMoney(report.metrics.previous_revenue)}`}
              icon={<CircleDollarSign size={15} />}
              accent="forest"
            />
            <StatCard index={1} label="Orders" value={number(report.metrics.orders)} hint={`${number(report.metrics.units_sold)} units sold`} icon={<ShoppingCart size={15} />} accent="blue" />
            <StatCard index={2} label="Avg. order" value={compactMoney(report.metrics.average_order_value)} hint={`${number(report.metrics.orders)} completed`} icon={<TrendingUp size={15} />} accent="violet" />
            <StatCard index={3} label="Outstanding" value={compactMoney(report.metrics.outstanding)} hint="unpaid invoices" icon={<Wallet size={15} />} accent={Number(report.metrics.outstanding) > 0 ? "amber" : "forest"} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat label="Revenue trend" value={`${report.metrics.revenue_change_pct >= 0 ? "+" : ""}${percent(report.metrics.revenue_change_pct)}`} tone={report.metrics.revenue_change_pct >= 0 ? "forest" : "rose"} />
            <MiniStat label="Low stock SKUs" value={String(report.metrics.low_stock_count)} tone={report.metrics.low_stock_count > 0 ? "amber" : "forest"} />
            <MiniStat label="Top product" value={report.top_products[0]?.name?.split("—")[0] || "—"} />
            <MiniStat label="Narrative source" value={report.ai.source === "vultr" ? "Vultr model" : "Computed"} tone={report.ai.source === "vultr" ? "forest" : "ink"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-ink">
                    {chart === "revenue" ? "Revenue trend" : "Order volume"}
                  </p>
                  <p className="text-[9.5px] text-muted">Daily values from persisted sales</p>
                </div>
                <Tabs
                  value={chart}
                  onChange={setChart}
                  tabs={[
                    { value: "revenue", label: "Revenue" },
                    { value: "orders", label: "Orders" },
                  ]}
                  className="scale-[0.94] origin-right"
                />
              </div>
              <div className="mt-4 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.series}>
                    <defs>
                      <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0B7A5C" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#0B7A5C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DA" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => shortDate(value)} tick={{ fontSize: 9, fill: "#8A948D" }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#8A948D" }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(value) => (chart === "revenue" ? compactMoney(value) : String(value))}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#AADDC5", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey={chart === "revenue" ? "revenue" : "orders"}
                      stroke="#0B7A5C"
                      strokeWidth={2}
                      fill="url(#reportGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
                <span className="inline-flex items-center gap-1 text-[9px] text-sage">
                  <Printer size={10} /> Use your browser print dialog for a PDF copy
                </span>
                <Link to="/app/workflows" className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-forest-700 hover:underline">
                  See the workflows behind this <ArrowRight size={10} />
                </Link>
              </div>
            </Card>

            <Card className="relative overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-violet-100/60 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", report.ai.source === "vultr" ? "bg-violet-100 text-violet-700" : "bg-forest-50 text-forest-700")}>
                      {report.ai.source === "vultr" ? <Sparkles size={15} /> : <Terminal size={15} />}
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-ink">Executive summary</p>
                      <p className="text-[9px] text-muted">{report.ai.label}</p>
                    </div>
                  </div>
                  {report.ai.source === "vultr" ? <LiveDot label="AI" /> : <Badge tone="read_only">Computed</Badge>}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-[11.5px] leading-6 text-ink/85">
                  {report.ai.text}
                </p>

                {report.ai.source !== "vultr" && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-800">
                      No LLM narrative
                    </p>
                    <p className="mt-1 text-[9.5px] leading-4 text-amber-900">
                      This summary is generated by deterministic aggregation, not a language model. Add a
                      Vultr inference key to enable model-written insight.
                    </p>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {report.insights.slice(0, 4).map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="flex gap-2 rounded-xl border border-line/80 bg-paper/50 px-3 py-2"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-forest-50 font-mono text-[8px] font-bold text-forest-700">
                        {index + 1}
                      </span>
                      <p className="text-[9.5px] leading-4 text-muted">{insight}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                    <BarChart3 size={13} />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-ink">Top products</p>
                    <p className="text-[9.5px] text-muted">By revenue in this period</p>
                  </div>
                </div>
                <span className="font-mono text-[9px] text-sage">{report.top_products.length} SKUs</span>
              </div>
              {report.top_products.length ? (
                <div className="space-y-3 px-5 py-4">
                  {report.top_products.map((product, index) => (
                    <div key={product.name}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-[10.5px] font-medium text-ink">
                          <span className="mr-1.5 font-mono text-[9px] text-sage">{String(index + 1).padStart(2, "0")}</span>
                          {product.name}
                        </p>
                        <p className="shrink-0 font-mono text-[10px] font-semibold text-ink">{money(product.revenue)}</p>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <ProgressBar value={(product.revenue / topMax) * 100} tone={index === 0 ? "forest" : "blue"} className="flex-1" />
                        <span className="w-14 text-right font-mono text-[8.5px] text-sage">{product.units} units</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Package} title="No sales in this period" description="Try a wider date range or run an order workflow." className="py-10" />
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <Boxes size={13} />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-ink">Reorder risk</p>
                    <p className="text-[9.5px] text-muted">At or below reorder level</p>
                  </div>
                </div>
                <Badge tone={report.low_stock.length ? "warning" : "verified"}>
                  {report.low_stock.length} SKU(s)
                </Badge>
              </div>
              {report.low_stock.length ? (
                <div className="divide-y divide-line/70">
                  {report.low_stock.slice(0, 6).map((product) => (
                    <div key={product.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <Package size={12} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10.5px] font-medium text-ink">{product.name}</p>
                        <p className="font-mono text-[8.5px] text-sage">
                          {product.sku} · reorder {product.reorder_level}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[10px] font-semibold text-amber-700">{product.stock_quantity}</p>
                        <p className="text-[8px] text-sage">on hand</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Boxes} title="Stock levels healthy" description="No products are at or below their reorder level." className="py-10" />
              )}
              <div className="border-t border-line bg-paper/40 px-5 py-2.5">
                <Link to="/app/inventory" className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-forest-700 hover:underline">
                  Open inventory <ArrowUpRight size={10} />
                </Link>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-forest-700" />
              <p className="text-[12px] font-semibold text-ink">How this report is produced</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["Aggregate", "Revenue, order counts, top products and balances are computed with SQL over persisted records."],
                ["Narrate", report.ai.source === "vultr" ? "The Vultr model writes the summary using only the supplied metrics." : "The deterministic planner writes the summary from computed insights — no model is called."],
                ["Trace", "Every report request is read-only. The workflows that created the underlying records remain fully auditable."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-xl border border-line/80 bg-paper/50 px-3.5 py-3">
                  <p className="text-[10.5px] font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-[9.5px] leading-5 text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
