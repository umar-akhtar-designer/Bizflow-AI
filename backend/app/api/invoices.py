from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context, iso
from app.api.serializers import invoice_out
from app.core.utils import money, utcnow
from app.db.session import get_db
from app.models import Customer, Invoice, Payment
from app.schemas import PaymentCreate
from app.services.audit import audit, notify
from app.services.orders import BusinessRuleError, record_payment

router = APIRouter(tags=["finance"])


@router.get("/invoices")
def list_invoices(
    status: str | None = None,
    search: str | None = None,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    query = select(Invoice).where(Invoice.business_id == ctx.business.id)
    if status:
        query = query.where(Invoice.status == status)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.join(Customer, Customer.id == Invoice.customer_id).where(
            or_(
                func.lower(Invoice.invoice_number).like(term),
                func.lower(Customer.name).like(term),
            )
        )
    invoices = db.scalars(query.order_by(Invoice.issued_at.desc()).limit(300)).all()
    summary = _summary(db, ctx.business.id)
    return {
        "items": [invoice_out(db, i) for i in invoices],
        "total": len(invoices),
        "summary": summary,
    }


@router.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: str,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice or invoice.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    payments = db.scalars(
        select(Payment)
        .where(Payment.invoice_id == invoice.id)
        .order_by(Payment.paid_at.desc())
    ).all()
    return {
        **invoice_out(db, invoice, detail=True),
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "method": p.method,
                "reference": p.reference,
                "status": p.status,
                "paid_at": iso(p.paid_at),
            }
            for p in payments
        ],
    }


@router.post("/invoices/{invoice_id}/payments", status_code=201)
def add_payment(
    invoice_id: str,
    payload: PaymentCreate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice or invoice.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status in {"void", "refunded"}:
        raise HTTPException(status_code=400, detail="This invoice cannot accept payments")
    try:
        record_payment(db, invoice, payload.amount, payload.method, payload.reference)
        audit(
            db,
            ctx.business.id,
            "payment.recorded",
            "invoice",
            invoice.id,
            {"amount": payload.amount, "method": payload.method},
            ctx.user.id,
        )
        notify(
            db,
            ctx.business.id,
            "Payment recorded",
            f"{invoice.invoice_number} · {invoice.currency} {money(payload.amount):,.2f}",
            level="success",
            link="/app/finance",
        )
        db.commit()
        db.refresh(invoice)
        return invoice_out(db, invoice, detail=True)
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _summary(db: Session, business_id: str) -> dict:
    invoices = db.scalars(
        select(Invoice).where(Invoice.business_id == business_id)
    ).all()
    now = datetime.now(timezone.utc)
    outstanding = 0.0
    overdue = 0.0
    paid = 0.0
    aging = {"current": 0.0, "1-30": 0.0, "31-60": 0.0, "60+": 0.0}
    for invoice in invoices:
        balance = float(invoice.total - invoice.amount_paid)
        if invoice.status == "paid":
            paid += float(invoice.total)
        if invoice.status in {"pending", "partial"}:
            outstanding += balance
            due = invoice.due_date
            if due:
                due = due.replace(tzinfo=timezone.utc) if due.tzinfo is None else due
                days = (now - due).days
            else:
                days = 0
            if days <= 0:
                aging["current"] += balance
            elif days <= 30:
                aging["1-30"] += balance
            elif days <= 60:
                aging["31-60"] += balance
            else:
                aging["60+"] += balance
            if days > 0:
                overdue += balance
    months: dict[str, dict] = defaultdict(lambda: {"revenue": 0.0, "collected": 0.0})
    for invoice in invoices:
        key = invoice.issued_at.strftime("%Y-%m")
        months[key]["revenue"] += float(invoice.total)
        months[key]["collected"] += float(invoice.amount_paid)
    series = [
        {"month": key, "billed": round(value["revenue"], 2), "collected": round(value["collected"], 2)}
        for key, value in sorted(months.items())
    ][-6:]
    return {
        "total_billed": money(sum(float(i.total) for i in invoices)),
        "collected": money(paid + sum(float(i.amount_paid) for i in invoices if i.status not in {"paid"})),
        "outstanding": money(outstanding),
        "overdue": money(overdue),
        "open_invoices": sum(1 for i in invoices if i.status in {"pending", "partial"}),
        "paid_invoices": sum(1 for i in invoices if i.status == "paid"),
        "aging": {key: money(value) for key, value in aging.items()},
        "monthly_series": series,
    }


@router.get("/finance/summary")
def finance_summary(
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    data = _summary(db, ctx.business.id)
    expenses = db.scalar(
        select(func.coalesce(func.sum(func.abs(Payment.amount)), 0)).where(
            Payment.business_id == ctx.business.id, Payment.amount < 0
        )
    ) or 0
    data["refunds"] = money(expenses)
    data["net_revenue"] = money(data["collected"] - float(expenses))
    recent = db.scalars(
        select(Payment)
        .where(Payment.business_id == ctx.business.id)
        .order_by(Payment.paid_at.desc())
        .limit(8)
    ).all()
    data["recent_payments"] = [
        {
            "id": p.id,
            "amount": p.amount,
            "method": p.method,
            "status": p.status,
            "paid_at": iso(p.paid_at),
        }
        for p in recent
    ]
    return data
