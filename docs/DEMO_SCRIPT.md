# Demo script

A tight 4–5 minute walkthrough for judges. Every action below is a real database operation.

## Before you start

Run these commands from the repository root.

```bash
./scripts/reset_demo_db.sh          # stop the API first
cd backend && PYTHONPATH=. uvicorn app.main:app --port 8000
```

Open `http://127.0.0.1:8000` and sign in with:

```
demo@bizflow.ai / demo1234
```

## 0:00 — Landing and honest AI mode (20s)

- The landing page frames the promise: natural language → verified operations → human approval.
- Point at the AI mode pill. Without a Vultr key it reads **Demo mode: deterministic planner**. This label is generated from the actual provider status, not hardcoded marketing.

## 0:20 — Overview (30s)

- Revenue, orders, customers, inventory value, low-stock count, approvals and workflow success are all SQL aggregates over the seeded historical data.
- The revenue sparkline is recorded sales grouped by day.
- “Workflow health” counts real agent runs: completed, failed and partial.

## 0:50 — The flagship run (90s)

Open **AI Business Manager** and paste:

> Process an order for Fatima Noor for 2 units of Product A, generate the invoice, record the sale and prepare a confirmation message.

Click **Run workflow**. While it runs:

- The timeline animates through 11 specialized steps across Customer, Inventory, Sales, Finance, Reporting and Customer agents.
- Point out the stock validation step **before** any write.
- When it finishes, the header shows **Verified** and the number of independently verified records.
- Scroll to the execution summary: real order number, invoice number, total and “time saved” labeled as an illustrative baseline.
- Open the prepared customer message card: **PREPARED MESSAGE — NOT SENT**. The agent prepared the payload; it did not contact the customer.

Optional: click **View workflow** to show the persisted plan, tool calls, latencies and verification notes.

## 2:20 — Approval center (45s)

- Open **Approvals**. Pending items are real prepared actions from workflow runs.
- Expand a customer message: recipient, subject, body and `delivery_status=not_sent`.
- Click **Approve & execute**, add a note, confirm. The payload becomes `queued_demo_outbox`, the audit log records the decision, and the pending count drops.
- Say explicitly: no external email provider is configured, so the message is queued in the demo outbox — the UI does not pretend it was delivered.
- Show a restock approval: approving it visibly increments stock; rejecting another leaves stock untouched.

## 3:05 — Failure that fails safely (35s)

Back in the Manager, run:

> Process an order for Sara Khan for 99999 units of Product A and generate the invoice.

- The run stops at stock validation.
- The status is **Failed**, verification is failed, later steps are marked skipped.
- There is no order, no invoice and no stock change. This is the “never claim success when writes fail” proof.
- The audit trail records the failure and emits a notification.

## 3:40 — Finance and reports (45s)

- Open **Finance**: billed, collected, outstanding, overdue and aging are computed from invoices and payments.
- Record a partial payment on an open invoice. The balance and status update in the same transaction; overpayment is rejected if you try it.
- Open **Reports**: switch periods, show top products and reorder risk, export the CSV. The executive narrative is labeled **Computed** when no LLM is configured — not passed off as model output.

## 4:25 — Settings and security (25s)

- **Settings → AI engine**: planner, execution and guardrails; the honest demo-mode panel explains how to enable Vultr.
- **Settings → Security & system**: bcrypt, JWT, rate limiting, tenant isolation, transactional writes.
- If time allows, open **Inventory** and adjust stock; then open **Workflows** to show every action has an audit entry.

## Closing line

> BizFlow AI is not a chat demo. It plans with a deterministic tool-bound orchestrator, writes real records, verifies them by reading back, and stops for a human before anything leaves the building. Without an LLM key it is honest about that too — the operations still work.

---

## Backup prompts

If a live run misbehaves, use these known-good instructions:

| Outcome | Instruction |
| --- | --- |
| Order-to-cash + message approval | `Process an order for Ahmed Raza for 3 units of Product A, generate the invoice and prepare a confirmation message.` |
| Restock approval | `Check low stock and prepare a restock request for the warehouse.` |
| Safe failure | `Process an order for Sara Khan for 99999 units of Product A and generate the invoice.` |
| Weekly report | `Give me a weekly business report with sales trends and inventory insights.` |
| Customer briefing | `Pull up a full history and lifetime value for Fatima Noor.` |
| Receivables | `Show me outstanding receivables and who owes us money.` |

## Judge-facing checklist

- [ ] Real persistence: refresh the page; the order and audit trail remain.
- [ ] Verification: a failed workflow never shows Verified.
- [ ] Human control: no customer message is sent without approval.
- [ ] Honest AI: the mode label matches `/api/health`.
- [ ] Real metrics: numbers change after a new order/payment.
- [ ] Security: protected routes redirect to login; tokens are required by the API.
