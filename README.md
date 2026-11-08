# BizFlow AI

**Natural-language business operations with verified database writes and human control.**

BizFlow AI turns an instruction like *“Process an order for Ahmed Raza for 3 units of Product A, generate the invoice and prepare a confirmation message”* into a real, tool-bound multi-agent workflow. Every write is transactional, independently verified by reading the records back, and sensitive actions stop for human approval before they execute.

Built for the **Vultr Agent Rush 2026 — “Powering the Future of Work”** challenge.

---

## What makes it real

- **Real order-to-cash.** An order, stock decrement, inventory movement, sale and invoice are written in one atomic transaction. If stock is insufficient, every write is rolled back and the workflow fails safely.
- **Verification, not vibes.** After writes, agents re-read orders, invoices, stock and sales from the database. The UI only shows *Verified* when those checks pass.
- **Prepare ≠ execute.** Customer messages, refunds and restock purchases create an approval request with the prepared payload. Nothing external happens until a named human approves.
- **Every number comes from the database.** Dashboard, finance, inventory and report figures are SQL aggregations over persisted rows — no hardcoded demo statistics.
- **Honest AI labeling.** With a Vultr inference key the model refines intent and writes report narratives. Without one, a deterministic planner runs and the UI clearly says **Demo mode: deterministic planner (no Vultr key configured)**. The app never claims a model produced output it did not.
- **Production-shaped security.** JWT auth, bcrypt password hashing, tenant-scoped queries, rate limiting, security headers, idempotency keys, timeouts/retries and an append-only audit trail.

## Product surface

| Area | What it does |
| --- | --- |
| **AI Business Manager** | Instruction box → live execution timeline → verification → approval cards |
| **Overview** | Revenue trend, order health, workflow success, low stock, approvals, recent runs |
| **Workflows** | Filterable audit trail of every instruction, plan, tool call and decision |
| **Approvals** | Review prepared payloads, approve/reject with a note, see what actually executed |
| **Inventory** | Products, categories, stock adjustments, movement history, reorder risk |
| **Orders & sales** | Order list/detail, invoice linkage, revenue analytics, cancellation with stock restore |
| **Customers** | Profiles, lifetime value, balances, invoices and activity timeline |
| **Finance** | Receivables aging, invoice ledger, real payments with deterministic status transitions |
| **Reports** | Live operating report, top products, reorder risk, CSV export, honest narrative source |
| **Settings** | Business identity, financial defaults, profile, AI engine, security posture |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ React + TypeScript + Vite + Tailwind + TanStack Query + Framer      │
│ Landing · Dashboard · Manager · Workflows · Approvals · Finance …   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ /api (JWT bearer)
┌───────────────────────────────▼─────────────────────────────────────┐
│ FastAPI                                                             │
│  auth · dashboard · products · customers · orders · invoices        │
│  workflows · approvals · reports · settings · notifications         │
│  middleware: rate limit · security headers · CORS · error handling  │
├─────────────────────────────────────────────────────────────────────┤
│ Orchestrator                                                        │
│  Planner (deterministic intent/entity extraction + optional Vultr)  │
│  Executor (background loop, atomic groups, retries, failure state)  │
│  Tool registry (fixed, validated business operations — no raw SQL)  │
│  Agents: Inventory · Sales · Customer · Finance · Reporting          │
├─────────────────────────────────────────────────────────────────────┤
│ Services: orders · payments · refunds · restock · audit · reporting │
├─────────────────────────────────────────────────────────────────────┤
│ SQLAlchemy 2 · SQLite (local demo) or PostgreSQL (deployment)       │
└─────────────────────────────────────────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for execution flow and invariants.

## Quick start (local)

Prerequisites: Python 3.12+ and Node.js 20+.

Run these commands from the repository root.

```bash
# 1. Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt

# 2. Frontend build (FastAPI serves the built SPA)
cd frontend
npm ci
npm run build
cd ..

# 3. Run
cd backend
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000**.

Demo credentials:

```
Email:    demo@bizflow.ai
Password: demo1234
```

The first start creates the demo workspace (“Northwind Supply Co.”) with historical orders, invoices, payments and three genuinely executed workflows. Registration also provisions a starter catalog for a blank workspace.

### Frontend dev server

```bash
# terminal 1 — API
cd backend && PYTHONPATH=. uvicorn app.main:app --reload --port 8000

# terminal 2 — Vite
cd frontend && npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000`.

### Reset the demo database

```bash
./scripts/reset_demo_db.sh
```

Stop the API before resetting. The next start re-seeds cleanly.

## Docker Compose

```bash
cp .env.example .env
# Required: set JWT_SECRET and POSTGRES_PASSWORD
openssl rand -hex 48

docker compose up --build
```

Open **http://localhost:8080**. Services: PostgreSQL 16, FastAPI (migrations + API), Nginx (SPA + `/api` reverse proxy).

> The compose stack is provided as a deployment asset. It was **not** runtime-tested in the authoring environment because Docker was unavailable; see [Known limitations](#known-limitations).

## Deployment to Vultr

Full step-by-step instructions, including Serverless Inference configuration, host Nginx + TLS, backups and rollback, are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Short version:

1. Create an Ubuntu 24.04 Cloud Compute instance (2 vCPU / 4 GB is comfortable).
2. Point a DNS A record at its public IP.
3. Install Docker, clone this repository, `cp .env.example .env`, set `JWT_SECRET`, `POSTGRES_PASSWORD`, `CORS_ORIGINS` and optionally `VULTR_INFERENCE_API_KEY`.
4. `docker compose up -d --build`.
5. Terminate TLS on the host with Nginx + Certbot (sample config included), or put Cloudflare in front.
6. Verify `GET /api/health` returns `"database":"ok"` and the expected AI mode.

> **Honesty note:** this repository has not been deployed to Vultr from this workspace. No public URL or live Vultr deployment is claimed. The assets and steps above are the intended path and are reproducible.

## Configuration

All configuration is environment-driven; see [`.env.example`](.env.example). Key values:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///backend/bizflow.db` | PostgreSQL in deployment: `postgresql+psycopg://…` |
| `JWT_SECRET` | dev placeholder | **Must be set in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime |
| `SEED_DEMO_DATA` | `true` | Seed the demo workspace on first boot |
| `AI_PROVIDER` | `auto` | `auto`, `vultr` or `deterministic` |
| `VULTR_INFERENCE_API_KEY` | empty | Enables Vultr Serverless Inference |
| `VULTR_MODEL` | `deepseek-v4.1-flash-1017` | Model identifier |
| `WORKFLOW_STEP_DELAY_MS` | `320` | Timeline pacing; set `0` in tests |
| `RATE_LIMIT_PER_MINUTE` | `180` | In-process sliding window |

The frontend never receives provider credentials — only an honest mode label.

## Tests

```bash
cd backend
PYTHONPATH=. pytest tests -q
```

Current suite: **20 tests**, covering:

- registration, login, duplicate accounts, protected routes and tenant isolation
- product creation, stock adjustments and overdraw protection
- atomic order creation (order + stock + sale + invoice)
- insufficient-stock rollback with zero persisted records
- idempotency for orders and workflows
- invoice payment transitions and overpayment rejection
- cancellation restores stock only when nothing has been paid
- end-to-end agent workflow with verification
- restock approval (prepare → approve → stock received) and rejection
- decided approvals cannot be executed twice

The suite runs against a disposable SQLite database and never touches the demo data.

## Project layout

```
repository root
├── backend/
│   ├── app/
│   │   ├── agents/            # specialized agent profiles + drafting
│   │   ├── api/               # FastAPI routers
│   │   ├── core/              # config, security, utilities
│   │   ├── db/                # engine/session/bootstrap
│   │   ├── models/            # SQLAlchemy models
│   │   ├── orchestration/     # planner, executor, tools, Vultr provider
│   │   ├── schemas/           # Pydantic request models
│   │   └── services/          # orders, payments, refunds, reporting, seed
│   ├── alembic/               # baseline migration + env
│   ├── tests/                 # pytest suite
│   ├── Dockerfile
│   └── requirements*.txt
├── frontend/
│   ├── src/pages/             # 15 routed pages
│   ├── src/components/        # design system, shell, timeline, badges
│   ├── src/lib/               # API client + formatting
│   └── Dockerfile
├── infrastructure/nginx/      # SPA + API reverse proxy
├── docs/                      # architecture, deployment, API, demo script
├── scripts/                   # local helpers
├── docker-compose.yml
└── .env.example
```

## Safety model

1. **Plan before write.** The planner emits an explicit ordered plan; each step names a fixed tool.
2. **Validate before write.** Stock, customer, product and amount checks run before the atomic write group.
3. **One transaction for the order core.** Order, stock decrement, movement, sale and invoice commit together or not at all.
4. **Verify after write.** Agents re-read persisted rows and compare expected values. Failed verification cannot report success.
5. **Gate sensitive actions.** External messages, refunds and restock purchases are prepared into approval requests. Approval and rejection are audited; execution is idempotent.
6. **Never trust the agent for SQL.** Tools accept typed parameters and query through SQLAlchemy; agents cannot emit arbitrary SQL.
7. **Scope every query.** Business membership determines the tenant; cross-workspace IDs return 404.

## Known limitations

- **External delivery is not configured.** Approved customer messages are queued in the demo outbox; no email provider is called. The UI says so explicitly.
- **Docker Compose was not runtime-tested here.** Docker was unavailable in the authoring environment. The Dockerfiles, compose file and Nginx config are provided but should be validated on the target host.
- **No Vultr deployment has been verified.** No credentials or public endpoint were available. Deployment steps are documented, not claimed as completed.
- **Rate limiting is in-process.** Multi-worker or multi-instance deployments should move the limiter to Redis.
- **Time-saved figures are illustrative.** The 14-minute manual baseline is labeled as an estimate, not a timed study.
- **SQLite is for the demo.** Use PostgreSQL for concurrent production traffic.
- **Email changes and password reset** are intentionally out of scope for the demo.
- **Report PDF export** uses the browser print dialog; CSV export is native.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [API reference](docs/API.md)
- [Demo script](docs/DEMO_SCRIPT.md)

## License

Built for the Vultr Agent Rush 2026 hackathon. Released under the [MIT License](LICENSE).
