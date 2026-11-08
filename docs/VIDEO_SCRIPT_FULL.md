# Full video script — BizFlow AI

**Runtime:** 4 minutes · **Format:** screen recording + voice-over
**Order:** home page → problem → why we built it → what we built → how → dashboard → demo → close

The landing page has these real headlines. Your words should match what is on
screen at that moment:

- Hero: *"One instruction. Five specialists. Verified records."*
- *"The boring, critical steps — executed, not described."*
- *"From sentence to settled sale in one run."*
- *"An agent that can act must be contained."*
- *"Built for Vultr Cloud Compute."*

---

## Before you record

- Reset the demo data: `./scripts/reset_demo_db.sh` (stop the API first), then restart it
- Open Chrome at 100% zoom, 1920×1080
- Hide the bookmarks bar (`Cmd+Shift+B`), close every other tab
- Log in once and out again, so the login screen is clean for the take
- Do **not** add an LLM key — deterministic mode is honest and stable
- Record the flagship run twice and keep the better take

**Voice:** talk like you're explaining it to a smart friend. Short sentences.
Pause one full second between sections. If you fumble, redo that sentence only.

---

## 0:00 — HOME PAGE (hook)

**SCREEN:** Landing page at the top. Do not scroll yet. Cursor still.

**SAY:**
> "This is BizFlow AI. Before I show you the product, let me tell you why we built it — because the why explains everything you're about to see."

---

## 0:12 — THE PROBLEM (still on the home page)

**SCREEN:** Start a slow scroll. Stop on the section *"The boring, critical steps — executed, not described."*

**SAY:**
> "Small businesses don't fail because they can't sell. They struggle with the work behind the sale.
>
> One order touches four systems at the same time — the customer record, the stock, the sales record, and the invoice.
>
> If any one of those fails halfway, the books are quietly wrong. And nobody notices until the end of the month.
>
> And now everyone is building AI tools for this. But most of them stop at chat. They write you a nice plan… and leave you to do the work."

---

## 0:45 — WHY WE BUILT IT

**SCREEN:** Keep scrolling slowly through the product section.

**SAY:**
> "So we built the other half.
>
> We didn't want another assistant that talks about work. We wanted something that actually does the work — and then proves it did.
>
> That's the whole idea. One sentence in. Real operations out. And a human still in control."

---

## 1:00 — WHAT WE BUILT

**SCREEN:** Stop on *"From sentence to settled sale in one run."*

**SAY:**
> "You type one sentence. Something like: process an order for Ahmed Raza for three units of Product A, generate the invoice, record the sale, and prepare a confirmation message.
>
> The system finds the real customer and the real product. It checks the stock before writing anything. Then it creates the order, moves the stock, books the sale, and generates the invoice — all in one transaction.
>
> Then it reads every record back and checks them. So when it says done, it can prove it."

---

## 1:20 — HOW WE MADE IT SAFE

**SCREEN:** Scroll to the dark section *"An agent that can act must be contained."*

**SAY:**
> "How did we make that safe? Three rules.
>
> One — the model is a planner, not an operator. It can only call tools we registered. No writing SQL, no running commands.
>
> Two — every write happens inside one transaction. All of it lands, or none of it does.
>
> Three — anything sensitive is prepared, not executed. Customer messages, refunds, restocks. A named human approves them."

---

## 1:35 — HOW WE DEPLOY IT

**SCREEN:** Scroll to *"Built for Vultr Cloud Compute."*

**SAY:**
> "And it's built to run on Vultr Cloud Compute, containerized end to end — PostgreSQL, FastAPI, the React app and Nginx behind one Compose file."

---

## 1:45 — OPEN THE APP

**SCREEN:** Click **Open the live demo**. Sign in with the demo account.

**SAY:**
> "Okay. Let me show you the real thing. I'll sign in as the demo owner."

*Delivery: don't narrate the typing. Let it breathe.*

---

## 1:55 — DASHBOARD

**SCREEN:** Overview page. Hover across the KPI cards, then reach the workflow health panel.

**SAY:**
> "This is the overview. Every number here is a live query against real records — orders, invoices, payments, stock movements. None of these cards are made up for the video.
>
> Down here is workflow health. That's counting actual agent runs — completed, failed, and partial. Including the failures. We'll come back to those."

---

## 2:15 — THE FLAGSHIP RUN

**SCREEN:** Open **AI Business Manager**.

**SAY:**
> "This is the part I care about most."

**TYPE EXACTLY:**
```
Process an order for Ahmed Raza for 3 units of Product A, generate the invoice, record the sale and prepare a confirmation message.
```

**Click Run workflow. Then, while the timeline animates:**

**SAY:**
> "Watch the order of operations.
>
> First it finds the customer. Then the product — and it reads live stock.
>
> And here is the important part: it validates the stock before it writes anything. Nothing gets written until we know the whole chain can succeed.
>
> Now it creates the order, reduces the stock, records the movement, calculates the totals, books the sale, and generates the invoice. All in one transaction."

*Delivery: let it animate. Two or three seconds of silence here is good — it makes the run feel real.*

---

## 2:55 — PROOF

**SCREEN:** Completed workflow. Point at the **Verified** badge, then the checks panel.

**SAY:**
> "And when it finishes, it doesn't just say done.
>
> It re-reads every record it wrote and checks it independently — the order, the line items, the total, the sale, the invoice, the stock movement.
>
> That's why this badge says Verified. Not because we told it to. Because the read-back actually passed."

*Delivery: hold on the badge for two full seconds. Don't talk over it.*

---

## 3:10 — APPROVALS

**SCREEN:** Open **Approvals**. Show the pending item.

**SAY:**
> "Now — the customer message. It says prepared, not sent.
>
> The system built the exact message, but it's waiting for a human. Same rule for refunds and restocks. Nothing leaves the building without approval.
>
> Let me approve this one… and now it's queued. If I had rejected it, nothing would have happened."

*Delivery: say "prepared, not sent" slowly. It's your best differentiator.*

---

## 3:30 — FAILING SAFELY

**SCREEN:** Back to **AI Business Manager**.

**SAY:**
> "One more, because this is the part most demos skip."

**TYPE EXACTLY:**
```
Process an order for Sara Khan for 9999 units of Product A and generate the invoice.
```

**SAY:**
> "That's obviously impossible. Watch what it does.
>
> It stops at stock validation. Status is failed. The later steps are marked skipped. And there is no order, no invoice, and no stock change.
>
> A system that lies about success is worse than one that just fails. This one refuses to half-do the work."

---

## 3:50 — FINANCE (optional, cut if short on time)

**SCREEN:** Open **Finance**.

**SAY:**
> "And because it's all the same database, finance is already correct — what was billed, what was collected, and what's overdue."

---

## 4:00 — CLOSE

**SCREEN:** Back to the dashboard.

**SAY:**
> "That's BizFlow AI. One instruction. Real writes. Verified results. And a human in control.
>
> Not a chatbot that talks about work — a workspace that actually does it."

*Delivery: land on "actually does it" and stop. Hold the dashboard two seconds before cutting.*

---

# If you need a 2:30 cut

Drop these sections:
- **1:20 How we made it safe** — replace with one line: *"The model plans; it can only call tools we registered, and sensitive actions wait for approval."*
- **1:35 Deployment** — skip, mention in one sentence at the close
- **3:50 Finance** — skip

Keep the full order: home → problem → what → dashboard → run → verified → approvals → failure → close.

---

# Judge checklist (must appear on screen)

- [ ] Home page is shown
- [ ] Problem is explained in plain words
- [ ] A real execution is shown, not described
- [ ] The **Verified** badge and why it can be trusted
- [ ] **"Prepared, not sent"** approval gate
- [ ] A safe failure with zero writes
- [ ] Honest AI mode mentioned
- [ ] Public URL and repo in the video description
