# BizFlow AI — voice-over demo script

**Runtime:** 2 min 45 s · **Format:** screen recording + voice-over
**Login:** `demo@bizflow.ai` / `demo1234`
**Public URL:** use your tunnel or deployed URL, not `localhost`, if judges will click it.

Record at 1920×1080, browser zoom 100%, hide bookmarks bar, and close other tabs.
Speak slightly slower than feels natural. Pause half a second between sections.

---

## 0:00 — Hook (10s)

**SAY**
> Most "AI for business" tools stop at conversation. They write you a nice plan and leave you to do the work.
>
> BizFlow AI is different. It actually performs the operation, then reads the database back to prove it happened.

**DO**
Landing page, cursor still. No scrolling during the first line.

---

## 0:10 — The problem (25s)

**SAY**
> Every order in a real business touches four systems at once — the customer record, inventory, the sales ledger, and finance.
>
> If any one of those fails halfway, your books silently break. And no owner is going to let an AI move money or email a customer on its own.
>
> Those two problems are exactly what this system is built around.

**DO**
Slow scroll down the landing page while speaking, stop on the feature cards.

---

## 0:35 — The promise (15s)

**SAY**
> You describe the work in plain English. A team of specialised agents plans it using a fixed set of validated tools. Writes happen in a single transaction. Results are verified by reading them back. And anything sensitive waits for a human.

**DO**
Scroll to the architecture / how-it-works section.

---

## 0:50 — Sign in (15s)

**SAY**
> Let me show you the real thing. I'll sign in as the demo owner.

**DO**
Click **Sign in**, fill the credentials, submit. Let the dashboard settle.

---

## 1:05 — Dashboard (15s)

**SAY**
> Every number on this screen is a live SQL query over real records — orders, invoices, payments, stock movements. There is no mock data behind these cards.
>
> The workflow health panel counts genuine agent runs: completed, failed, and partial.

**DO**
Hover across the KPI cards. Then scroll to the workflow health panel.

---

## 1:20 — The flagship run (55s)

**SAY**
> Here's the core of the product. I'll ask it to do a complete order-to-cash operation — in one sentence.

**DO**
Open **AI Business Manager**, paste:

> `Process an order for Fatima Noor for 2 units of Product A, generate the invoice, record the sale and prepare a confirmation message.`

Click **Run workflow**.

**SAY** *(while the timeline animates)*
> Watch the sequence. It resolves the customer. It resolves the product and reads live stock. And critically — stock is validated *before* anything is written.
>
> Only then does it create the order, decrement inventory, record the movement, book the sale, and generate the invoice — all inside one atomic transaction.

**DO**
Keep the timeline visible. Do not scroll past the verification step.

---

## 2:15 — Proof, not claims (15s)

**SAY**
> When it finishes, it doesn't just say "done". It re-reads the persisted rows and independently verifies each one. That's why this badge says **Verified** — because the read-back checks passed.

**DO**
Point at the Verified badge and the verification count. Then open **View workflow** for two seconds to show persisted tool calls.

---

## 2:30 — Human approval (30s)

**SAY**
> Notice this: the customer message was prepared, but not sent. It's sitting in the approval centre.
>
> Same rule for refunds and restocks. I approve this restock — and stock actually goes up. If I reject one, stock is left untouched.

**DO**
Open **Approvals**. Approve the restock. Return to **Inventory** to show the higher count.

---

## 3:00 — Failing safely (30s)

**SAY**
> Now the part most demos skip. I'll ask for an impossible order.

**DO**
Back in the Manager, run:

> `Process an order for Sara Khan for 99999 units of Product A and generate the invoice.`

**SAY**
> It stops at stock validation. Status is failed, later steps are marked skipped, and there is no order, no invoice, and no stock change.
>
> A system that lies about success is worse than one that fails. This one refuses to write anything it can't complete.

**DO**
Show the failed run detail. Optionally open **Orders** to prove no new order appeared.

---

## 3:30 — Honesty about the AI (20s)

**SAY**
> One more thing, because it matters. There's no language-model key configured right now, so the app is running its deterministic planner — and it says so, right here, in the interface.
>
> The operations are real either way. Connect a Vultr inference key and the same pipeline uses a model to interpret intent — but the execution tools and the guardrails never change.

**DO**
**Settings → AI engine**. Point at the "No LLM key" badge and the honest demo-mode panel.

---

## 3:50 — Close (15s)

**SAY**
> BizFlow AI is not a chat demo. It plans with bounded tools, writes real records atomically, verifies them by reading back, and hands control to a human before anything leaves the building.
>
> That's an operations layer you can actually trust.

**DO**
Return to the dashboard. Hold still for two seconds before stopping the recording.

---

# 45-second short version

For a submission thumbnail video or social clip.

> Most AI business tools stop at conversation. BizFlow AI actually does the work.
>
> One sentence — *"Process an order for Fatima Noor for two units of Product A, generate the invoice, and prepare a confirmation message."*
>
> It resolves the customer, checks live stock **before** writing, then creates the order, inventory movement, sale, and invoice in one atomic transaction. Then it reads the rows back to verify them.
>
> The customer message is prepared, not sent — a human approves it. Ask for an impossible quantity and it fails safely, with zero writes.
>
> Real operations, verified writes, human control. That's BizFlow AI.

---

# Recording checklist

- [ ] Reset the demo database first: `./scripts/reset_demo_db.sh` (stop the API first)
- [ ] Start the app, sign in once to confirm it loads clean
- [ ] Record the flagship run **twice** and use the cleaner take
- [ ] Do not add an LLM key before recording — deterministic mode is the honest, stable demo
- [ ] No notifications, no terminal windows, no `localhost` in the URL bar if possible
- [ ] Say "prepared, not sent" clearly — it is a differentiator, not a limitation
- [ ] Keep the "Verified" badge on screen for at least two seconds
