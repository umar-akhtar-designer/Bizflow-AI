from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context, iso
from app.db.session import get_db
from app.orchestration.llm import ai_status
from app.schemas import SettingsUpdate
from app.services.audit import audit

router = APIRouter(tags=["settings"])


@router.get("/settings")
def get_settings(
    ctx: AuthContext = Depends(get_auth_context),
):
    business = ctx.business
    return {
        "business": {
            "id": business.id,
            "name": business.name,
            "legal_name": business.legal_name,
            "email": business.email,
            "phone": business.phone,
            "address": business.address,
            "currency": business.currency,
            "tax_rate": business.tax_rate,
            "low_stock_threshold": business.low_stock_threshold,
            "invoice_prefix": business.invoice_prefix,
            "ai_provider": business.ai_provider,
            "ai_model": business.ai_model,
        },
        "user": {
            "id": ctx.user.id,
            "full_name": ctx.user.full_name,
            "email": ctx.user.email,
            "avatar_color": ctx.user.avatar_color,
            "last_login_at": iso(ctx.user.last_login_at),
        },
        "role": ctx.role,
        "ai": ai_status(),
    }


@router.patch("/settings")
def update_settings(
    payload: SettingsUpdate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    business = ctx.business
    data = payload.model_dump(exclude_unset=True)
    user_fields = {"full_name"}
    for field, value in data.items():
        if value is None:
            continue
        if field in user_fields:
            setattr(ctx.user, field, value)
        elif field == "business_name":
            business.name = value
        elif hasattr(business, field):
            setattr(business, field, value)
    audit(
        db,
        business.id,
        "settings.updated",
        "business",
        business.id,
        {k: v for k, v in data.items() if k != "full_name"},
        ctx.user.id,
    )
    db.commit()
    db.refresh(business)
    return get_settings(ctx=ctx)


@router.get("/ai/status")
def get_ai_status():
    return ai_status()
