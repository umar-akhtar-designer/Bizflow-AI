export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_color: string;
  created_at?: string;
  last_login_at?: string | null;
}

export interface Business {
  id: string;
  name: string;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  currency: string;
  tax_rate: number;
  low_stock_threshold: number;
  invoice_prefix?: string;
  ai_provider?: string;
  ai_model?: string | null;
}

export interface AuthPayload {
  access_token: string;
  token_type: string;
  user: User;
  business: Business;
  role: string;
}

export interface AIStatus {
  mode: "vultr" | "deterministic" | string;
  provider: string;
  model: string | null;
  available: boolean;
  label: string;
}

export interface AgentProfile {
  key: string;
  name: string;
  role: string;
  description: string;
  color: string;
  initials: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  category_id?: string | null;
  category?: string | null;
  category_color?: string | null;
  price: number;
  cost: number;
  margin_pct: number;
  stock_quantity: number;
  reorder_level: number;
  unit: string;
  status: string;
  stock_status: "healthy" | "low" | "out";
  created_at?: string;
  updated_at?: string;
  movements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  stock_after: number;
  reason: string;
  reference?: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  product_count: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  order_count: number;
  lifetime_value: number;
  outstanding: number;
  last_order_at?: string | null;
  created_at?: string;
}

export interface CustomerDetail extends Customer {
  orders: Order[];
  invoices: Invoice[];
  timeline: { type: string; title: string; detail: string; at: string }[];
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_company?: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  channel: string;
  notes?: string | null;
  workflow_id?: string | null;
  invoice_id?: string | null;
  invoice_status?: string | null;
  created_at: string;
  items?: OrderItem[];
  invoice?: Invoice | null;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  reference?: string | null;
  status: string;
  paid_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_company?: string | null;
  order_id?: string | null;
  order_number?: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance: number;
  currency: string;
  due_date?: string | null;
  issued_at: string;
  paid_at?: string | null;
  workflow_id?: string | null;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface WorkflowTask {
  id: string;
  sequence: number;
  agent: string;
  action: string;
  title: string;
  description?: string | null;
  status: string;
  input: Record<string, unknown>;
  result: Record<string, any>;
  error?: string | null;
  verified: boolean;
  verification_note?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface AgentExecution {
  id: string;
  agent: string;
  tool: string;
  status: string;
  latency_ms: number;
  tokens_used: number;
  output: Record<string, unknown>;
  error?: string | null;
  created_at: string;
}

export interface Workflow {
  id: string;
  instruction: string;
  intent: string;
  status: string;
  summary?: string | null;
  error?: string | null;
  verification_status: string;
  ai_mode: string;
  ai_model?: string | null;
  tokens_used: number;
  duration_ms?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
  task_count: number;
  completed_tasks: number;
  approval_ids: string[];
  plan: PlanStep[];
  tasks?: WorkflowTask[];
  executions?: AgentExecution[];
  approvals?: Approval[];
  orders?: Order[];
  invoices?: Invoice[];
  step_delay_ms?: number;
}

export interface PlanStep {
  action: string;
  agent: string;
  title: string;
  description: string;
  params?: Record<string, unknown>;
  atomic_group?: string;
}

export interface Approval {
  id: string;
  workflow_id?: string | null;
  action_type: string;
  title: string;
  description: string;
  payload: Record<string, any>;
  status: string;
  requested_by?: string | null;
  requested_at: string;
  decided_at?: string | null;
  decided_by?: string | null;
  decision_note?: string | null;
}

export interface DashboardData {
  metrics: {
    revenue: number;
    orders: number;
    customers: number;
    inventory_value: number;
    pending_invoices_amount: number;
    pending_invoices_count: number;
    pending_approvals: number;
    low_stock_count: number;
    today_revenue: number;
    today_orders: number;
    revenue_change_pct: number;
  };
  workflow_stats: {
    total: number;
    completed: number;
    failed: number;
    success_rate: number;
  };
  revenue_series: { date: string; revenue: number; orders: number }[];
  category_breakdown: { name: string; value: number }[];
  low_stock: {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    reorder_level: number;
    price: number;
  }[];
  recent_workflows: {
    id: string;
    instruction: string;
    status: string;
    intent: string;
    verification_status: string;
    duration_ms?: number | null;
    created_at: string;
    summary?: string | null;
  }[];
  recent_activity: {
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    detail: Record<string, unknown>;
    created_at: string;
  }[];
  business: { name: string; currency: string; tax_rate: number };
  ai: AIStatus;
}

export interface ReportSummary {
  period_days: number;
  generated_at: string;
  metrics: {
    revenue: number;
    previous_revenue: number;
    revenue_change_pct: number;
    orders: number;
    average_order_value: number;
    outstanding: number;
    low_stock_count: number;
    units_sold: number;
  };
  series: { date: string; revenue: number; orders: number }[];
  top_products: { name: string; units: number; revenue: number }[];
  low_stock: DashboardData["low_stock"];
  insights: string[];
  source: string;
  ai: { text: string; source: string; label: string; model: string | null };
  ai_status: AIStatus;
  business: { name: string; currency: string };
}

export interface FinanceSummary {
  total_billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
  open_invoices: number;
  paid_invoices: number;
  aging: { current: number; "1-30": number; "31-60": number; "60+": number };
  monthly_series: { month: string; billed: number; collected: number }[];
  refunds: number;
  net_revenue: number;
  recent_payments: Payment[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  level: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SettingsData {
  business: Business;
  user: User;
  role: string;
  ai: AIStatus;
}

export interface SalesAnalytics {
  period_days: number;
  revenue: number;
  orders: number;
  average_order_value: number;
  series: { date: string; revenue: number; orders: number }[];
  top_products: { name: string; units: number; revenue: number }[];
  status_breakdown: { name: string; value: number }[];
  channel_breakdown: { name: string; value: number }[];
}
