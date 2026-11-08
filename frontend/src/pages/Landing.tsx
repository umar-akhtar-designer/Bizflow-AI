import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileCheck2,
  Fingerprint,
  Gauge,
  Github,
  Globe2,
  Layers,
  LockKeyhole,
  MessageSquareText,
  Package,
  Play,
  ReceiptText,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Waypoints,
  Workflow,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";
import { AIStatusPill } from "@/components/Badges";
import { cn } from "@/lib/utils";

const previewSteps = [
  { agent: "Customer", color: "#1D4ED8", title: "Identify customer", detail: "Ahmed Raza · Atlas Logistics · 6 prior orders" },
  { agent: "Inventory", color: "#0B7A5C", title: "Retrieve product", detail: "Product A — Smart Sensor Kit · 64 in stock" },
  { agent: "Inventory", color: "#0B7A5C", title: "Validate stock", detail: "3 requested · 64 available · reserved safely" },
  { agent: "Sales", color: "#B45309", title: "Calculate total", detail: "Subtotal 447.00 · tax 37.99 · total 485.00" },
  { agent: "Sales", color: "#B45309", title: "Create order", detail: "ORD-20261107-0042 · 1 line item" },
  { agent: "Inventory", color: "#0B7A5C", title: "Reserve inventory", detail: "64 → 61 · movement recorded" },
  { agent: "Finance", color: "#7C3AED", title: "Generate invoice", detail: "INV-20261107-0042 · due in 14 days" },
  { agent: "Reporting", color: "#0F766E", title: "Verify records", detail: "5 linked records read back and matched" },
];

function WorkflowPreview() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % (previewSteps.length + 2));
    }, 1450);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const current = Math.min(active, previewSteps.length - 1);
  const finished = active >= previewSteps.length;

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: 1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[26px] border border-white/10 bg-ink shadow-[0_40px_100px_-30px_rgba(7,30,23,0.65)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" />
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-forest-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-coral/10 blur-3xl" />

        <div className="relative flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="ml-2 text-[10px] font-medium text-white/35">BizFlow · live workflow replay</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-forest-400/20 bg-forest-500/10 px-2 py-1 text-[9px] font-semibold text-forest-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-forest-300" />
            </span>
            agent run
          </span>
        </div>

        <div className="relative p-5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Instruction</p>
            <p className="mt-1.5 text-[12px] leading-5 text-cream/90">
              "Process an order for Ahmed for 3 units of Product A, generate an invoice,
              record the sale, and prepare a confirmation message."
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Execution plan</p>
            <p className="font-mono text-[9px] text-white/35">
              {finished ? "11/11" : `${Math.min(current + 1, 11)}/11`} steps
            </p>
          </div>

          <div className="mt-2.5 space-y-1.5">
            {previewSteps.map((step, index) => {
              const isActive = index === current && !finished;
              const isDone = index < current || finished;
              return (
                <motion.div
                  key={step.title}
                  animate={{
                    opacity: isDone || isActive ? 1 : 0.32,
                    x: isActive ? 2 : 0,
                  }}
                  transition={{ duration: 0.35 }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors",
                    isActive
                      ? "border-forest-400/30 bg-forest-500/10"
                      : "border-transparent bg-white/[0.02]"
                  )}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[8px] font-bold text-white"
                    style={{ background: step.color, opacity: isDone || isActive ? 1 : 0.5 }}
                  >
                    {step.agent.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-semibold text-cream/90">{step.title}</p>
                    <p className="truncate font-mono text-[8.5px] text-white/35">{step.detail}</p>
                  </div>
                  {isDone ? (
                    <CheckCircle2 size={13} className="text-forest-300" />
                  ) : isActive ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-forest-300/30 border-t-forest-300" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full border border-white/15" />
                  )}
                </motion.div>
              );
            })}
          </div>

          <motion.div
            animate={{ opacity: finished ? 1 : 0.45, y: finished ? 0 : 4 }}
            className="mt-3.5 flex items-center justify-between rounded-xl border border-forest-400/20 bg-forest-500/[0.08] px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2">
              <BadgeCheck size={15} className="text-forest-300" />
              <div>
                <p className="text-[10px] font-semibold text-cream">
                  {finished ? "5 records verified" : "Verification queued"}
                </p>
                <p className="font-mono text-[8.5px] text-white/35">
                  {finished ? "order · sale · invoice · stock · approval" : "independent read-back"}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-white/55">
              {finished ? "complete" : "running"}
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="absolute -bottom-7 -left-4 hidden items-center gap-3 rounded-2xl border border-line bg-cream px-4 py-3 shadow-lift sm:flex"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <ShieldCheck size={15} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-ink">Approval gate</p>
          <p className="text-[9px] text-muted">Message prepared, not sent</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.6 }}
        className="absolute -right-4 -top-5 hidden items-center gap-2 rounded-full border border-line bg-cream px-3.5 py-2 shadow-lift sm:flex"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-600 text-white">
          <Check size={11} />
        </span>
        <p className="text-[10px] font-semibold text-ink">Zero duplicate orders</p>
      </motion.div>
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const agents = [
  {
    name: "Inventory Agent",
    role: "Stock control",
    color: "#0B7A5C",
    initials: "IN",
    copy: "Checks availability, reserves units atomically, records every movement and flags reorder risk.",
    tools: ["check_stock", "reserve_stock", "low_stock_scan"],
  },
  {
    name: "Sales Agent",
    role: "Order desk",
    color: "#B45309",
    initials: "SA",
    copy: "Builds the order, calculates totals deterministically and links the sale to the customer.",
    tools: ["calculate_totals", "create_order", "record_sale"],
  },
  {
    name: "Customer Agent",
    role: "Relationship",
    color: "#1D4ED8",
    initials: "CU",
    copy: "Resolves the buyer, pulls order history and drafts the confirmation — held until approved.",
    tools: ["resolve_customer", "get_history", "draft_message"],
  },
  {
    name: "Finance Agent",
    role: "Invoicing",
    color: "#7C3AED",
    initials: "FI",
    copy: "Generates the invoice with deterministic tax, tracks balances and requests approval for refunds.",
    tools: ["create_invoice", "apply_payment", "prepare_refund"],
  },
  {
    name: "Reporting Agent",
    role: "Verification",
    color: "#0F766E",
    initials: "RE",
    copy: "Reads the database back, compares totals and refuses to call a workflow complete until every check passes.",
    tools: ["verify_records", "business_report", "finalize"],
  },
];

const workflowPhases = [
  { n: "01", title: "Understand", detail: "Parse the instruction, resolve real customer and product entities.", agent: "Planner" },
  { n: "02", title: "Plan", detail: "Build an ordered plan with dependencies and an explicit atomic group.", agent: "Orchestrator" },
  { n: "03", title: "Execute", detail: "Call only registered tools. No SQL generation, no shell access.", agent: "5 agents" },
  { n: "04", title: "Protect", detail: "Stock is decremented with a conditional update inside one transaction.", agent: "Guardrails" },
  { n: "05", title: "Verify", detail: "Independently read back five linked records and compare totals.", agent: "Reporting" },
  { n: "06", title: "Approve", detail: "Sensitive messages and refunds wait for a named human decision.", agent: "You" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-[12px] font-medium text-muted md:flex">
            <a href="#product" className="transition hover:text-ink">Product</a>
            <a href="#workflow" className="transition hover:text-ink">Order-to-cash</a>
            <a href="#agents" className="transition hover:text-ink">Agents</a>
            <a href="#guardrails" className="transition hover:text-ink">Guardrails</a>
            <a href="#stack" className="transition hover:text-ink">Stack</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden text-[12px] font-semibold text-ink sm:block">
              Sign in
            </Link>
            <Button variant="primary" size="sm" onClick={() => navigate("/login?demo=1")}>
              Open live demo <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.55]" />
        <div className="pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-forest-100/60 blur-[100px]" />
        <div className="pointer-events-none absolute -right-40 top-40 h-[380px] w-[380px] rounded-full bg-orange-100/50 blur-[100px]" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-28 lg:pt-20">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-forest-50/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-forest-800"
            >
              <Sparkles size={12} />
              Vultr Agent Rush 2026 · Powering the Future of Work
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-[640px] text-balance text-[42px] font-semibold leading-[1.02] tracking-[-0.045em] text-ink sm:text-[58px] lg:text-[64px]"
            >
              One instruction.
              <br />
              Five specialists.
              <br />
              <span className="font-display font-normal italic tracking-[-0.02em] text-forest-700">
                Verified records.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mt-6 max-w-[540px] text-pretty text-[14px] leading-7 text-muted sm:text-[15px]"
            >
              BizFlow AI turns a natural-language business request into a coordinated
              order-to-cash run — real database writes, deterministic money math,
              independent verification, and a human approval gate before anything
              leaves the building.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button variant="primary" size="lg" onClick={() => navigate("/login?demo=1")}>
                Run the live workflow <ArrowRight size={16} />
              </Button>
              <a href="#workflow">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Play size={14} /> See how it works
                </Button>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
              className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] font-medium text-sage"
            >
              <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-forest-600" /> Real writes, not mockups</span>
              <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-forest-600" /> Deterministic tax math</span>
              <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-forest-600" /> Approval-gated actions</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.48 }}
              className="mt-8 flex items-center gap-3 text-[10px] text-sage"
            >
              <span className="font-medium uppercase tracking-[0.14em]">Demo workspace</span>
              <span className="h-3 w-px bg-line" />
              <span className="font-mono text-[10px] text-muted">demo@bizflow.ai</span>
              <span className="font-mono text-[10px] text-muted">demo1234</span>
            </motion.div>
          </div>

          <div className="relative lg:pl-4">
            <WorkflowPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-cream">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 divide-x divide-line px-5 sm:grid-cols-4 lg:px-8">
          {[
            { value: "5", label: "specialist agents", icon: Users },
            { value: "11", label: "tool-bound steps", icon: Waypoints },
            { value: "5", label: "records verified", icon: FileCheck2 },
            { value: "0", label: "arbitrary SQL", icon: LockKeyhole },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3 px-4 py-5 sm:px-6">
                <Icon size={15} className="text-forest-600" />
                <p className="text-[15px] font-semibold text-ink">
                  {stat.value}
                  <span className="ml-1.5 text-[10px] font-normal text-muted">{stat.label}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="product" className="relative mx-auto w-full max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest-700">Built for the work behind the work</p>
          <h2 className="mt-3 text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[44px]">
            The boring, critical steps — <span className="font-display font-normal italic text-forest-700">executed, not described.</span>
          </h2>
          <p className="mt-4 text-[14px] leading-7 text-muted">
            Most agent demos stop at a chat response. BizFlow closes the loop: it writes the order,
            moves the stock, issues the invoice, checks its own work and asks a human before doing
            anything sensitive.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="group relative h-full overflow-hidden rounded-3xl border border-line bg-ink p-7 text-cream shadow-lift">
              <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" />
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-forest-600/30 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-forest-300">
                  <Workflow size={13} /> Orchestration layer
                </div>
                <h3 className="mt-4 max-w-md text-[24px] font-semibold leading-tight tracking-[-0.03em]">
                  A planner that refuses to guess.
                </h3>
                <p className="mt-3 max-w-lg text-[12.5px] leading-6 text-white/55">
                  The instruction is parsed against real customers and products, then converted
                  into a dependency-aware plan. Each step is bound to a registered backend tool
                  with validated inputs — never generated SQL.
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {[
                    ["customer.resolve", "read-only"],
                    ["inventory.validate_stock", "guard"],
                    ["sales.create_order", "atomic"],
                    ["finance.generate_invoice", "deterministic"],
                    ["customer.prepare_message", "approval"],
                    ["reporting.verify_order", "read-back"],
                  ].map(([tool, tag]) => (
                    <div key={tool} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5">
                      <code className="font-mono text-[10px] text-cream/80">{tool}</code>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-white/40">{tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4">
            <Reveal delay={0.06}>
              <div className="rounded-3xl border border-line bg-cream p-6 shadow-soft">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                  <CircleDollarSign size={17} />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">Money math you can audit</h3>
                <p className="mt-2 text-[12px] leading-6 text-muted">
                  Subtotal, tax and total are computed in backend Decimal code — not by the model.
                </p>
                <div className="mt-4 space-y-2 rounded-xl bg-paper p-3 font-mono text-[10px]">
                  <div className="flex justify-between text-muted"><span>subtotal</span><span>$447.00</span></div>
                  <div className="flex justify-between text-muted"><span>tax · 8.5%</span><span>$37.99</span></div>
                  <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink"><span>total</span><span>$485.00</span></div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="rounded-3xl border border-line bg-gradient-to-br from-violet-50 to-cream p-6 shadow-soft">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
                  <ShieldCheck size={17} />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">Prepare ≠ execute</h3>
                <p className="mt-2 text-[12px] leading-6 text-muted">
                  Refunds, restocks and customer messages create an approval request first.
                  Approving is a separate, audited action.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.04}>
            <div className="h-full rounded-3xl border border-line bg-cream p-6 shadow-soft">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Package size={17} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">Stock that can't go negative</h3>
              <p className="mt-2 text-[12px] leading-6 text-muted">
                Inventory is decremented with a conditional update inside the same transaction as
                the order, sale and invoice. Insufficient stock rolls back everything.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-3xl border border-line bg-cream p-6 shadow-soft">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <FileCheck2 size={17} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">Verification, not vibes</h3>
              <p className="mt-2 text-[12px] leading-6 text-muted">
                The Reporting Agent reads back five linked records and compares them to the plan.
                A failed check marks the run failed.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="h-full rounded-3xl border border-line bg-cream p-6 shadow-soft">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-coral">
                <Fingerprint size={17} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">Every action leaves a trail</h3>
              <p className="mt-2 text-[12px] leading-6 text-muted">
                Workflows, tasks, tool calls, latency, approvals and audit logs are persisted —
                ready for review after the run.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="workflow" className="border-y border-line bg-cream">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <Reveal className="max-w-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest-700">Order-to-cash</p>
              <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[42px]">
                From sentence to settled sale in <span className="font-display font-normal italic text-forest-700">one run.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white/60 px-3 py-2 text-[11px] text-muted">
                <Terminal size={13} className="text-forest-600" />
                Illustrative run · real persistence
              </div>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {workflowPhases.map((phase, index) => (
              <Reveal key={phase.n} delay={index * 0.05}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-line bg-paper/60 p-5 transition hover:border-forest-200 hover:bg-white">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[10px] font-semibold text-forest-600">{phase.n}</span>
                    <span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-sage ring-1 ring-line">
                      {phase.agent}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-ink">{phase.title}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-5 text-muted">{phase.detail}</p>
                  <div className="mt-4 h-1 w-8 rounded-full bg-forest-200 transition-all group-hover:w-14 group-hover:bg-forest-500" />
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.15} className="mt-8">
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-forest-200 bg-forest-50/70 p-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-600 text-white">
                  <Gauge size={16} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink">A run that takes minutes by hand finishes in seconds.</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    We record the real duration. The manual baseline is explicitly labelled as an illustrative estimate.
                  </p>
                </div>
              </div>
              <Link to="/login?demo=1" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-forest-800 hover:text-forest-900">
                Run it yourself <ArrowUpRight size={13} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="agents" className="mx-auto w-full max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest-700">Specialists, not a swarm</p>
          <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[42px]">
            Five clear responsibilities. <span className="font-display font-normal italic text-forest-700">One accountable run.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {agents.map((agent, index) => (
            <Reveal key={agent.name} delay={index * 0.06}>
              <div className="group flex h-full flex-col rounded-2xl border border-line bg-cream p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                  style={{ background: agent.color }}
                >
                  {agent.initials}
                </span>
                <h3 className="mt-4 text-[13px] font-semibold text-ink">{agent.name}</h3>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-sage">{agent.role}</p>
                <p className="mt-3 flex-1 text-[11px] leading-5 text-muted">{agent.copy}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {agent.tools.slice(0, 2).map((tool) => (
                    <code key={tool} className="rounded bg-paper px-1.5 py-1 font-mono text-[8px] text-sage">{tool}</code>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="guardrails" className="relative overflow-hidden bg-ink text-cream">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" />
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-forest-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-coral/10 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 py-20 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest-300">Safety is the product</p>
            <h2 className="mt-3 max-w-lg text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[44px]">
              An agent that can act must be <span className="font-display font-normal italic text-forest-300">contained.</span>
            </h2>
            <p className="mt-4 max-w-lg text-[13px] leading-7 text-white/50">
              BizFlow treats the model as a planner, not an operator. Every side effect goes through
              validated backend code with transaction boundaries, idempotency keys and explicit
              approval checks.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Database, title: "No arbitrary SQL", copy: "Tools are fixed functions with typed inputs." },
                { icon: LockKeyhole, title: "Secrets stay server-side", copy: "Keys live in environment variables only." },
                { icon: ShieldCheck, title: "Approval gates", copy: "External messages, refunds and restocks wait." },
                { icon: Workflow, title: "Atomic order core", copy: "Order, stock, sale and invoice commit together." },
                { icon: Fingerprint, title: "Idempotent requests", copy: "Duplicate submissions return the same run." },
                { icon: Layers, title: "Full audit trail", copy: "Every tool call and decision is persisted." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                    <Icon size={15} className="text-forest-300" />
                    <p className="mt-3 text-[12px] font-semibold">{item.title}</p>
                    <p className="mt-1 text-[10.5px] leading-5 text-white/40">{item.copy}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="overflow-hidden rounded-3xl border border-white/[0.09] bg-[#08110D] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3.5">
                <span className="h-2 w-2 rounded-full bg-rose-400/60" />
                <span className="h-2 w-2 rounded-full bg-amber-400/60" />
                <span className="h-2 w-2 rounded-full bg-forest-400/60" />
                <span className="ml-2 font-mono text-[10px] text-white/30">tool_policy.json</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[10.5px] leading-6 text-white/60">
{`{
  "planner": "llm | deterministic",
  "allowed_actions": [
    "customer.resolve",
    "inventory.validate_stock",
    "sales.create_order",
    "inventory.decrement",
    "finance.generate_invoice",
    "reporting.verify_order"
  ],
  "forbidden": [
    "raw_sql",
    "shell",
    "arbitrary_http"
  ],
  "atomic_group": "order_tx",
  "requires_approval": [
    "customer.send_message",
    "finance.refund",
    "procurement.restock"
  ],
  "verification": {
    "strategy": "independent_read_back",
    "fail_closed": true
  }
}`}
              </pre>
              <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3">
                <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-forest-300">
                  <CheckCircle2 size={11} /> policy enforced server-side
                </span>
                <span className="font-mono text-[9px] text-white/25">v1.0</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="stack" className="mx-auto w-full max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest-700">Deployment-ready</p>
            <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[42px]">
              Built for <span className="font-display font-normal italic text-forest-700">Vultr Cloud Compute.</span>
            </h2>
            <p className="mt-4 max-w-lg text-[13px] leading-7 text-muted">
              The stack is containerized end to end: PostgreSQL, FastAPI, the React app and Nginx
              behind a single Compose file. Vultr Serverless Inference plugs into the same provider
              interface when a key is available.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Vultr Cloud Compute", "Serverless Inference", "PostgreSQL 16", "FastAPI", "React", "Docker", "Nginx"].map((tag) => (
                <span key={tag} className="rounded-full border border-line bg-cream px-3 py-1.5 text-[10px] font-semibold text-muted">{tag}</span>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-[11px] leading-6 text-amber-900">
              <strong className="font-semibold">Honest status:</strong> local demo is fully functional.
              Vultr deployment files and exact steps are included, but this demo does not claim a live
              Vultr deployment without a verified account and public URL.
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Server, title: "Cloud Compute VM", copy: "FastAPI + PostgreSQL in Docker Compose behind Nginx." },
                { icon: Zap, title: "Serverless Inference", copy: "OpenAI-compatible provider with timeout, retries and token tracking." },
                { icon: Globe2, title: "Public web app", copy: "Responsive React product experience with protected routes." },
                { icon: Boxes, title: "Deterministic fallback", copy: "Full workflow execution even when no model key exists." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-line bg-cream p-5 shadow-soft">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper text-forest-700">
                      <Icon size={16} />
                    </div>
                    <p className="mt-3 text-[13px] font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted">{item.copy}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-5 pb-20 lg:px-8 lg:pb-28">
        <Reveal>
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-forest-700 px-6 py-14 text-center text-cream sm:px-12 lg:py-20">
            <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-30" />
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-forest-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-coral/20 blur-3xl" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest-200">See the whole loop</p>
              <h2 className="mt-4 text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[48px]">
                Give it one sentence. <span className="font-display font-normal italic text-forest-100">Watch it earn trust.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[13px] leading-7 text-white/60">
                Open the seeded Northwind Supply workspace, run the flagship order-to-cash workflow,
                inspect the verification checks and approve the prepared customer message.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => navigate("/login?demo=1")}
                  className="w-full bg-white text-ink hover:bg-cream sm:w-auto"
                >
                  Open the live demo <ArrowRight size={16} />
                </Button>
                <a href="#workflow">
                  <Button size="lg" variant="ghost" className="w-full border border-white/25 text-white hover:bg-white/10 hover:text-white sm:w-auto">
                    Replay the workflow
                  </Button>
                </a>
              </div>
              <p className="mt-5 font-mono text-[10px] text-white/40">demo@bizflow.ai · demo1234</p>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line bg-cream">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <Logo />
            <div className="flex flex-wrap items-center gap-5 text-[11px] font-medium text-muted">
              <a href="#product" className="hover:text-ink">Product</a>
              <a href="#workflow" className="hover:text-ink">Workflow</a>
              <a href="#guardrails" className="hover:text-ink">Security</a>
              <a href="#stack" className="hover:text-ink">Stack</a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                <Github size={12} /> Repository
              </a>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 border-t border-line pt-6 text-[10px] text-sage sm:flex-row sm:items-center">
            <p>© 2026 BizFlow AI · Built for Vultr Agent Rush · Powering the Future of Work.</p>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />
              Demo mode is clearly labeled. No fabricated model claims.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
