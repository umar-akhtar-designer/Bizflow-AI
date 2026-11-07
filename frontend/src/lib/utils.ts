import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function money(value: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function compactMoney(value: number | null | undefined, currency = "USD") {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000)
    return `${currency === "USD" ? "$" : currency + " "}${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 10_000)
    return `${currency === "USD" ? "$" : currency + " "}${(amount / 1_000).toFixed(1)}k`;
  return money(amount, currency);
}

export function number(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

export function percent(value: number | null | undefined, digits = 1) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relativeTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.round(diff / 86400)}d ago`;
  return formatDate(value);
}

export function duration(ms?: number | null) {
  if (ms === undefined || ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function initials(name?: string | null) {
  if (!name) return "BF";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function titleCase(value?: string | null) {
  if (!value) return "—";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const statusTone: Record<string, string> = {
  completed: "bg-forest-50 text-forest-700 ring-forest-200",
  verified: "bg-forest-50 text-forest-700 ring-forest-200",
  active: "bg-forest-50 text-forest-700 ring-forest-200",
  paid: "bg-forest-50 text-forest-700 ring-forest-200",
  approved: "bg-forest-50 text-forest-700 ring-forest-200",
  healthy: "bg-forest-50 text-forest-700 ring-forest-200",
  success: "bg-forest-50 text-forest-700 ring-forest-200",
  running: "bg-blue-50 text-blue-700 ring-blue-200",
  queued: "bg-slate-100 text-slate-600 ring-slate-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  partial: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  processing: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  fulfilled: "bg-forest-50 text-forest-700 ring-forest-200",
  read_only: "bg-slate-100 text-slate-600 ring-slate-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  void: "bg-slate-100 text-slate-500 ring-slate-200",
  refunded: "bg-violet-50 text-violet-700 ring-violet-200",
  low: "bg-amber-50 text-amber-700 ring-amber-200",
  out: "bg-rose-50 text-rose-700 ring-rose-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  approval: "bg-violet-50 text-violet-700 ring-violet-200",
  skipped: "bg-slate-100 text-slate-500 ring-slate-200",
  rolled_back: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function toneFor(value?: string | null) {
  return statusTone[value || ""] || "bg-slate-100 text-slate-600 ring-slate-200";
}

export const agentMeta: Record<string, { name: string; color: string; initials: string }> = {
  inventory: { name: "Inventory Agent", color: "#0B7A5C", initials: "IN" },
  sales: { name: "Sales Agent", color: "#B45309", initials: "SA" },
  customer: { name: "Customer Agent", color: "#1D4ED8", initials: "CU" },
  finance: { name: "Finance Agent", color: "#7C3AED", initials: "FI" },
  reporting: { name: "Reporting Agent", color: "#0F766E", initials: "RE" },
};

export function agent(key: string) {
  return agentMeta[key] || { name: titleCase(key), color: "#68716C", initials: "AI" };
}
