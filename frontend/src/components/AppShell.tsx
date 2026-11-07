import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  CheckCheck,
  ChevronDown,
  CircleDollarSign,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  Waypoints,
  X,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { AIStatusPill } from "@/components/Badges";
import { Avatar, Button, Skeleton } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn, relativeTime, titleCase } from "@/lib/utils";
import type { NotificationItem } from "@/types";

const navSections = [
  {
    label: "Operate",
    items: [
      { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/app/manager", label: "AI Business Manager", icon: Sparkles, accent: true },
      { to: "/app/workflows", label: "Workflows", icon: Waypoints },
      { to: "/app/approvals", label: "Approvals", icon: ShieldCheck, badge: "approvals" },
    ],
  },
  {
    label: "Business",
    items: [
      { to: "/app/inventory", label: "Inventory", icon: Package },
      { to: "/app/orders", label: "Orders & sales", icon: ShoppingCart },
      { to: "/app/customers", label: "Customers", icon: Users },
      { to: "/app/finance", label: "Finance", icon: CircleDollarSign },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/app/reports", label: "Reports", icon: BarChart3 },
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

const pageTitles: Record<string, string> = {
  "/app": "Overview",
  "/app/manager": "AI Business Manager",
  "/app/workflows": "Workflow history",
  "/app/approvals": "Approval center",
  "/app/inventory": "Inventory",
  "/app/orders": "Orders & sales",
  "/app/customers": "Customers",
  "/app/finance": "Finance",
  "/app/reports": "Reports",
  "/app/settings": "Settings",
};

function getTitle(pathname: string) {
  if (pathname.startsWith("/app/workflows/")) return "Workflow detail";
  if (pathname.startsWith("/app/customers/")) return "Customer profile";
  if (pathname.startsWith("/app/orders/")) return "Order detail";
  return pageTitles[pathname] || "Workspace";
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { business, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: approvals } = useQuery({
    queryKey: ["approvals", "pending-count"],
    queryFn: () => api.get<{ pending_count: number }>("/api/approvals", { status: "pending" }),
    refetchInterval: 30_000,
  });
  const { data: ai } = useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => api.get<{ mode: string; provider: string; model: string | null; available: boolean; label: string }>("/api/ai/status"),
    refetchInterval: 60_000,
  });

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <Logo dark />
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="mx-3 mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-500/20 text-[11px] font-bold text-forest-200 ring-1 ring-inset ring-forest-400/20">
            {(business?.name || "BF").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-cream">
              {business?.name || "Workspace"}
            </p>
            <p className="text-[10px] capitalize text-white/45">{role || "owner"} · {business?.currency || "USD"}</p>
          </div>
          <ChevronDown size={14} className="text-white/30" />
        </div>
      </div>

      <nav className="scrollbar-none flex-1 overflow-y-auto px-3 pb-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const badge = item.badge === "approvals" ? approvals?.pending_count : undefined;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-medium transition-all duration-200",
                        isActive
                          ? "bg-white/[0.09] text-cream"
                          : "text-white/55 hover:bg-white/[0.05] hover:text-white/90"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-forest-400 transition-opacity",
                            isActive ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <Icon
                          size={16}
                          className={cn(
                            "shrink-0 transition",
                            isActive ? "text-forest-300" : "text-white/40 group-hover:text-white/70",
                            item.accent && !isActive && "text-coral/80 group-hover:text-coral"
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.accent && (
                          <span className="rounded bg-coral/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-coral">
                            Core
                          </span>
                        )}
                        {badge ? (
                          <span className="rounded-full bg-coral px-1.5 py-0.5 text-[9px] font-bold text-white">
                            {badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-3 mb-3 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-forest-900/60 to-white/[0.03] p-3.5">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-forest-300" />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">AI engine</p>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-cream">
          {ai?.mode === "vultr" ? "Vultr Serverless" : "Deterministic planner"}
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-white/40">
          {ai?.mode === "vultr"
            ? ai.model
            : "No key configured — clearly labeled demo mode"}
        </p>
        <Link
          to="/app/settings"
          onClick={onNavigate}
          className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-forest-300 hover:text-forest-200"
        >
          Configure <ArrowUpRight size={10} />
        </Link>
      </div>

      <div className="border-t border-white/[0.07] p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar name={user?.full_name} color={user?.avatar_color} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-cream">{user?.full_name}</p>
            <p className="truncate text-[10px] text-white/40">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-white/35 transition hover:bg-white/10 hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsMenu({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ items: NotificationItem[]; unread_count: number }>("/api/notifications"),
  });
  const markAll = useMutation({
    mutationFn: () => api.post("/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const unread = data?.unread_count || 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-cream shadow-lift"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-ink">Notifications</p>
          {unread > 0 && (
            <span className="rounded-full bg-coral px-1.5 py-0.5 text-[9px] font-bold text-white">{unread}</span>
          )}
        </div>
        <button
          onClick={() => markAll.mutate()}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest-700 hover:text-forest-900"
        >
          <CheckCheck size={12} /> Mark all read
        </button>
      </div>
      <div className="scrollbar-thin max-h-[360px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : data?.items?.length ? (
          data.items.slice(0, 8).map((item) => (
            <Link
              key={item.id}
              to={item.link || "/app"}
              onClick={onClose}
              className={cn(
                "block border-b border-line/60 px-4 py-3 transition last:border-0 hover:bg-paper",
                !item.is_read && "bg-forest-50/35"
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    item.level === "warning" && "bg-amber-500",
                    item.level === "success" && "bg-forest-600",
                    item.level === "approval" && "bg-violet-500",
                    item.level === "info" && "bg-blue-500"
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-muted">{item.message}</p>
                  <p className="mt-1 text-[9px] text-sage">{relativeTime(item.created_at)}</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="px-4 py-8 text-center text-xs text-muted">You're all caught up.</p>
        )}
      </div>
    </motion.div>
  );
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ items: NotificationItem[]; unread_count: number }>("/api/notifications"),
    refetchInterval: 45_000,
  });

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotificationsOpen(false);
      if (userRef.current && !userRef.current.contains(event.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[258px] bg-ink lg:block">
        <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-forest-700/20 blur-3xl" />
        <div className="relative h-full">
          <SidebarContent />
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 w-[280px] bg-ink"
            >
              <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" />
              <div className="relative h-full">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[258px]">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-line bg-cream p-2 text-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="hidden items-center gap-2 text-[11px] text-sage sm:flex">
              <span className="font-medium">Workspace</span>
              <span className="text-line">/</span>
              <span className="font-semibold text-ink">{getTitle(location.pathname)}</span>
            </div>
            <div className="flex-1 lg:hidden">
              <p className="text-[13px] font-semibold text-ink">{getTitle(location.pathname)}</p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden xl:block">
                <AIStatusPill />
              </div>
              <kbd className="hidden items-center gap-1 rounded-lg border border-line bg-cream px-2 py-1.5 text-[10px] font-medium text-sage xl:flex">
                <Command size={10} /> K
              </kbd>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/app/manager")}
                className="hidden sm:inline-flex"
              >
                <Sparkles size={13} /> New workflow
              </Button>
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotificationsOpen((value) => !value)}
                  className="relative rounded-xl border border-line bg-cream p-2 text-muted transition hover:text-ink"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  {(notifications?.unread_count || 0) > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white ring-2 ring-paper">
                      {notifications?.unread_count}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notificationsOpen && <NotificationsMenu onClose={() => setNotificationsOpen(false)} />}
                </AnimatePresence>
              </div>
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-xl border border-line bg-cream py-1 pl-1 pr-2 transition hover:border-forest-200"
                >
                  <Avatar name={user?.full_name} color={user?.avatar_color} size={28} />
                  <ChevronDown size={12} className="text-sage" />
                </button>
                <AnimatePresence>
                  {userOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-line bg-cream p-1.5 shadow-lift"
                    >
                      <div className="px-3 py-2.5">
                        <p className="text-xs font-semibold text-ink">{user?.full_name}</p>
                        <p className="truncate text-[10px] text-muted">{user?.email}</p>
                      </div>
                      <div className="my-1 h-px bg-line" />
                      <Link
                        to="/app/settings"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium text-ink hover:bg-paper"
                      >
                        <Settings size={13} /> Workspace settings
                      </Link>
                      <Link
                        to="/"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium text-ink hover:bg-paper"
                      >
                        <ExternalLink size={13} /> Public site
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut size={13} /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-forest-50/40 to-transparent" />
          <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
