import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpDown,
  ArrowUpFromLine,
  Boxes,
  CircleDollarSign,
  Layers,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  KeyValue,
  Label,
  Modal,
  ProgressBar,
  SectionTitle,
  Select,
  Skeleton,
  Tabs,
  Textarea,
} from "@/components/ui";
import { StatusBadge } from "@/components/Badges";
import { StatCard, MiniStat } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { cn, compactMoney, formatDate, money, number, percent } from "@/lib/utils";
import type { Category, Product } from "@/types";

interface ProductForm {
  name: string;
  sku: string;
  price: string;
  cost: string;
  stock_quantity: string;
  reorder_level: string;
  category_id: string;
  description: string;
}

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  price: "",
  cost: "",
  stock_quantity: "0",
  reorder_level: "10",
  category_id: "",
  description: "",
};

function StockBar({ product }: { product: Product }) {
  const target = Math.max(product.reorder_level * 2, 1);
  const pct = Math.min((product.stock_quantity / target) * 100, 100);
  const tone =
    product.stock_status === "out" ? "rose" : product.stock_status === "low" ? "amber" : "forest";
  return (
    <div className="w-full max-w-[130px]">
      <div className="flex items-baseline justify-between">
        <span
          className={cn(
            "font-mono text-[11px] font-semibold",
            product.stock_status === "out"
              ? "text-rose-600"
              : product.stock_status === "low"
              ? "text-amber-700"
              : "text-ink"
          )}
        >
          {product.stock_quantity}
        </span>
        <span className="font-mono text-[8.5px] text-sage">reorder {product.reorder_level}</span>
      </div>
      <ProgressBar value={pct} tone={tone as "forest" | "amber" | "rose"} className="mt-1" />
    </div>
  );
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tab, setTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjust, setAdjust] = useState({ movement_type: "in", quantity: "1", reason: "" });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<{ items: Category[] }>("/api/categories"),
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["inventory", search, category, tab],
    queryFn: () =>
      api.get<{ items: Product[]; total: number }>("/api/products", {
        search: search || undefined,
        category_id: category || undefined,
        low_stock: tab === "low" ? true : undefined,
      }),
    refetchInterval: 30_000,
  });

  const { data: detail } = useQuery({
    queryKey: ["product", selected?.id],
    queryFn: () => api.get<Product>(`/api/products/${selected?.id}`),
    enabled: Boolean(selected?.id),
  });

  const items = data?.items || [];
  const allItems = useMemo(() => {
    if (tab === "out") return items.filter((item) => item.stock_status === "out");
    if (tab === "healthy") return items.filter((item) => item.stock_status === "healthy");
    return items;
  }, [items, tab]);

  const stats = useMemo(() => {
    const rows = data?.items || [];
    const units = rows.reduce((sum, item) => sum + item.stock_quantity, 0);
    const value = rows.reduce((sum, item) => sum + item.price * item.stock_quantity, 0);
    const cost = rows.reduce((sum, item) => sum + item.cost * item.stock_quantity, 0);
    const low = rows.filter((item) => item.stock_status !== "healthy").length;
    const avgMargin = rows.length
      ? rows.reduce((sum, item) => sum + item.margin_pct, 0) / rows.length
      : 0;
    return { units, value, cost, low, avgMargin, total: rows.length };
  }, [data]);

  const createProduct = useMutation({
    mutationFn: () =>
      api.post<Product>("/api/products", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price: Number(form.price),
        cost: Number(form.cost || 0),
        stock_quantity: Number(form.stock_quantity || 0),
        reorder_level: Number(form.reorder_level || 10),
        category_id: form.category_id || null,
        description: form.description || null,
      }),
    onSuccess: (product) => {
      push("Product created", `${product.name} · ${product.sku}`, "success");
      setCreateOpen(false);
      setForm(emptyForm);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const adjustStock = useMutation({
    mutationFn: () =>
      api.post<Product>(`/api/products/${selected?.id}/stock`, {
        movement_type: adjust.movement_type,
        quantity: Number(adjust.quantity),
        reason: adjust.reason.trim(),
      }),
    onSuccess: (product) => {
      push("Stock adjusted", `${product.name} is now at ${product.stock_quantity} units.`, "success");
      setAdjustOpen(false);
      setAdjust({ movement_type: "in", quantity: "1", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => push("Adjustment failed", error.message, "error"),
  });

  const openAdjust = (product: Product) => {
    setSelected(product);
    setAdjust({ movement_type: "in", quantity: "10", reason: "Manual replenishment" });
    setAdjustOpen(true);
  };

  const submitProduct = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      setFormError("Name and SKU are required.");
      return;
    }
    if (Number(form.price) < 0 || Number.isNaN(Number(form.price))) {
      setFormError("Price must be a non-negative number.");
      return;
    }
    createProduct.mutate();
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Stock control"
        title="Inventory"
        description="Live quantities, reorder risk and a complete movement ledger. Every stock change is a persisted record."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching && !isLoading}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PackagePlus size={13} /> Add product
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Catalog" value={number(stats.total)} hint="active products" icon={<Package size={15} />} accent="forest" />
        <StatCard index={1} label="Units in stock" value={number(stats.units)} hint="across all SKUs" icon={<Boxes size={15} />} accent="blue" />
        <StatCard index={2} label="Retail value" value={compactMoney(stats.value)} hint={`cost ${compactMoney(stats.cost)}`} icon={<CircleDollarSign size={15} />} accent="violet" />
        <StatCard index={3} label="Needs attention" value={number(stats.low)} hint="at or below reorder" icon={<TriangleAlert size={15} />} accent="amber" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Gross margin" value={percent(stats.avgMargin)} tone="forest" />
        <MiniStat label="Low stock" value={`${items.filter((i) => i.stock_status === "low").length} SKU(s)`} tone="amber" />
        <MiniStat label="Out of stock" value={`${items.filter((i) => i.stock_status === "out").length} SKU(s)`} tone="rose" />
        <MiniStat label="Categories" value={String(categoriesData?.items.length || 0)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "All products", count: items.length },
            { value: "low", label: "Low stock" },
            { value: "out", label: "Out of stock" },
            { value: "healthy", label: "Healthy" },
          ]}
        />
        <div className="flex flex-1 items-center gap-2 lg:max-w-md">
          <div className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or SKU…" className="pl-8" />
          </div>
          <div className="relative">
            <Layers size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sage" />
            <Select value={category} onChange={(event) => setCategory(event.target.value)} className="min-w-[150px] pl-7 text-[11px]">
              <option value="">All categories</option>
              {categoriesData?.items.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : isError ? (
        <Card className="p-10">
          <EmptyState icon={AlertTriangle} title="Could not load inventory" description="Check the API connection and retry." action={<Button onClick={() => refetch()}><RefreshCw size={13} /> Retry</Button>} />
        </Card>
      ) : allItems.length === 0 ? (
        <Card className="p-10">
          <EmptyState icon={Package} title="No products found" description="Adjust the filters or add a product to the catalog." action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={13} /> Add product</Button>} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden items-center gap-4 border-b border-line bg-paper/50 px-5 py-2.5 text-[9px] font-bold uppercase tracking-wider text-sage md:flex">
            <span className="flex-1">Product</span>
            <span className="w-[150px]">Stock</span>
            <span className="w-[90px] text-right">Price</span>
            <span className="w-[80px] text-right">Margin</span>
            <span className="w-[110px] text-right">Actions</span>
          </div>
          <div className="divide-y divide-line/70">
            {allItems.map((product) => (
              <div
                key={product.id}
                className="group flex flex-col gap-3 px-4 py-3.5 transition hover:bg-paper/40 sm:px-5 md:flex-row md:items-center md:gap-4"
              >
                <button
                  onClick={() => setSelected(product)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      product.stock_status === "out"
                        ? "bg-rose-50 text-rose-600"
                        : product.stock_status === "low"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-forest-50 text-forest-700"
                    )}
                  >
                    <Package size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-semibold text-ink group-hover:text-forest-800">
                      {product.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <code className="font-mono text-[8.5px] text-sage">{product.sku}</code>
                      {product.category && (
                        <span className="inline-flex items-center gap-1 text-[8.5px] text-muted">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: product.category_color || "#68716C" }} />
                          {product.category}
                        </span>
                      )}
                      {product.stock_status !== "healthy" && (
                        <StatusBadge status={product.stock_status} dot={false} className="px-1.5 py-0.5 text-[8px]" />
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-4 md:contents">
                  <div className="w-[150px] shrink-0">
                    <StockBar product={product} />
                  </div>
                  <div className="w-[90px] shrink-0 text-right">
                    <p className="font-mono text-[10.5px] font-semibold text-ink">{money(product.price)}</p>
                    <p className="font-mono text-[8.5px] text-sage">cost {money(product.cost)}</p>
                  </div>
                  <div className="hidden w-[80px] shrink-0 text-right md:block">
                    <p className={cn("font-mono text-[10.5px] font-semibold", product.margin_pct >= 40 ? "text-forest-700" : "text-amber-700")}>
                      {percent(product.margin_pct)}
                    </p>
                  </div>
                  <div className="ml-auto flex w-[110px] shrink-0 items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openAdjust(product)} title="Adjust stock">
                      <ArrowUpDown size={12} /> Adjust
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add a product"
        description="Creates a real catalog record. Opening stock is written to the movement ledger."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submitProduct} loading={createProduct.isPending}>
              <PackagePlus size={13} /> Create product
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10.5px] leading-5 text-rose-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {formError}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="product-name">Product name</Label>
              <Input id="product-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aurora Desk Lamp" />
            </div>
            <div>
              <Label htmlFor="product-sku">SKU</Label>
              <Input id="product-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="AUR-310" />
            </div>
            <div>
              <Label htmlFor="product-category">Category</Label>
              <Select id="product-category" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Uncategorised</option>
                {categoriesData?.items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="product-price">Selling price</Label>
              <Input id="product-price" type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="89.00" />
            </div>
            <div>
              <Label htmlFor="product-cost">Unit cost</Label>
              <Input id="product-cost" type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="41.00" />
            </div>
            <div>
              <Label htmlFor="product-stock">Opening stock</Label>
              <Input id="product-stock" type="number" min={0} step="1" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="product-reorder">Reorder level</Label>
              <Input id="product-reorder" type="number" min={0} step="1" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="product-description" hint="Optional">Description</Label>
              <Textarea id="product-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this product is and who it is for…" />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Adjust stock"
        description={selected ? `${selected.name} — currently ${selected.stock_quantity} units` : undefined}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => adjustStock.mutate()}
              loading={adjustStock.isPending}
              disabled={!adjust.reason.trim() || Number(adjust.quantity) <= 0}
            >
              <ArrowUpDown size={13} /> Apply adjustment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "in", label: "Receive", icon: ArrowDownToLine },
              { value: "out", label: "Remove", icon: ArrowUpFromLine },
              { value: "adjustment", label: "Set exact", icon: SlidersHorizontal },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setAdjust({ ...adjust, movement_type: option.value })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-[10px] font-semibold transition",
                    adjust.movement_type === option.value
                      ? "border-forest-400 bg-forest-50 text-forest-800"
                      : "border-line bg-white text-muted hover:border-forest-200"
                  )}
                >
                  <Icon size={15} />
                  {option.label}
                </button>
              );
            })}
          </div>
          <div>
            <Label htmlFor="adjust-qty" hint={adjust.movement_type === "adjustment" ? "Final quantity" : "Units"}>
              Quantity
            </Label>
            <Input id="adjust-qty" type="number" min={1} value={adjust.quantity} onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="adjust-reason">Reason</Label>
            <Input id="adjust-reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} placeholder="Received supplier delivery" />
          </div>
          <p className="flex items-start gap-1.5 text-[9.5px] leading-4 text-sage">
            <Settings2 size={11} className="mt-0.5 shrink-0" />
            Adjustments write an inventory movement and an audit log entry. Removing more than the
            available quantity is rejected.
          </p>
        </div>
      </Modal>

      <Drawer
        open={Boolean(selected) && !adjustOpen}
        onClose={() => setSelected(null)}
        title={selected?.name || "Product"}
        subtitle={selected ? `${selected.sku} · ${selected.category || "Uncategorised"}` : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-paper/60 p-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-sage">Current stock</p>
                <p className="mt-1 font-mono text-[28px] font-semibold tracking-tight text-ink">
                  {detail?.stock_quantity ?? selected.stock_quantity}
                  <span className="ml-1 text-[11px] font-normal text-sage">units</span>
                </p>
                <p className="mt-0.5 text-[9.5px] text-muted">Reorder level {selected.reorder_level}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={selected.stock_status} />
                <p className="mt-2 font-mono text-[13px] font-semibold text-ink">{money(selected.price)}</p>
                <p className="font-mono text-[9px] text-sage">cost {money(selected.cost)}</p>
              </div>
            </div>

            {selected.description && (
              <p className="text-[11px] leading-6 text-muted">{selected.description}</p>
            )}

            <div className="rounded-2xl border border-line bg-cream px-4 py-2">
              <KeyValue label="SKU" value={selected.sku} />
              <KeyValue label="Category" value={selected.category || "—"} />
              <KeyValue label="Gross margin" value={percent(selected.margin_pct)} />
              <KeyValue label="Inventory value" value={money(selected.price * selected.stock_quantity)} />
              <KeyValue label="Status" value={selected.status} />
              <KeyValue label="Updated" value={formatDate(selected.updated_at, true)} />
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => openAdjust(selected)}>
                <ArrowUpDown size={13} /> Adjust stock
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelected(null);
                  window.location.href = `/app/manager?prompt=${encodeURIComponent(
                    `Prepare an order for 1 unit of ${selected.name} for Ahmed Raza.`
                  )}`;
                }}
              >
                <Package size={13} /> Sell with AI
              </Button>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold text-ink">Movement ledger</p>
              <div className="divide-y divide-line/60 rounded-xl border border-line bg-cream">
                {detail?.movements?.length ? (
                  detail.movements.map((movement) => (
                    <div key={movement.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                          movement.movement_type === "in"
                            ? "bg-forest-50 text-forest-700"
                            : movement.movement_type === "out"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-amber-50 text-amber-700"
                        )}
                      >
                        {movement.movement_type === "in" ? (
                          <ArrowDownToLine size={11} />
                        ) : movement.movement_type === "out" ? (
                          <ArrowUpFromLine size={11} />
                        ) : (
                          <ArrowUpDown size={11} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-medium text-ink">{movement.reason}</p>
                        <p className="text-[8.5px] text-sage">
                          {movement.reference || "manual"} · {formatDate(movement.created_at, true)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-mono text-[10px] font-semibold", movement.quantity >= 0 ? "text-forest-700" : "text-rose-600")}>
                          {movement.quantity >= 0 ? "+" : ""}{movement.quantity}
                        </p>
                        <p className="font-mono text-[8.5px] text-sage">→ {movement.stock_after}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-center text-[10px] text-muted">No movements recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
