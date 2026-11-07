import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, AlertCircle, KeyRound, Mail, Sparkles } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, Input, Label } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

const DEMO_EMAIL = "demo@bizflow.ai";
const DEMO_PASSWORD = "demo1234";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const demo = params.get("demo") === "1";
  const [email, setEmail] = useState(demo ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(demo ? DEMO_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    if (demo) {
      setEmail(DEMO_EMAIL);
      setPassword(DEMO_PASSWORD);
    }
  }, [demo]);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setError(null);
    setDemoLoading(true);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Demo workspace is not seeded yet");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your operations workspace. The demo workspace is already seeded with real orders, invoices and agent runs."
      footer={
        <>
          New to BizFlow?{" "}
          <Link to="/register" className="font-semibold text-forest-700 hover:text-forest-900">
            Create a workspace
          </Link>
        </>
      }
    >
      <button
        onClick={demoLogin}
        disabled={demoLoading}
        className="group flex w-full items-center justify-between rounded-2xl border border-forest-200 bg-gradient-to-r from-forest-50 to-cream p-4 text-left transition hover:border-forest-300 hover:shadow-soft disabled:opacity-60"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-600 text-white">
            <Sparkles size={16} />
          </span>
          <span>
            <span className="block text-[12px] font-semibold text-ink">Enter the demo workspace</span>
            <span className="mt-0.5 block font-mono text-[9.5px] text-muted">demo@bizflow.ai · demo1234</span>
          </span>
        </span>
        <ArrowRight size={15} className="text-forest-700 transition group-hover:translate-x-0.5" />
      </button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-sage">or sign in manually</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] leading-5 text-rose-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="password" hint="8+ characters">Password</Label>
          <div className="relative">
            <KeyRound size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in <ArrowRight size={15} />
        </Button>
      </form>

      <p className="mt-5 text-[10px] leading-5 text-sage">
        Protected routes use short-lived JWT sessions. Passwords are hashed with bcrypt and
        never stored in plain text.
      </p>
    </AuthLayout>
  );
}
