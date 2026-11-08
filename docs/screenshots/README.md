# Screenshots for the deck and video

Real captures from the running app at 1600×1000. No mockups, no placeholders.

| File | Screen | Use on slide | What it proves |
|---|---|---|---|
| `01-overview.png` | Overview dashboard | 1 (background), 8 | Live SQL aggregates, honest "Demo mode" banner |
| `02-manager.png` | AI Business Manager | 4 | Plain-English instruction box + recent runs |
| `03-workflow-completed.png` | Workflow detail — completed | 6, 8 | **Verified** badge, 11/11 steps, 6/6 checks |
| `04-workflow-failed.png` | Workflow detail — failed | 7 | "Stopped safely — no partial writes", skipped steps |
| `05-approvals.png` | Approval center | 6 | Pending refund, Approve / Reject, "awaiting a human decision" |
| `06-finance.png` | Finance | 8 | Billed vs collected, receivables aging |
| `07-inventory.png` | Inventory | 8 | Stock levels, reorder risk |
| `08-settings.png` | Settings | 9 | Business identity and AI engine panel |

## How to insert them

### In Canva
1. Click the empty box the AI generated
2. Right-click → **Replace image** (or drag the file onto the frame)
3. The image auto-crops to the frame — set **Fit** if you want the whole screen

### In PowerPoint / Google Slides
1. Select the empty rectangle → **Insert → Picture → This device**
2. Choose the file, then **Crop → Fill** to remove letterboxing

### In Gamma
1. Hover the empty block → **Replace media → Upload**
2. Upload the PNG from this folder

## Notes

- Keep the **Verified** badge visible in any crop of `03-workflow-completed.png`
- `04-workflow-failed.png` is the most persuasive slide — don't crop out the red
  "Stopped safely — no partial writes retained" banner
- If the slide is dark, add a subtle white border or rounded mask so the light
  screenshot doesn't look like a hole in the design

## Regenerating

These were captured against a seeded demo database. If you reset the data,
numbers change but the layout does not — re-capture only if judges will compare
figures between the deck and the live app.
