# AI prompts — presentation + cover image

Paste these into your slide generator (Gamma, Canva AI, SlidesAI, Claude, ChatGPT)
and your image generator (Midjourney, DALL·E, Ideogram, Firefly).

---

# PROMPT 1 — Slide presentation

## Main prompt (copy all of it)

```
You are a senior product designer building an investor-grade hackathon deck.
Create a 10-slide, 16:9 presentation for "BizFlow AI".

BRAND SYSTEM — follow exactly, do not invent a new palette:
- Ink / dark background: #0B1410
- Soft ink: #141F1A
- Paper background: #F5F4EF
- Cream surface: #FBFAF7
- Forest green primary: #0B7A5C (accents #178565, tints #ECF8F2 / #D4EEE1)
- Coral accent for one highlight per slide only: #FF6B3D
- Amber for warnings/limitations: #C9820A
- Muted text: #68716C · Sage: #8A948D · Hairline borders: #E5E3DA
- Headline font: Instrument Serif (elegant serif, large, tight leading)
- Body font: Inter (clean sans, 16-20pt, 1.5 line height)
- Data/labels font: JetBrains Mono, uppercase, letter-spaced, small

VISUAL LANGUAGE:
- Mostly light "paper" slides; use 2 dark "ink" slides as section breaks
- Generous white space, one idea per slide, max 5 bullets, max 12 words per bullet
- Rounded corners (16px), soft shadows, hairline dividers
- Real product screenshots as the visual anchor — never stock photos of robots,
  never generic "AI brain" clipart, no glowing blue circuits
- Diagrams use thin green lines on paper, with coral only for the failure/safety path
- Add small mono eyebrow labels above every headline, e.g. "01 · PROBLEM"

SLIDES:

1. TITLE (dark ink background)
   Eyebrow: "VULTR AGENT RUSH 2026 · CHALLENGE 02"
   Headline: "BizFlow AI"
   Subhead: "Verified business operations with human control"
   Footer: "Powering the Future of Work" + presenter name
   Visual: faint dashboard screenshot, 12% opacity, right-aligned

2. PROBLEM (paper)
   Eyebrow: "01 · PROBLEM"
   Headline: "An order touches four systems. One failure breaks the books."
   Bullets: customer record · inventory · sales ledger · finance
   Visual: four small nodes connected by a thin line, one node in coral
   Speaker note: a half-finished write silently corrupts the ledger

3. THE GAP (paper)
   Eyebrow: "02 · WHY NOW"
   Headline: "Most AI tools describe the work. They don't do it."
   Two columns: left "Chatbots → plans, text, hope" (muted, struck through);
   right "BizFlow → real transactions, verified" (forest green, bold)

4. THE PROMISE (dark ink)
   Eyebrow: "03 · SOLUTION"
   Headline: "One sentence in. Real operations out."
   Four-step horizontal flow: Plan → Execute → Verify → Approve
   One sentence per step in Inter.
   Speaker note: the model never touches the database directly

5. HOW IT WORKS (paper — architecture)
   Eyebrow: "04 · ARCHITECTURE"
   Headline: "A tool-bound orchestrator, not a free-roaming agent."
   Diagram left to right: React SPA → FastAPI orchestrator → registered tools →
   PostgreSQL; a dotted branch to "Vultr Serverless Inference (optional)"
   Caption in mono: "Only registered tools can write."

6. THE DIFFERENTIATOR (paper)
   Eyebrow: "05 · WHAT MAKES IT DIFFERENT"
   Headline: "It proves the work happened."
   Four cards:
   - Atomic writes — one transaction, or nothing
   - Verify by read-back — success is checked, not claimed
   - Prepare ≠ execute — human approval before anything leaves
   - Honest AI mode — the UI says when no model is connected

7. PROOF — FAILS SAFELY (paper, with the only coral-heavy slide)
   Eyebrow: "06 · SAFETY"
   Headline: "Ask for the impossible. Nothing is written."
   Screenshot placeholder: failed workflow timeline
   Three stats in mono: "status: failed" "writes: 0" "later steps: skipped"
   Pull quote: "A system that lies about success is worse than one that fails."

8. PRODUCT SURFACE (paper)
   Eyebrow: "07 · PRODUCT"
   Headline: "Fifteen screens. Every number from the database."
   Grid of 4 screenshot placeholders with mono captions:
   Overview · AI Manager · Approvals · Finance
   Caption: "No hardcoded demo data."

9. DEPLOYMENT ON VULTR (dark ink)
   Eyebrow: "08 · INFRASTRUCTURE"
   Headline: "Vultr Cloud Compute, Docker Compose, PostgreSQL 16."
   Stack diagram: Vultr VM → Nginx → FastAPI → PostgreSQL
   Mono line: "health: /api/health · migrations: alembic · TLS: certbot"
   STATUS FIELD: use exactly the real status — "deployed" or "pending"

10. CLOSE (dark ink)
    Eyebrow: "09 · CLOSING"
    Headline: "An operations layer you can actually trust."
    Three short lines: Real writes · Verified results · Human control
    Footer: repository URL + demo URL

CONSTRAINTS:
- Do not invent metrics, user counts, funding, or customers
- Do not claim a Vultr deployment unless the status field says so
- Every claim must map to a feature that exists in the app
- Output slide text + speaker notes (2-3 sentences each) + image alt text
```

## Short version (if the tool has a character limit)

```
Design a 10-slide 16:9 hackathon deck for "BizFlow AI", an AI operations
platform that turns plain-English instructions into real business transactions.

Theme: light paper #F5F4EF, dark ink #0B1410, forest green #0B7A5C primary,
coral #FF6B3D accent used once per slide, hairlines #E5E3DA.
Fonts: Instrument Serif headlines, Inter body, JetBrains Mono labels.
Aesthetic: editorial, calm, generous whitespace, real product screenshots,
no robots or AI clichés.

Slides: 1 title · 2 problem (order touches 4 systems) · 3 gap (chatbots describe,
we execute) · 4 promise (Plan → Execute → Verify → Approve) · 5 architecture
(orchestrator → registered tools → PostgreSQL) · 6 differentiators (atomic
writes, verify by read-back, approval gate, honest AI mode) · 7 fails safely
(zero writes on failure) · 8 product surface (15 screens) · 9 Vultr deployment
(Docker Compose + PostgreSQL) · 10 close.

Max 5 bullets per slide, max 12 words per bullet. No invented metrics.
```

---

# PROMPT 2 — Cover image

## Option A — product hero (recommended)

```
A clean product hero image for a B2B SaaS called BizFlow AI.

Composition: a modern web dashboard floating on a warm off-white paper
background (#F5F4EF), shot slightly from the side with a soft realistic shadow.
The dashboard shows a business operations timeline with green check marks and
a small pill badge reading "Verified". Left third of the frame is calm empty
space for a headline.

Palette: deep forest green #0B7A5C, dark ink #0B1410, cream #FBFAF7, one small
coral accent #FF6B3D, hairline borders in #E5E3DA.

Style: editorial product photography, soft natural light, subtle paper grain,
minimal, premium, calm — like Linear or Stripe marketing imagery.
No robots, no glowing circuits, no blue sci-fi lighting, no stock-photo people,
no text other than the "Verified" badge.

Aspect ratio 16:9, high contrast so it reads at thumbnail size.
```

## Option B — abstract editorial

```
Minimal editorial cover for an enterprise AI operations platform.

Concept: four thin forest-green lines flowing left to right across a warm paper
background (#F5F4EF), converging into a single solid green node that forms a
check mark. One small coral dot (#FF6B3D) marks a branch that stops and fades,
representing a safely failed action.

Style: Swiss editorial design, precise geometry, generous negative space,
subtle paper texture, no gradients, no glow, no text.
Colors limited to #0B1410, #0B7A5C, #F5F4EF, #FF6B3D.
16:9, thumbnail-legible.
```

## Text to add afterwards (in Canva/Figma, not in the generator)

- Headline: **BizFlow AI** — Instrument Serif, ink `#0B1410`
- Subline: "Verified writes · Human control" — Inter, muted `#68716C`
- Small mono tag: `VULTR AGENT RUSH 2026`

---

# Prompt 3 — Screenshot capture list

Take these from the running app (1920×1080, browser at 100%):

1. Dashboard — KPI cards + workflow health
2. AI Manager — completed run with the **Verified** badge
3. AI Manager — failed run (99,999 units) for slide 7
4. Approvals — a prepared message showing "NOT SENT"
5. Finance — receivables aging
6. Inventory — reorder risk
7. Settings → AI engine — the honest demo-mode panel

Hide bookmarks, close other tabs, and use the demo account.
