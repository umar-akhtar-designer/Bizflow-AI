from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context, iso
from app.db.session import get_db
from app.models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    unread_only: bool = False,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    query = select(Notification).where(Notification.business_id == ctx.business.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    rows = db.scalars(query.order_by(Notification.created_at.desc()).limit(50)).all()
    unread = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.business_id == ctx.business.id,
            Notification.is_read.is_(False),
        )
    ) or 0
    return {
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "level": n.level,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": iso(n.created_at),
            }
            for n in rows
        ],
        "unread_count": unread,
    }


@router.post("/read-all")
def read_all(
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(Notification).where(
            Notification.business_id == ctx.business.id,
            Notification.is_read.is_(False),
        )
    ).all()
    for row in rows:
        row.is_read = True
    db.commit()
    return {"updated": len(rows)}


@router.post("/{notification_id}/read")
def read_one(
    notification_id: str,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    row = db.get(Notification, notification_id)
    if not row or row.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = True
    db.commit()
    return {"ok": True}
