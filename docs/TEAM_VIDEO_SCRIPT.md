# Team video script — BizFlow AI

**Length:** 2 min 45 s · **Format:** screen recording + voice-over
**Who records:** one person narrates, one person drives the screen (or one does both)
**Share this file with the team — everything you need is here.**

---

## Before you hit record (10-minute setup)

1. Reset the demo data so the numbers are clean:
   ```bash
   cd bizflow-ai && ./scripts/reset_demo_db.sh     # stop the API first
   ```
2. Start the app and open it in Chrome at **100% zoom**, 1920×1080.
3. Log in once as `demo@bizflow.ai` / `demo1234`, then log out — so the login shot is clean.
4. Hide the bookmarks bar (`Cmd+Shift+B`), close every other tab, silence notifications.
5. **Do not add an LLM key.** The app is honest about running the deterministic planner — that's a feature, and it keeps the demo stable.
6. Record the flagship run **twice**. It's the heart of the video; pick the cleaner take.

**Voice notes:** talk like you're explaining it to a smart friend, not presenting to a board.
Slightly slower than feels normal. Pause a full second between sections. If you fumble a line, just redo that sentence — don't restart the whole take.

---

## THE SCRIPT

### [0:00] HOOK — landing page, no scrolling

> **VOICE:**
> "So most AI tools for business stop at chat. You ask for something, it writes you a nice little plan, and then… you go do the work yourself.
>
> We wanted to build the other half. The part that actually does it."

*Delivery: say "and then…" with a small pause. That pause is the hook.*

---

### [0:10] THE PROBLEM — slow scroll down the landing page

> **VOICE:**
> "Here's the problem we kept running into. One order touches four systems at the same time — the customer record, inventory, the sales ledger, and finance.
>
> If any one of those fails halfway through, your books are quietly wrong. And nobody's going to hand an AI the keys and let it move money or email customers on its own.
>
> So we built for those two things specifically: making the writes safe, and keeping a human in the loop."

---

### [0:35] THE PROMISE — stop on the how-it-works section

> **VOICE:**
> "The idea is simple. You describe the work in plain English. A team of specialised agents plans it — but they can only use a fixed set of tools we've registered.
>
> So they can't wander off and invent something. They plan, they execute, the writes happen in one transaction, and then they read everything back to prove it worked.
>
> And anything sensitive — messages, refunds, restocks — waits for a human to approve it."

*Delivery: count the four beats on your fingers while you say plan / execute / verify / approve. It helps the rhythm.*

---

### [0:50] LOGIN — sign in on camera

> **VOICE:**
> "Alright, let me just show you the real thing. I'll sign in as the demo owner."

*Delivery: don't narrate the typing. Let it breathe. Pick up again once the dashboard loads.*

---

### [1:05] DASHBOARD

> **VOICE:**
> "Everything on this screen is a live query against real records — orders, invoices, payments, stock movements. None of these cards are faked for the video.
>
> And this panel down here — workflow health — that's counting actual agent runs. Completed, failed, partial. Including the failures. We'll come back to those."

*Delivery: point at the numbers. "Including the failures" should sound like a wink.*

---

### [1:20] THE FLAGSHIP RUN — open AI Business Manager

> **VOICE:**
> "This is the part I actually care about most."

**Type this exactly:**
> `Process an order for Fatima Noor for 2 units of Product A, generate the invoice, record the sale and prepare a confirmation message.`

**Click Run workflow. Then, while the timeline animates:**

> **VOICE:**
> "Watch the order of operations here. First it finds the customer. Then the product — and it reads live stock.
>
> And look — it validates the stock *before* it writes anything. That's deliberate. Nothing gets written until we know the whole thing can succeed.
>
> Only then does it create the order, drop the stock, log the movement, book the sale, and generate the invoice. All in one transaction. Either all of it lands, or none of it does."

*Delivery: let the animation run. Silence for 2–3 seconds is fine here — it makes the run feel real instead of rehearsed.*

---

### [2:15] PROOF — the Verified badge

> **VOICE:**
> "And when it finishes, it doesn't just say 'done'. It goes back and re-reads every record it just wrote, and checks them independently.
>
> That's why this badge says Verified. Not because we told it to — because the read-back actually passed."

*Delivery: hold on the Verified badge for a full two seconds. Don't talk over it.*

---

### [2:30] HUMAN APPROVAL — open Approvals

> **VOICE:**
> "Now — the customer message. Notice it says prepared, not sent.
>
> It built the exact message, but it's sitting here waiting for approval. Same rule for refunds and restocks. Let me approve this restock…
>
> …and you can see the stock actually went up. If I'd rejected it, stock wouldn't have moved at all."

*Delivery: this is your differentiator. Say "prepared, not sent" clearly and slowly.*

---

### [2:55] FAILING SAFELY — back to AI Manager

> **VOICE:**
> "Okay, one more. Because this is the part most demos skip."

**Type:**
> `Process an order for Sara Khan for 99999 units of Product A and generate the invoice.`

> **VOICE:**
> "That's obviously impossible. And watch what it does — it stops at stock validation. Status is failed, the later steps are marked skipped, and there's no order, no invoice, and no stock change.
>
> Which is the whole point. A system that lies about success is worse than one that just fails."

*Delivery: this is the strongest 20 seconds in the video. Don't rush it.*

---

### [3:20] HONESTY — Settings → AI engine

> **VOICE:**
> "And one last thing, because I think it matters.
>
> There's no language model key connected right now, so the app is running its deterministic planner — and it says so, right here on screen.
>
> The operations are real either way. If you plug in Vultr's inference, the same pipeline uses a model to understand the intent. But the tools and the guardrails don't change. The model never gets direct access to the database."

*Delivery: this builds trust. Don't sound apologetic about it — sound deliberate.*

---

### [3:50] CLOSE — back to dashboard

> **VOICE:**
> "So that's BizFlow AI. It plans with tools it's actually allowed to use, writes real records atomically, verifies them by reading back, and stops for a human before anything leaves the building.
>
> Not a chatbot that talks about work. An operations layer you can actually trust."

*Delivery: land on "actually trust" and stop. Hold the dashboard for two seconds before cutting.*

---

## If two people are recording

| Section | Narrator |
|---|---|
| 0:00 – 1:05 | Person A (problem framing) |
| 1:05 – 2:30 | Person B (product demo) |
| 2:30 – 3:30 | Person A (approval + safety) |
| 3:30 – end | Person B (close) |

Swap mid-sentence is fine — it sounds like a real conversation.

---

## Absolute must-haves (judges check these)

- [ ] Shows a **real execution**, not a description of one
- [ ] Shows the **Verified** badge and explains why it's trustworthy
- [ ] Shows **"prepared, not sent"** — the human approval gate
- [ ] Shows a **safe failure** with zero writes
- [ ] States the **honest AI mode** clearly
- [ ] Explains the **architecture** in one breath (tools + orchestrator + database)
- [ ] Links the **public URL** and the **repo** in the description

## Common mistakes to avoid

- Saying "AI agent" without showing it do anything
- Claiming "deployed on Vultr" when it isn't yet
- Reading bullet points off a slide
- Fast, nervous narration — slow down
- A 6-minute video. Judges stop watching. **Stay under 3 minutes.**
