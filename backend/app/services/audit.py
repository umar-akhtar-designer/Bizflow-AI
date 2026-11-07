"""Audit and notification helpers."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.utils import json_dumps
from app.models import AuditLog, Notification


def audit(
    db: Session,
    business_id: str,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    detail: dict | None = None,
    user_id: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        business_id=business_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail_json=json_dumps(detail or {}),
    )
    db.add(entry)
    return entry


def notify(
    db: Session,
    business_id: str,
    title: str,
    message: str = "",
    level: str = "info",
    link: str | None = None,
) -> Notification:
    entry = Notification(
        business_id=business_id,
        title=title,
        message=message,
        level=level,
        link=link,
    )
    db.add(entry)
    return entry
