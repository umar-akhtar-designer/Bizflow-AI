# Slide deck

| File | What it is |
|---|---|
| `BizFlow-AI-Deck.pdf` | **10-slide deck, 16:9** — submit this |
| `cover.png` | **1600×900 cover image** — upload to lablab |
| `index.html` | Editable source for the deck |

## Before you submit — one edit

Open `index.html`, find this line on the last slide:

```html
demo &nbsp;<b>bizflow-ai.fastapicloud.dev</b><br>
```

Replace the bracket text with your real URL, then regenerate the PDF (below).

Also confirm slide 9 does not claim a live deployment. It currently describes
the production topology only, which is accurate either way.

## Regenerate the PDF

```bash
cd docs/deck

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf-no-header \
  --virtual-time-budget=20000 \
  --print-to-pdf="BizFlow-AI-Deck.pdf" \
  "file://$(pwd)/index.html"

# refresh the cover image from slide 1
pdftoppm -png -r 96 -f 1 -l 1 BizFlow-AI-Deck.pdf cover
mv cover-01.png cover.png
```

## Design system used

Taken directly from `frontend/tailwind.config.js`, so the deck matches the app.

| Token | Value | Used for |
|---|---|---|
| Ink | `#0B1410` | Dark slides, body text |
| Paper | `#F5F4EF` | Light slide background |
| Cream | `#FBFAF7` | Cards and panels |
| Forest | `#0B7A5C` | Primary accent |
| Coral | `#FF6B3D` | Failure path, one highlight per slide |
| Line | `#E5E3DA` | Hairline borders |
| Muted | `#68716C` | Secondary text |
| Instrument Serif | 400 | All headlines |
| Inter | 400–700 | Body |
| JetBrains Mono | 400–600 | Eyebrows, stats, labels |

## Slide order

1. Title
2. Problem — four systems
3. The gap — chatbot vs BizFlow
4. Promise — Plan → Execute → Verify → Approve
5. Architecture — tool-bound orchestrator
6. Differentiator — proves the work happened
7. Safety — fails with zero writes
8. Product — four real screens
9. Infrastructure — Vultr stack
10. Close

## Notes

- Fonts load from Google Fonts. If you regenerate offline, headlines fall back to
  Georgia and the deck will look less refined.
- The screenshots are embedded in the PDF, so it is safe to share the file alone.
- If you edit text and it overflows a slide, reduce the `h2` font size on that
  slide rather than shrinking the whole deck.
