import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, LockKeyhole, Workflow } from "lucide-react";
import { Logo } from "@/components/Logo";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-ink p-10 text-cream lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" />
        <div className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-forest-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-coral/10 blur-3xl" />

        <div className="relative">
          <Logo dark />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mt-20 max-w-md"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-forest-300">
              Autonomous business operations
            </p>
            <h1 className="mt-4 text-[42px] font-semibold leading-[1.04] tracking-[-0.045em] xl:text-[50px]">
              Run the business.
              <br />
              <span className="font-display font-normal italic text-forest-300">Not the busywork.</span>
            </h1>
            <p className="mt-5 max-w-sm text-[13px] leading-7 text-white/50">
              One instruction becomes an order, a stock movement, an invoice, a sale and
              a verified execution report — with a human in control of sensitive actions.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mt-14 max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-forest-300" />
              </span>
              <p className="text-[10px] font-semibold text-white/60">Live execution · order-to-cash</p>
            </div>
            <span className="font-mono text-[9px] text-white/30">11 steps</span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { agent: "CU", color: "#1D4ED8", text: "Customer resolved", meta: "Ahmed Raza · 6 orders" },
              { agent: "IN", color: "#0B7A5C", text: "Stock reserved", meta: "64 → 61 units" },
              { agent: "FI", color: "#7C3AED", text: "Invoice generated", meta: "INV-20261107-0042" },
              { agent: "RE", color: "#0F766E", text: "5 records verified", meta: "read-back passed" },
            ].map((row, index) => (
              <div key={row.text} className="flex items-center gap-2.5">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[8px] font-bold text-white"
                  style={{ background: row.color }}
                >
                  {row.agent}
                </span>
                <div className="flex-1">
                  <p className="text-[10.5px] font-medium text-cream/85">{row.text}</p>
                </div>
                <span className="font-mono text-[8.5px] text-white/30">{row.meta}</span>
                <BadgeCheck size={12} className="text-forest-300" />
                {index < 3 && <span className="sr-only">completed</span>}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-white/35">
          <span className="inline-flex items-center gap-1.5"><LockKeyhole size={11} /> JWT auth</span>
          <span className="inline-flex items-center gap-1.5"><Workflow size={11} /> Tool-bound agents</span>
          <span className="inline-flex items-center gap-1.5"><BadgeCheck size={11} /> Verified writes</span>
        </div>
      </div>

      <div className="relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            <ArrowLeft size={12} /> Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-[400px]"
          >
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">{title}</h1>
            <p className="mt-2 text-[13px] leading-6 text-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-6 text-center text-[11.5px] text-muted">{footer}</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
