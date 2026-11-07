from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context
from app.db.session import get_db
from app.orchestration.llm import ai_status
from app.services.reporting import dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    data = dashboard(db, ctx.business.id)
    data["business"] = {
        "name": ctx.business.name,
        "currency": ctx.business.currency,
        "tax_rate": ctx.business.tax_rate,
    }
    data["ai"] = ai_status()
    return data
