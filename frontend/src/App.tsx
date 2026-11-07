import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Manager = lazy(() => import("@/pages/Manager"));
const Workflows = lazy(() => import("@/pages/Workflows"));
const WorkflowDetail = lazy(() => import("@/pages/WorkflowDetail"));
const Approvals = lazy(() => import("@/pages/Approvals"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Orders = lazy(() => import("@/pages/Orders"));
const OrderDetail = lazy(() => import("@/pages/OrderDetail"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerDetail = lazy(() => import("@/pages/CustomerDetail"));
const Finance = lazy(() => import("@/pages/Finance"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));

const titles: Record<string, string> = {
  "/": "BizFlow AI — Autonomous business operations",
  "/login": "Sign in · BizFlow AI",
  "/register": "Create workspace · BizFlow AI",
  "/app": "Overview · BizFlow AI",
  "/app/manager": "AI Business Manager · BizFlow AI",
  "/app/workflows": "Workflows · BizFlow AI",
  "/app/approvals": "Approvals · BizFlow AI",
  "/app/inventory": "Inventory · BizFlow AI",
  "/app/orders": "Orders & sales · BizFlow AI",
  "/app/customers": "Customers · BizFlow AI",
  "/app/finance": "Finance · BizFlow AI",
  "/app/reports": "Reports · BizFlow AI",
  "/app/settings": "Settings · BizFlow AI",
};

function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    const path = location.pathname;
    if (titles[path]) {
      document.title = titles[path];
    } else if (path.startsWith("/app/workflows/")) {
      document.title = "Workflow detail · BizFlow AI";
    } else if (path.startsWith("/app/orders/")) {
      document.title = "Order detail · BizFlow AI";
    } else if (path.startsWith("/app/customers/")) {
      document.title = "Customer profile · BizFlow AI";
    } else {
      document.title = "BizFlow AI";
    }
  }, [location.pathname]);
  return null;
}

function FullScreenLoader({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper">
      <Logo />
      <div className="flex items-center gap-2 text-[11px] font-medium text-muted">
        <Loader2 size={14} className="animate-spin text-forest-600" />
        {label}
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-[shimmer_1.4s_linear_infinite] rounded-full bg-forest-500" />
      </div>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader label="Checking session…" />;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-forest-700">404</p>
      <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-ink">
        This route doesn't exist
      </h1>
      <p className="mt-2 max-w-sm text-[12.5px] leading-6 text-muted">
        The page may have moved, or the link is incomplete. Head back to the workspace to keep going.
      </p>
      <div className="mt-5 flex gap-2">
        <a href="/app">
          <Button size="sm">Back to workspace</Button>
        </a>
        <a href="/">
          <Button variant="outline" size="sm">Public site</Button>
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <RouteEffects />
      <Suspense fallback={<FullScreenLoader label="Loading experience…" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />

          <Route
            path="/app"
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="manager" element={<Manager />} />
            <Route path="workflows" element={<Workflows />} />
            <Route path="workflows/:id" element={<WorkflowDetail />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
