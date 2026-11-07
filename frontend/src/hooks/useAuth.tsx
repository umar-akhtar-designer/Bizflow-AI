import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "@/lib/api";
import type { AuthPayload, Business, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  business: Business | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    business_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
    setBusiness(null);
    setRole(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setBusiness(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<{ user: User; business: Business; role: string }>("/api/auth/me");
      setUser(data.user);
      setBusiness(data.business);
      setRole(data.role);
    } catch {
      clear();
    } finally {
      setLoading(false);
    }
  }, [clear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => clear();
    window.addEventListener("bizflow:unauthorized", handler);
    return () => window.removeEventListener("bizflow:unauthorized", handler);
  }, [clear]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthPayload>("/api/auth/login", { email, password });
    setToken(data.access_token);
    setUser(data.user);
    setBusiness(data.business);
    setRole(data.role);
  }, []);

  const register = useCallback(
    async (payload: { full_name: string; email: string; password: string; business_name?: string }) => {
      const data = await api.post<AuthPayload>("/api/auth/register", payload);
      setToken(data.access_token);
      setUser(data.user);
      setBusiness(data.business);
      setRole(data.role);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* ignore */
    }
    clear();
  }, [clear]);

  const value = useMemo(
    () => ({ user, business, role, loading, login, register, logout, refresh }),
    [user, business, role, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
