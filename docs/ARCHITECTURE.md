# Architecture

BizFlow AI is a two-tier application: a React SPA and a FastAPI service backed by SQLAlchemy. The intelligence layer is an **orchestrator**, not a free-roaming agent: it plans with a deterministic parser (optionally refined by Vultr Serverless Inference), executes only registered tools, and verifies persisted records before reporting success.

## Runtime topology

```
Browser
  │  HTTPS
  ▼
Nginx (SPA static files + /api reverse proxy)
  │
  ▼
FastAPI (uvicorn)
  ├── API routers ──────────────► services (orders, payments, refunds, reporting)
  ├── Orchestrator ─────────────► tool registry ──► services
  ├── Audit / notifications
  └── SQLAlchemy ───────────────► PostgreSQL (deployment) / SQLite (demo)
```

Local development can serve the built SPA directly from FastAPI (`frontend/dist`) or run Vite on port 5173 with `/api` proxied to port 8000.

## Backend modules

| Module | Responsibility |
| --- | --- |
| `app/api/*` | HTTP routes, request validation, tenant scoping |
| `app/core/security.py` | bcrypt hashing, JWT issue/verify |
| `app/core/config.py` | Environment configuration, Vultr settings, AI mode |
| `app/models/*` | 19 SQLAlchemy tables (users, catalog, sales, finance, workflows, audit) |
| `app/orchestration/planner.py` | Intent + entity extraction, plan construction |
| `app/orchestration/executor.py` | Background execution loop, atomic groups, failure state |
| `app/orchestration/tools.py` | Fixed tool registry, approval creation, verification checks |
| `app/orchestration/llm.py` | Vultr-compatible chat completions with retries/timeouts |
| `app/services/orders.py` | Order, stock, sale, invoice and payment transactions |
| `app/services/reporting.py` | Dashboard/report SQL aggregations |
| `app/services/seed.py` | Demo workspace and starter catalog provisioning |
| `app/services/audit.py` | Append-only audit helper and notifications |

## Workflow lifecycle

```
POST /api/workflows
   │
   ├─ Planner resolves customer/product entities from the workspace
   ├─ Intent classified (order, restock, report, refund, message, …)
   ├─ Ordered plan persisted with one WorkflowTask per step
   ├─ 202 returned immediately
   └─ Background task starts execution

Executor
   ├─ Workflow status: queued → running
   ├─ For each step: mark running → call tool → persist output → mark completed
   ├─ Atomic group (order core): all steps share one transaction
   │     ├─ success → commit once
   │     └─ failure → rollback, mark prior steps rolled_back, rest skipped
   ├─ Verification steps re-read persisted rows
   └─ Status: completed | failed
        verification_status: verified | read_only | failed | pending
```

The frontend polls the workflow detail endpoint every 650–700 ms while a run is in flight, which drives the live execution timeline.

## Order-to-cash invariants

The order core is the highest-risk path, so it is deliberately narrow:

1. Resolve customer and product inside the tenant.
2. Validate quantity and stock **before** any write.
3. Begin the atomic group:
   - conditional `UPDATE products SET stock = stock - qty WHERE stock >= qty`
   - insert `orders`, `order_items`
   - insert `inventory_movements`
   - insert `sales`
   - insert `invoices`, `invoice_items`
4. Commit once. Any failure rolls back the whole group.
5. Verification re-reads the order, item count, invoice, sale, stock and movement, then marks the workflow verified.

The conditional stock update means two concurrent requests cannot oversell the same units. The failed workflow records the failing step and skips later steps; it never reports success.

## Approval model

Actions with external or financial side effects are split into **prepare** and **execute**:

| Action | Preparation | Execution on approval |
| --- | --- | --- |
| `send_customer_message` | Draft subject/body, resolve recipient, create approval | Queue in demo outbox, audit, notify |
| `refund_invoice` | Validate invoice and amount, create approval | Insert negative payment, update invoice status |
| `restock_products` | Compute low-stock items and recommended quantities, create approval | Increment stock, insert inbound movements |

Approvals record `requested_by`, `requested_at`, `decided_by`, `decided_at` and a decision note. A decided request returns HTTP 409 if acted on again. The payload stores a `delivery_status` so the UI can distinguish *prepared* from *executed*.

## Verification

Verification is a read-back, not a boolean flag set by the write path:

- Order workflow checks the order exists with the expected item quantity and total, the invoice exists, the sale exists and stock equals the expected value.
- Read-only workflows (reports, inventory audits) are labeled `read_only`, never `verified`.
- A workflow may only become `completed` with `verification_status=verified` if a verification step actually passed.
- If verification fails, the workflow fails; the UI shows the error and the records remain auditable.

## AI provider abstraction

```
settings.ai_provider = "auto" (default)
   ├─ VULTR_INFERENCE_API_KEY present → Vultr Serverless Inference
   └─ no key / provider=deterministic → deterministic planner
```

- `GET /api/health`, `/api/agents` and `/api/settings` expose an honest status object: mode, provider, model, availability and a human label.
- The deterministic planner always works; it extracts intent, customer, product, quantity, amounts and message topics with rules.
- The Vultr model, when enabled, is constrained to returning structured intent/entities and report narratives. It cannot emit SQL and cannot call arbitrary tools.
- LLM calls have a configurable timeout and retry count; failures fall back safely and are logged.

## Multi-tenancy and security

- Every authenticated request resolves `user → membership → business`.
- Reads and writes are filtered by `business_id`; foreign IDs return 404 rather than leaking existence.
- Passwords use bcrypt with per-password salts; hashes are never serialized.
- JWTs are signed with `JWT_SECRET`; production startup warns if the development placeholder is in use.
- The API applies a sliding-window rate limit, security headers, CORS allow-list and a generic 500 handler that does not leak internals.
- Audit entries record actor, action, entity and metadata; notifications are persisted per workspace.
- Idempotency keys are unique per business for orders and workflows.

## Data model (summary)

- **Identity:** `users`, `businesses`, `business_memberships`
- **Catalog:** `product_categories`, `products`, `inventory_movements`
- **Sales:** `customers`, `orders`, `order_items`, `sales`
- **Finance:** `invoices`, `invoice_items`, `payments`
- **Orchestration:** `workflows`, `workflow_tasks`, `agent_executions`, `approval_requests`
- **Operations:** `audit_logs`, `notifications`

All primary keys are UUID strings. Money uses `Float` with deterministic two-decimal rounding at service boundaries; a production ledger would move to integer minor units or `NUMERIC`.

## Scaling notes

The current architecture is deliberately simple and single-process friendly:

- Background workflows run in FastAPI background tasks. For horizontal scaling, move execution to a durable queue (Celery/RQ/Arq) and keep the same executor contract.
- The rate limiter is in-process. Use Redis for multi-worker deployments.
- Database sessions are per request; PostgreSQL with `pool_pre_ping` is the deployment target.
- The SPA is static and cacheable; API responses are not cached.
