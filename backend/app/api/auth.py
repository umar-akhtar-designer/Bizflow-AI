from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context, iso
from app.core.security import create_access_token, hash_password, verify_password
from app.core.utils import utcnow
from app.db.session import get_db
from app.models import Business, BusinessMembership, User
from app.schemas import AuthResponse, LoginRequest, RegisterRequest
from app.services.audit import audit
from app.services.seed import seed_starter_business

router = APIRouter(prefix="/auth", tags=["auth"])

AVATAR_COLORS = ["#0B7A5C", "#B45309", "#1D4ED8", "#7C3AED", "#BE123C"]


def _payload(ctx: AuthContext) -> dict:
    return {
        "user": ctx.user,
        "business": ctx.business,
        "role": ctx.role,
    }


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        avatar_color=AVATAR_COLORS[len(email) % len(AVATAR_COLORS)],
    )
    business = Business(
        name=(payload.business_name or f"{payload.full_name.split()[0]}'s Business").strip(),
        email=email,
    )
    db.add(user)
    db.add(business)
    db.flush()
    db.add(
        BusinessMembership(user_id=user.id, business_id=business.id, role="owner")
    )
    db.flush()
    seed_starter_business(db, business)
    audit(
        db,
        business.id,
        "auth.registered",
        "user",
        user.id,
        {"email": email},
        user.id,
    )
    db.commit()
    token = create_access_token(user.id)
    return {
        "access_token": token,
        "user": user,
        "business": business,
        "role": "owner",
    }


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    membership = db.scalar(
        select(BusinessMembership)
        .where(BusinessMembership.user_id == user.id)
        .order_by(BusinessMembership.created_at)
    )
    if not membership:
        raise HTTPException(status_code=403, detail="No workspace linked to this account")
    business = db.get(Business, membership.business_id)
    user.last_login_at = utcnow()
    audit(
        db,
        business.id,
        "auth.login",
        "user",
        user.id,
        {"email": email},
        user.id,
    )
    db.commit()
    token = create_access_token(user.id)
    return {
        "access_token": token,
        "user": user,
        "business": business,
        "role": membership.role,
    }


@router.get("/me")
def me(ctx: AuthContext = Depends(get_auth_context)):
    return {
        "user": {
            "id": ctx.user.id,
            "email": ctx.user.email,
            "full_name": ctx.user.full_name,
            "avatar_color": ctx.user.avatar_color,
            "created_at": iso(ctx.user.created_at),
            "last_login_at": iso(ctx.user.last_login_at),
        },
        "business": {
            "id": ctx.business.id,
            "name": ctx.business.name,
            "currency": ctx.business.currency,
            "tax_rate": ctx.business.tax_rate,
            "low_stock_threshold": ctx.business.low_stock_threshold,
            "ai_provider": ctx.business.ai_provider,
            "ai_model": ctx.business.ai_model,
        },
        "role": ctx.role,
    }


@router.post("/logout")
def logout(
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    audit(db, ctx.business.id, "auth.logout", "user", ctx.user.id, {}, ctx.user.id)
    db.commit()
    return {"ok": True}
