"""Finance Agent — invoice and balance helpers."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agents.base import AgentProfile, PROFILES
from app.core.utils import money
from app.models import Invoice


class FinanceAgent:
    profile: AgentProfile = PROFILES["finance"]

    def outstanding(self, db: Session, business_id: str) -> dict:
        rows = db.scalars(
            select(Invoice).where(
                Invoice.business_id == business_id,
                Invoice.status.in_(["pending", "partial"]),
            )
        ).all()
        outstanding = money(sum(float(i.total - i.amount_paid) for i in rows))
        now = datetime.now(timezone.utc)
        overdue = money(
            sum(
                float(i.total - i.amount_paid)
                for i in rows
                if i.due_date
                and (
                    i.due_date.replace(tzinfo=timezone.utc)
                    if i.due_date.tzinfo is None
                    else i.due_date
                )
                < now
            )
        )
        return {
            "open_invoices": len(rows),
            "outstanding": outstanding,
            "overdue": overdue,
            "total_billed": money(
                db.scalar(
                    select(func.coalesce(func.sum(Invoice.total), 0)).where(
                        Invoice.business_id == business_id
                    )
                )
                or 0
            ),
        }
