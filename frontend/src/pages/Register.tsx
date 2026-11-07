import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Building2, KeyRound, Mail, UserRound } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, Input, Label } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    business_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        business_name: form.business_name || undefined,
      });
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create the workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Start with a provisioned catalog, two customers and a working AI manager. No setup calls required."
      footer={
        <>
          Already have a workspace?{" "}
          <Link to="/login" className="font-semibold text-forest-700 hover:text-forest-900">
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] leading-5 text-rose-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="name">Your name</Label>
          <div className="relative">
            <UserRound size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
            <Input id="name" required value={form.full_name} onChange={update("full_name")} placeholder="Maya Chen" className="pl-9" />
          </div>
        </div>
        <div>
          <Label htmlFor="business">Business name <span className="font-normal text-sage">(optional)</span></Label>
          <div className="relative">
            <Building2 size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
            <Input id="business" value={form.business_name} onChange={update("business_name")} placeholder="Northwind Supply Co." className="pl-9" />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
            <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={update("email")} placeholder="you@company.com" className="pl-9" />
          </div>
        </div>
        <div>
          <Label htmlFor="password" hint="At least 8 characters">Password</Label>
          <div className="relative">
            <KeyRound size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create workspace <ArrowRight size={15} />
        </Button>
      </form>

      <p className="mt-5 text-[10px] leading-5 text-sage">
        By creating an account you accept the demo terms. This is a hackathon build; use
        a unique password and do not enter production secrets.
      </p>
    </AuthLayout>
  );
}
