# API reference

Base URL: `/api` · Interactive docs: `/api/docs` · OpenAPI: `/api/openapi.json`

All endpoints except `/auth/register`, `/auth/login`, `/health` and the API index require a bearer token:

```
Authorization: Bearer <access_token>
```

Errors use standard FastAPI shape:

```json
{ "detail": "Human-readable message" }
```

| Status | Meaning |
| --- | --- |
| 400 | Business/validation rule violation (safe to show the user) |
| 401 | Missing, invalid or expired token |
| 403 | No workspace linked to the account |
| 404 | Record not found **or belongs to another workspace** |
| 409 | Duplicate resource, or an approval already decided |
| 429 | Rate limit exceeded (`Retry-After: 60`) |

---

## Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create user + workspace + starter catalog |
| POST | `/auth/login` | Exchange credentials for a JWT |
| GET | `/auth/me` | Current user, business and role |
| POST | `/auth/logout` | Write an audit entry |

**Register**

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Maya Chen","email":"maya@example.com",
       "password":"strong-pass-123","business_name":"Northwind"}'
```

```json
{
  "access_token": "eyJ…",
  "token_type": "bearer",
  "user": { "id": "…", "email": "maya@example.com", "full_name": "Maya Chen" },
  "business": { "id": "…", "name": "Northwind", "currency": "USD", "tax_rate": 0 },
  "role": "owner"
}
```

Registration seeds four products, two customers and three categories so the workspace is usable immediately.

**Login**

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@bizflow.ai","password":"demo1234"}'
```

Save the token for the examples below:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@bizflow.ai","password":"demo1234"}' | jq -r .access_token)
```

---

## Dashboard and reports

| Method | Path | Description |
| --- | --- | --- |
| GET | `/dashboard` | Live KPIs, revenue series, workflow health, low stock, recent runs |
| GET | `/reports/summary?days=7` | Revenue, orders, AOV, top products, low stock, AI narrative |
| GET | `/reports/ai-insight?days=7` | Narrative + honest source/mode metadata |
| GET | `/sales/analytics?days=30` | Revenue series, top products, status/channel breakdown |

`/dashboard` and `/reports/summary` compute every value with SQL over persisted orders, sales, invoices, payments and workflows. No static demo numbers.

---

## Workflows

| Method | Path | Description |
| --- | --- | --- |
| GET | `/workflows?status=&intent=&limit=&offset=` | Audit list |
| POST | `/workflows` | Plan and start a workflow (202) |
| GET | `/workflows/{id}` | Full detail: plan, tasks, executions, approvals, orders, invoices |
| POST | `/workflows/{id}/retry` | Start a new run of the same instruction |

**Start an order-to-cash workflow**

```bash
curl -X POST http://127.0.0.1:8000/api/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "instruction": "Process an order for Ahmed Raza for 3 units of Product A, generate the invoice and prepare a confirmation message.",
    "idempotency_key": "demo-order-001"
  }'
```

Returns `202` with the workflow. Execution continues in a background task; poll the detail endpoint to watch progress.

Workflow statuses: `queued`, `running`, `completed`, `failed`.
Verification statuses: `pending`, `verified`, `read_only`, `failed`.

Task statuses: `pending`, `running`, `completed`, `failed`, `skipped`, `rolled_back`.

---

## Approvals

| Method | Path | Description |
| --- | --- | --- |
| GET | `/approvals?status=pending` | List approvals with prepared payloads |
| GET | `/approvals/{id}` | One approval |
| POST | `/approvals/{id}/approve` | Execute the prepared action (body: `{"note": "…"}`) |
| POST | `/approvals/{id}/reject` | Reject and audit (body: `{"note": "…"}`) |

Action types: `send_customer_message`, `refund_invoice`, `restock_products`.

Approving a message queues it in the **demo outbox** (`delivery_status=queued_demo_outbox`). No external email provider is called. Approving a restock increments stock and writes inbound movements. Rejection never mutates business records.

A second decision on a decided approval returns `409`.

---

## Inventory

| Method | Path | Description |
| --- | --- | --- |
| GET | `/products?search=&category_id=&low_stock=true&status=` | List products |
| GET | `/products/{id}` | Product + movement history |
| POST | `/products` | Create product (201) |
| PATCH | `/products/{id}` | Update metadata |
| POST | `/products/{id}/stock` | Adjust stock (`in`, `out`, `adjustment`) |
| GET | `/categories` | Categories with product counts |
| POST | `/categories` | Create category (201) |

**Adjust stock**

```bash
curl -X POST http://127.0.0.1:8000/api/products/$PRODUCT_ID/stock \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantity": 10, "movement_type": "in", "reason": "Supplier delivery"}'
```

Removing more than the available quantity returns `400` and leaves stock unchanged.

---

## Customers

| Method | Path | Description |
| --- | --- | --- |
| GET | `/customers?search=` | List with computed order value and balance |
| GET | `/customers/{id}` | Profile, orders, invoices, timeline |
| POST | `/customers` | Create (201) |
| PATCH | `/customers/{id}` | Update contact details / status |

---

## Orders and finance

| Method | Path | Description |
| --- | --- | --- |
| GET | `/orders?status=&search=&limit=&offset=` | List orders |
| GET | `/orders/{id}` | Order with items and invoice summary |
| POST | `/orders` | Create order + sale + invoice (201) |
| PATCH | `/orders/{id}/status` | Change status; cancellation restores stock |
| GET | `/invoices?status=&search=` | Invoice ledger with balances |
| GET | `/invoices/{id}` | Invoice + line items + payments |
| POST | `/invoices/{id}/payments` | Record payment (201) |
| GET | `/finance/summary` | Billed, collected, outstanding, overdue, aging |

**Create an order**

```bash
curl -X POST http://127.0.0.1:8000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "customer_id": "…",
    "items": [{"product_id": "…", "quantity": 2}],
    "idempotency_key": "order-demo-001"
  }'
```

The order, stock decrement, inventory movement, sale and invoice commit atomically. Insufficient stock returns `400` with zero records written.

**Record a payment**

```bash
curl -X POST http://127.0.0.1:8000/api/invoices/$INVOICE_ID/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"amount": 100.00, "method": "bank_transfer", "reference": "WIRE-42"}'
```

Partial payments set `status=partial`; a payment reaching the balance sets `status=paid` in the same transaction. Overpayment is rejected.

---

## Settings and notifications

| Method | Path | Description |
| --- | --- | --- |
| GET | `/settings` | Business, user, AI status, role |
| PATCH | `/settings` | Update identity, financial defaults, profile or AI preference |
| GET | `/ai/status` | Honest AI mode/provider/model object |
| GET | `/notifications` | Workspace notifications |
| POST | `/notifications/{id}/read` | Mark one read |
| POST | `/notifications/read-all` | Mark all read |

---

## Agents, health and meta

| Method | Path | Description |
| --- | --- | --- |
| GET | `/agents` | Agent roster + AI status |
| GET | `/health` | Service, database and AI health |
| GET | `/` (API root) | Service metadata |

**Health**

```json
{
  "status": "ok",
  "database": "ok",
  "service": "BizFlow AI",
  "environment": "production",
  "ai": {
    "mode": "deterministic",
    "provider": "Built-in deterministic planner",
    "model": null,
    "available": false,
    "label": "Demo mode: deterministic planner (no Vultr key configured)"
  }
}
```

When `VULTR_INFERENCE_API_KEY` is configured, `ai.mode` becomes `vultr` and the label reflects the live model. The label is never decorative: the planner reports the mode it actually used.
