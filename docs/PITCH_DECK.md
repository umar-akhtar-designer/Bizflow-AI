# Submission pack — Vultr Agent Rush 2026

Challenge **02 · Powering the Future of Work**

Use this file to fill the lablab.ai submission form and to build the slide
deck. Anything marked `[FILL]` must be completed by you before submitting.

---

## 1. Submission form copy

**Project title**
> BizFlow AI — verified business operations with human control

**Short description** (one or two lines, ~200 characters)
> Turn a plain-English instruction into real order-to-cash work: atomic database
> writes, independent read-back verification, and human approval before anything
> leaves the building.

**Long description**

> BizFlow AI is an operations layer for small and mid-sized businesses. An owner
> types an instruction — "process an order for Fatima Noor for 2 units of Product
> A, generate the invoice, and prepare a confirmation message" — and a team of
> specialised agents plans and executes it against a real database.
>
> Every write is transactional: the order, stock decrement, inventory movement,
> sale and invoice are committed together or not at all. Afterwards the agents
> re-read the persisted rows and independently verify them, so the UI only shows
> "Verified" when the read-back checks pass.
>
> Sensitive actions are never autonomous. Customer messages, refunds and restock
> purchases are prepared into approval requests with the exact payload; a named
> human approves or rejects them, and the decision is written to an append-only
> audit log.
>
> When a request cannot be completed — for example insufficient stock — the
> workflow fails safely with zero persisted writes and later steps marked
> skipped, rather than reporting a partial success.
>
> The application is a production-shaped web platform: JWT authentication with
> bcrypt hashing, tenant-scoped queries, rate limiting, idempotency keys,
> timeouts and retries, 15 screens covering orders, inventory, customers,
> finance and reporting, and a FastAPI + PostgreSQL backend deployed with Docker
> Compose on Vultr Cloud Compute.
>
> The AI layer is honest by design. Vultr Serverless Inference is optional for
> this challenge, so the platform also ships a deterministic planner and states
> clearly in the UI which mode is active. It never claims a model produced
> output it did not.

**Technology tags**
> `python` `fastapi` `react` `typescript` `postgresql` `docker` `vultr`
> `ai-agents` `workflow-automation` `enterprise`

**Demo application platform**
> Vultr Cloud Compute (Docker Compose)

**Application URL**
> `[FILL — http://<server-ip>:8080 or https://your-domain]`

**GitHub repository**
> https://github.com/umar-akhtar-designer/Bizflow-AI

---

## 2. Slide deck — 10 slides

Keep it to ~8 minutes of talking. One idea per slide, large type, few words.
Export as PDF before submitting.

### Slide 1 — Title
- **BizFlow AI**
- Verified business operations with human control
- Challenge 02 · Powering the Future of Work
- Your name · Vultr Agent Rush 2026
- *Visual: the dashboard, not a logo*

### Slide 2 — The problem
- An order touches four systems at once: customer, inventory, sales, finance
- If one step fails halfway, the books break silently
- No owner will let an AI move money or email customers unsupervised
- **Most "AI business tools" stop at chat; they describe work instead of doing it**

### Slide 3 — The promise
- One sentence in → real operations out
- Plan → execute → **verify** → human approval
- *Visual: the instruction box next to the finished verified workflow*

### Slide 4 — How it works
Architecture diagram, left to right:
- React SPA → FastAPI orchestrator → tool-bound executor → PostgreSQL
- Specialised agents: Customer, Inventory, Sales, Finance, Reporting
- Optional: Vultr Serverless Inference for intent refinement
- **Key line: the model never touches the database directly — only registered tools**

### Slide 5 — The differentiator
- **Atomic writes:** order + stock + movement + sale + invoice in one transaction
- **Verify by read-back:** success is proven, not asserted
- **Prepare ≠ execute:** approval gate on messages, refunds, restocks
- **Honest AI mode:** the UI states when no model is connected

### Slide 6 — Proof: it fails safely
- Screenshot of the failed run (99,999 units)
- Status: Failed · verification: failed · later steps: skipped
- Zero orders, zero invoices, zero stock change
- **"A system that lies about success is worse than one that fails."**

### Slide 7 — Product surface
- 15 screens: Overview, AI Manager, Workflows, Approvals, Inventory, Orders,
  Customers, Finance, Reports, Settings
- Every number is a SQL aggregate over real rows
- *Visual: 3–4 screenshots in a grid*

### Slide 8 — Deployment on Vultr
- **Vultr Cloud Compute VM**, Ubuntu 24.04
- Docker Compose: PostgreSQL 16 + FastAPI + Nginx
- TLS via host Nginx + Certbot
- Alembic migrations on boot; health check at `/api/health`
- *Mark the actual status honestly if the VM is still pending*

### Slide 9 — Business value
- Target: SMBs running sales + stock + invoicing in spreadsheets
- Saves the reconciliation work, not just the typing
- Audit trail for every AI-assisted action
- Extensible to procurement, HR onboarding, support triage

### Slide 10 — Limitations & roadmap
- Customer messages go to a demo outbox — no external email transport yet
- Rate limiting is in-process; move to Redis before scaling
- No live Vultr deployment yet `[UPDATE IF DEPLOYED]`
- Roadmap: real email transport, multi-warehouse stock, role-based approvals

---

## 3. Cover image

- 16:9 or square, high contrast, readable at thumbnail size
- Dashboard screenshot with the **Verified** badge visible, dark overlay on the left
- Text on image: **BizFlow AI** + "verified writes · human control"
- Avoid stock-photo robots; show the actual product

---

## 4. Video

Use `docs/VOICE_SCRIPT.md` (2 min 45 s).
Hard requirements from the rules: it must be a **recorded demo video**, and the
architecture and use case must be explained.

---

## 5. Team split (1–6 people allowed)

| Task | Who | Notes |
|---|---|---|
| Vultr account + VM deployment | `[FILL]` | **Highest priority** — needs a card/PayPal/crypto |
| Record the demo video | `[FILL]` | Can start now, does not need Vultr |
| Slide deck | `[FILL]` | Use section 2 |
| Submission form + descriptions | `[FILL]` | Use section 1 |
| Final proofread of README | `[FILL]` | Check the Vultr claims are accurate |

**Important:** everyone must join the same team on lablab.ai, and the submission
must be made there — a GitHub repo alone is not an entry.
