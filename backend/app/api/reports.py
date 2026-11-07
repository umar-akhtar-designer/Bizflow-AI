from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context
from app.db.session import get_db
from app.orchestration.llm import AIProviderError, ai_status, get_provider
from app.services.reporting import report_summary

router = APIRouter(prefix="/reports", tags=["reports"])


def _insight(report: dict) -> dict:
    provider = get_provider()
    fallback = " ".join(report.get("insights", []))
    if not provider:
        return {
            "text": fallback,
            "source": "computed",
            "label": "Computed from database records (deterministic mode — no Vultr key configured)",
            "model": None,
        }
    system = (
        "You are a concise business analyst for a small business operations platform. "
        "Use ONLY the supplied metrics. Do not invent numbers. Write 3 short sentences "
        "with one clear recommendation."
    )
    user = json.dumps(
        {
            "period_days": report.get("period_days"),
            "metrics": report.get("metrics"),
            "top_products": report.get("top_products"),
            "low_stock": report.get("low_stock")[:5],
            "computed_insights": report.get("insights"),
        },
        default=str,
    )
    try:
        result = provider.complete(system, user, max_tokens=260)
        return {
            "text": result.text,
            "source": "vultr",
            "label": f"Vultr Serverless Inference · {result.model}",
            "model": result.model,
            "tokens": result.tokens,
        }
    except AIProviderError:
        return {
            "text": fallback,
            "source": "computed",
            "label": "Computed summary — Vultr inference request failed; deterministic data retained",
            "model": None,
        }


@router.get("/summary")
def get_report(
    days: int = 7,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    days = max(1, min(days, 90))
    report = report_summary(db, ctx.business.id, days)
    report["ai"] = _insight(report)
    report["ai_status"] = ai_status()
    report["business"] = {
        "name": ctx.business.name,
        "currency": ctx.business.currency,
    }
    return report


@router.get("/ai-insight")
def get_insight(
    days: int = 7,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    days = max(1, min(days, 90))
    report = report_summary(db, ctx.business.id, days)
    return _insight(report)
