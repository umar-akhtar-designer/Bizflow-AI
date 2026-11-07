import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Database,
  Fingerprint,
  Gauge,
  Globe2,
  KeyRound,
  Layers,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  User,
  Waypoints,
  Zap,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Input,
  KeyValue,
  Label,
  SectionTitle,
  Select,
  Skeleton,
  Tabs,
} from "@/components/ui";
import { AIStatusPill, AgentChip } from "@/components/Badges";
import { MiniStat } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import { api, getToken } from "@/lib/api";
import { cn, formatDate, titleCase } from "@/lib/utils";
import type { AgentProfile, SettingsData } from "@/types";

const currencies = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "PKR", label: "PKR — Pakistani Rupee" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
];

function SettingRow({
  icon: Icon,
  title,
  copy,
  children,
}: {
  icon: typeof User;
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/80 bg-white/50 px-3.5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper text-sage">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[9.5px] leading-4 text-muted">{copy}</p>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { push } = useToast();
  const { refresh } = useAuth();
  const [tab, setTab] = useState("business");
  const [business, setBusiness] = useState({
    business_name: "",
    legal_name: "",
    email: "",
    phone: "",
    address: "",
    invoice_prefix: "",
  });
  const [preferences, setPreferences] = useState({
    currency: "USD",
    tax_rate: "0",
    low_stock_threshold: "10",
  });
  const [profile, setProfile] = useState({ full_name: "" });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<SettingsData>("/api/settings"),
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get<{ items: AgentProfile[]; ai: SettingsData["ai"] }>("/api/agents"),
  });

  useEffect(() => {
    if (!data) return;
    setBusiness({
      business_name: data.business.name || "",
      legal_name: data.business.legal_name || "",
      email: data.business.email || "",
      phone: data.business.phone || "",
      address: data.business.address || "",
      invoice_prefix: data.business.invoice_prefix || "",
    });
    setPreferences({
      currency: data.business.currency || "USD",
      tax_rate: String(data.business.tax_rate ?? 0),
      low_stock_threshold: String(data.business.low_stock_threshold ?? 10),
    });
    setProfile({ full_name: data.user.full_name || "" });
  }, [data]);

  const save = useMutation({
    mutationFn: (payload: Record<string, string | number | null>) => api.patch<SettingsData>("/api/settings", payload),
    onSuccess: async () => {
      setError(null);
      push("Settings saved", "Changes were persisted and written to the audit log.", "success");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await refresh();
    },
    onError: (err: Error) => setError(err.message),
  });

  const saveBusiness = () => {
    if (business.business_name.trim().length < 2) {
      setError("Business name must be at least 2 characters.");
      return;
    }
    setError(null);
    save.mutate({
      business_name: business.business_name.trim(),
      legal_name: business.legal_name || null,
      email: business.email || null,
      phone: business.phone || null,
      address: business.address || null,
      invoice_prefix: business.invoice_prefix || null,
    });
  };

  const savePreferences = () => {
    const tax = Number(preferences.tax_rate);
    const threshold = Number(preferences.low_stock_threshold);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      setError("Tax rate must be between 0 and 100.");
      return;
    }
    if (!Number.isInteger(threshold) || threshold < 0) {
      setError("Low stock threshold must be a non-negative whole number.");
      return;
    }
    setError(null);
    save.mutate({
      currency: preferences.currency,
      tax_rate: tax,
      low_stock_threshold: threshold,
    });
  };

  const saveProfile = () => {
    if (profile.full_name.trim().length < 2) {
      setError("Your display name must be at least 2 characters.");
      return;
    }
    setError(null);
    save.mutate({ full_name: profile.full_name.trim() });
  };

  const copy = (value: string, label: string) => {
    void navigator.clipboard?.writeText(value);
    push("Copied", `${label} copied to the clipboard.`, "info");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-[420px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="p-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={22} className="text-rose-500" />
          <p className="text-sm font-semibold text-ink">Could not load settings</p>
          <p className="max-w-sm text-xs text-muted">Check the API connection and retry.</p>
          <Button size="sm" onClick={() => refetch()}><RefreshCw size={12} /> Retry</Button>
        </div>
      </Card>
    );
  }

  const live = data.ai.mode === "vultr";

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Workspace"
        title="Settings"
        description="Business identity, financial defaults and the AI engine that plans your workflows. Every change is validated server-side and audited."
        action={<AIStatusPill status={data.ai} />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "business", label: "Business" },
            { value: "preferences", label: "Financial defaults" },
            { value: "profile", label: "Your profile" },
            { value: "ai", label: "AI engine" },
            { value: "security", label: "Security & system" },
          ]}
        />
        <span className="inline-flex items-center gap-1.5 text-[9.5px] text-sage">
          <LockKeyhole size={10} /> role: {titleCase(data.role)}
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[10.5px] leading-5 text-rose-700">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {tab === "business" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                <Building2 size={15} />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-ink">Business identity</p>
                <p className="text-[9.5px] text-muted">Appears on invoices and reports</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="business-name">Business name</Label>
                <Input id="business-name" value={business.business_name} onChange={(event) => setBusiness({ ...business, business_name: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="legal-name" hint="Optional">Legal name</Label>
                <Input id="legal-name" value={business.legal_name} onChange={(event) => setBusiness({ ...business, legal_name: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="invoice-prefix" hint="Used for invoice numbers">Invoice prefix</Label>
                <Input id="invoice-prefix" value={business.invoice_prefix} onChange={(event) => setBusiness({ ...business, invoice_prefix: event.target.value.toUpperCase() })} maxLength={12} />
              </div>
              <div>
                <Label htmlFor="business-email" hint="Optional">Email</Label>
                <Input id="business-email" type="email" value={business.email} onChange={(event) => setBusiness({ ...business, email: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="business-phone" hint="Optional">Phone</Label>
                <Input id="business-phone" value={business.phone} onChange={(event) => setBusiness({ ...business, phone: event.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="business-address" hint="Optional">Address</Label>
                <Input id="business-address" value={business.address} onChange={(event) => setBusiness({ ...business, address: event.target.value })} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[9px] text-sage">
                <ShieldCheck size={10} /> Saving writes an audit entry.
              </p>
              <Button size="sm" onClick={saveBusiness} loading={save.isPending}>
                <Save size={12} /> Save business
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <p className="text-[12px] font-semibold text-ink">Workspace snapshot</p>
              <div className="mt-2 divide-y divide-line/60">
                <KeyValue label="Name" value={data.business.name} />
                <KeyValue label="Currency" value={data.business.currency} />
                <KeyValue label="Tax rate" value={`${data.business.tax_rate}%`} />
                <KeyValue label="Low stock threshold" value={data.business.low_stock_threshold} />
                <KeyValue label="Invoice prefix" value={data.business.invoice_prefix || "—"} />
                <KeyValue label="AI mode" value={data.ai.mode === "vultr" ? "Vultr inference" : "Deterministic"} />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe2 size={14} className="text-blue-700" />
                  <p className="text-[11.5px] font-semibold text-ink">Public site</p>
                </div>
                <Badge tone="active">Live</Badge>
              </div>
              <p className="mt-1.5 text-[10px] leading-5 text-muted">
                The marketing site is a separate public route and does not require authentication.
              </p>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate("/")}>
                <Globe2 size={12} /> Open public site
              </Button>
            </Card>
          </div>
        </motion.div>
      )}

      {tab === "preferences" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <CircleDollarSign size={15} />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-ink">Financial defaults</p>
                <p className="text-[9.5px] text-muted">Applied to new orders and invoices server-side</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="setting-currency">Currency</Label>
                <Select id="setting-currency" value={preferences.currency} onChange={(event) => setPreferences({ ...preferences, currency: event.target.value })}>
                  {currencies.map((currency) => (
                    <option key={currency.value} value={currency.value}>{currency.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="setting-tax">Tax rate (%)</Label>
                <Input id="setting-tax" type="number" min={0} max={100} step="0.01" value={preferences.tax_rate} onChange={(event) => setPreferences({ ...preferences, tax_rate: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="setting-threshold">Low stock threshold</Label>
                <Input id="setting-threshold" type="number" min={0} step="1" value={preferences.low_stock_threshold} onChange={(event) => setPreferences({ ...preferences, low_stock_threshold: event.target.value })} />
              </div>
              <div className="flex items-end">
                <div className="w-full rounded-xl border border-line bg-paper/60 px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-sage">Tax model</p>
                  <p className="mt-0.5 text-[10px] font-medium text-ink">Exclusive — added at order time</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-[9px] leading-4 text-sage">
                Changing currency does not convert historical records.
              </p>
              <Button size="sm" onClick={savePreferences} loading={save.isPending}>
                <Save size={12} /> Save defaults
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <SlidersHorizontal size={15} />
              </span>
              <p className="text-[12px] font-semibold text-ink">How defaults are used</p>
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                ["Currency", "Stored on every order, invoice and payment so history stays accurate."],
                ["Tax rate", "Applied by the order service, not the client. The quote is always recomputed."],
                ["Low stock threshold", "Used by inventory risk views and restock recommendations."],
                ["Invoice prefix", "Prepended at invoice generation with a collision-safe sequence."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-xl border border-line/80 bg-paper/50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-[9.5px] leading-4 text-muted">{copy}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {tab === "profile" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={data.user.full_name} color={data.user.avatar_color} size={44} />
              <div>
                <p className="text-[12px] font-semibold text-ink">{data.user.full_name}</p>
                <p className="text-[10px] text-muted">{data.user.email}</p>
              </div>
              <Badge tone="verified" className="ml-auto">{titleCase(data.role)}</Badge>
            </div>
            <Divider className="my-4" />
            <div className="space-y-3">
              <div>
                <Label htmlFor="profile-name">Display name</Label>
                <Input id="profile-name" value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={data.user.email} disabled />
                <p className="mt-1 text-[9px] text-sage">Email changes require a separate verification flow and are not exposed here.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={saveProfile} loading={save.isPending}>
                <Save size={12} /> Save profile
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[12px] font-semibold text-ink">Session</p>
            <div className="mt-2 divide-y divide-line/60">
              <KeyValue label="User ID" value={<span className="font-mono text-[9.5px]">{data.user.id.slice(0, 18)}…</span>} />
              <KeyValue label="Created" value={formatDate(data.user.created_at)} />
              <KeyValue label="Last login" value={formatDate(data.user.last_login_at, true)} />
              <KeyValue label="Auth" value="JWT bearer" />
              <KeyValue label="Token" value={<span className="font-mono text-[9px]">{getToken()?.slice(0, 12) || "—"}…</span>} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => copy(data.user.email, "Email")}>
                <Copy size={11} /> Copy email
              </Button>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw size={11} /> Reload
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {tab === "ai" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className={cn("relative overflow-hidden p-5", live ? "border-forest-200" : "border-amber-200")}>
            <div className={cn("pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl", live ? "bg-forest-100/70" : "bg-amber-100/70")} />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", live ? "bg-forest-600 text-white" : "bg-amber-100 text-amber-800")}>
                  {live ? <Sparkles size={18} /> : <Terminal size={18} />}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink">
                      {live ? "Vultr Serverless Inference" : "Deterministic planner"}
                    </p>
                    <Badge tone={live ? "verified" : "pending"}>
                      {live ? "Model connected" : "No LLM key"}
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-xl text-[10.5px] leading-5 text-muted">{data.ai.label}</p>
                  <p className="mt-2 font-mono text-[9.5px] text-sage">
                    provider: {data.ai.provider} · model: {data.ai.model || "—"} · available: {String(data.ai.available)}
                  </p>
                </div>
              </div>
              <AIStatusPill status={data.ai} compact />
            </div>

            <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-white/60 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Planner</p>
                <p className="mt-0.5 text-[10.5px] font-semibold text-ink">{live ? "LLM refines intent" : "Rule-based extraction"}</p>
              </div>
              <div className="rounded-xl border border-line bg-white/60 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Execution</p>
                <p className="mt-0.5 text-[10.5px] font-semibold text-ink">Fixed, validated tools</p>
              </div>
              <div className="rounded-xl border border-line bg-white/60 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Guardrails</p>
                <p className="mt-0.5 text-[10.5px] font-semibold text-ink">Approval-gated actions</p>
              </div>
            </div>

            {!live && (
              <div className="relative mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-800">
                  <AlertTriangle size={11} /> Honest demo mode
                </p>
                <p className="mt-1 text-[10px] leading-5 text-amber-900">
                  No Vultr inference key is configured, so no language model is being called. The
                  deterministic planner still executes real database workflows. Set
                  <code className="mx-1 rounded bg-white/70 px-1 py-0.5 font-mono text-[9px]">VULTR_INFERENCE_API_KEY</code>
                  on the backend to enable model-written intent extraction and report narratives.
                </p>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-paper text-sage">
                  <Layers size={13} />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-ink">Agent roster</p>
                  <p className="text-[9.5px] text-muted">Specialized roles with a bounded tool set</p>
                </div>
              </div>
              <span className="font-mono text-[9px] text-sage">{agents?.items.length || 0} agents</span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {(agents?.items || []).map((agent) => (
                <div key={agent.key} className="rounded-xl border border-line/80 bg-paper/40 p-3.5">
                  <div className="flex items-center gap-2">
                    <AgentChip agentKey={agent.key} size="sm" />
                    <Badge tone="read_only" className="ml-auto text-[8px]">{agent.role}</Badge>
                  </div>
                  <p className="mt-2 text-[9.5px] leading-4 text-muted">{agent.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {tab === "security" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                <ShieldCheck size={15} />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-ink">Security posture</p>
                <p className="text-[9.5px] text-muted">Enforced in the backend, not the UI</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <SettingRow icon={KeyRound} title="Password hashing" copy="bcrypt with per-password salts; hashes never returned by the API." />
              <SettingRow icon={Fingerprint} title="Authentication" copy="Signed JWT bearer tokens with expiry; every data route is protected." />
              <SettingRow icon={Gauge} title="Rate limiting" copy="Login and workflow creation are throttled per client." />
              <SettingRow icon={LockKeyhole} title="Tenant isolation" copy="Every query is scoped to your business membership." />
              <SettingRow icon={Database} title="Transactional writes" copy="Order core uses one atomic transaction with rollback on failure." />
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Server size={14} className="text-violet-700" />
                <p className="text-[12px] font-semibold text-ink">Runtime</p>
              </div>
              <div className="mt-2 divide-y divide-line/60">
                <KeyValue label="AI provider" value={data.ai.provider} />
                <KeyValue label="Mode" value={data.ai.mode} />
                <KeyValue label="Model" value={data.ai.model || "—"} />
                <KeyValue label="API base" value="/api (proxied)" />
                <KeyValue label="Database" value="PostgreSQL / SQLite" />
                <KeyValue label="Audit retention" value="Persistent" />
              </div>
            </Card>

            <Card className="border-dashed bg-paper/40 p-5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cream text-sage ring-1 ring-line">
                  <Banknote size={15} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-ink">No secrets in the browser</p>
                  <p className="mt-1 text-[10px] leading-5 text-muted">
                    The Vultr inference key lives only in backend environment variables. The frontend
                    receives an honest mode label, never credentials.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-[12px] font-semibold text-ink">Want to verify the guardrails?</p>
              <p className="mt-1 text-[10px] leading-5 text-muted">
                Run the insufficient-stock workflow: it stops before any write. Then inspect the audit
                trail to confirm nothing partial was persisted.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate("/app/manager")}>
                  <Zap size={12} /> Open manager
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/app/workflows")}>
                  <Waypoints size={12} /> Audit trail <ChevronRight size={11} />
                </Button>
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[9.5px] text-sage">
        <CheckCircle2 size={10} /> BizFlow AI · business operations with verified writes and human control
      </p>
    </div>
  );
}
