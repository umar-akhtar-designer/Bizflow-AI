# Vultr Agent Rush 2026 — submission checklist

**Challenge:** 02 · Powering the Future of Work
**Deadline:** online build 3–8 November 2026 · submit on lablab.ai

Source of requirements: https://lablab.ai/ai-hackathons/vultr-hackathon

---

## Hard requirements

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Public GitHub repository | ✅ Done | `umar-akhtar-designer/Bizflow-AI` |
| 2 | Setup + documentation in README | ✅ Done | README, `docs/ARCHITECTURE.md`, `docs/API.md` |
| 3 | **Vultr VM backend deployment** | ❌ **Missing** | Required. Docker Compose stack is ready |
| 4 | **Public demo URL on Vultr** | ❌ **Missing** | Required. Interim demo is live on FastAPI Cloud (not Vultr): https://bizflow-ai.fastapicloud.dev |
| 5 | Recorded demo video | ⬜ To record | Script in `docs/VOICE_SCRIPT.md` |
| 6 | Clear architecture / use-case explanation | ✅ Done | `docs/ARCHITECTURE.md`, README |
| 7 | MIT license | ✅ Done | `LICENSE` |
| 8 | Submitted on lablab.ai | ⬜ Pending | Must be submitted there to be judged |

## Challenge 2 specifics

- **Vultr Serverless Inference is optional.** The deterministic planner is allowed.
- Vultr Cloud Compute VM is **required** and must be the central backend, not static hosting.
- Vultr GPUs are not available for this event.

## Judging criteria

| Criterion | Weight | Current strength |
|---|---|---|
| Application of Technology | 1 of 4 | ⚠️ **Weak without an inference key** — judged on model integration |
| Presentation | 1 of 4 | ✅ Strong — verified demo, honest claims |
| Business Value | 1 of 4 | ✅ Strong — order-to-cash, finance, procurement |
| Originality | 1 of 4 | ✅ Strong — verify-by-read-back + human approval gate |

**Interpretation:** you are *eligible* without an LLM key, but "Application of
Technology" explicitly scores how well a model is integrated. Running only the
deterministic planner leaves one quarter of the score on the table.

## Credit redemption (the correct process)

1. Enroll on lablab.ai first.
2. Redeem through the official coupon page: https://lablab.ai/redeem-coupon/vultrai-coupon-vultr-agent-rush-hackathon
3. The Vultr account email **must not have been used on a Vultr account before**.
4. After redeeming, the console should show **$200.00 remaining credit**.
5. A payment method is needed only to *keep* deployments after the event, but
   Vultr may still require identity verification before creating instances.

If the code reports "no longer valid", it was already consumed, expired, or the
account is ineligible. Contact lablab/Vultr support — do not create duplicate
accounts to re-claim credit.
