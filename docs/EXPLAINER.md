# What BizFlow AI actually is

Plain-language explainer. No jargon. Use this for the team, the video, and
judge Q&A.

---

## One sentence

**It is a workspace where a business owner types what they want done in plain
English, and the system actually does it in the database — creating the order,
reducing the stock, making the invoice — then checks its own work and asks a
human before anything risky happens.**

Think of it as: **an assistant that has real hands**, not just a chat window.

---

## Who is it for

| Who | What they do with it |
|---|---|
| **Owner of a small business** | Types instructions, approves sensitive actions |
| **Operations manager** | Runs the daily order and stock work |
| **Sales / admin staff** | Creates orders, prepares customer messages |
| **Finance person** | Watches invoices, payments, and what is overdue |
| **Warehouse person** | Checks stock levels and reorder risk |

**Best fit businesses:** wholesalers, distributors, small retailers, e-commerce
sellers, small manufacturers — anyone who sells physical products and has stock.

**Not for:** hospitals, banks, or large enterprises with SAP. This is for the
business that today runs on spreadsheets, WhatsApp and a notebook.

---

## The real problem

Picture a small wholesaler. A customer messages on WhatsApp:

> "Send me 3 units of Product A."

What has to happen:

1. Find the customer record
2. Find the product and check the stock
3. Create the order
4. Reduce the stock
5. Record the sale
6. Create the invoice
7. Message the customer

Today that is **five different places** — notebook, Excel, an invoice app, a
WhatsApp chat, and memory.

Three things go wrong:

- **Double entry.** The order is written, but stock is not updated.
- **Silent errors.** The invoice says 3 units, the stock says 2 were taken.
- **Nothing is provable.** At month-end, nobody can say what actually happened.

And the new AI tools do not help, because they only **write a plan**. They tell
you what to do. They do not do it.

---

## What we actually built

A web portal that does the whole chain **in one safe step**, plus the screens to
see and control it.

### The core: AI Business Manager

You type something like:

> "Process an order for Ahmed Raza for 3 units of Product A, generate the
> invoice, record the sale and prepare a confirmation message."

Then you press **Run workflow**. On screen you watch it happen, step by step:

1. Find the customer
2. Find the product
3. **Check stock before writing anything**
4. Create the order
5. Reduce stock
6. Record the stock movement
7. Calculate totals
8. Record the sale
9. Generate the invoice
10. Prepare the customer message
11. Re-read the database and **verify** every record

At the end it says **Verified** — and it means it, because it read the rows back.

### The screens in the portal

| Screen | What it is, in plain words |
|---|---|
| **Overview** | The morning dashboard — money, orders, low stock, what needs approval |
| **AI Business Manager** | Where you type instructions and watch them execute |
| **Workflows** | A history of every instruction ever run, and what happened |
| **Approvals** | Things waiting for your permission before they happen |
| **Inventory** | Your products, how many you have, and what is running low |
| **Orders & sales** | Every order, its invoice, and its status |
| **Customers** | Who buys from you, how much they have spent, what they owe |
| **Finance** | Invoices, payments received, and what is overdue |
| **Reports** | Best-selling products, reorder risk, export to CSV |
| **Settings** | Business name, currency, tax rate, AI mode, security |

---

## A day in the portal (the clearest way to understand it)

**9:00 — Owner opens Overview.**
She sees revenue, pending invoices, 5 low-stock products, and 1 approval waiting.

**9:10 — An order arrives on WhatsApp.**
She goes to **AI Business Manager** and types the instruction in one sentence.
She presses Run. The timeline animates. Stock is checked first. Then everything
is written together. The badge says **Verified**.

**9:12 — A message is waiting.**
In **Approvals** she sees the customer confirmation message, prepared but not
sent. She reads it, then approves. The decision is recorded.

**11:00 — A customer asks for a refund.**
She types it. The system prepares the refund and **does not move any money**.
It waits for her approval. That is the whole point.

**14:00 — Someone asks for 9,999 units.**
She runs it to test. The system stops at stock validation. Status: **Failed**.
No order, no invoice, no stock change. It refuses to half-do the work.

**17:00 — End of day.**
She opens **Finance** to see what was collected and what is overdue, and
**Reports** to see what to reorder.

---

## What makes it different from a chatbot

| Chatbot | BizFlow AI |
|---|---|
| Writes a plan | Executes real database writes |
| Says "done" | **Reads the records back and proves it** |
| Can half-finish | **All or nothing — one transaction** |
| Acts on its own | **Stops for a human before anything leaves** |
| Pretends to be AI | **Says clearly when no model is connected** |

---

## Honest limits (say these before a judge asks)

- Customer messages go to a **demo outbox** — no real email is sent
- **No payment gateway** — recording a payment is manual
- **One business workspace** per account — no multi-tenant admin yet
- Rate limiting is in-process; it would need Redis to scale
- AI mode is optional: without a key it runs a deterministic planner and says so

---

## The 30-second version to say out loud

> "Small businesses lose money because an order touches five systems that don't
> talk to each other. BizFlow AI takes one plain-English instruction and performs
> the whole chain — order, stock, sale, invoice — in a single safe transaction.
> Then it reads the records back to prove it worked, and stops for a human before
> anything sensitive happens. It's not a chatbot that talks about work. It's a
> workspace that does the work."
