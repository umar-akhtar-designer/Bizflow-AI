from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context, iso
from app.api.serializers import customer_out, invoice_out, order_out
from app.db.session import get_db
from app.models import Customer, Invoice, Order
from app.schemas import CustomerCreate, CustomerUpdate
from app.services.audit import audit

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("")
def list_customers(
    search: str | None = None,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    query = select(Customer).where(Customer.business_id == ctx.business.id)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Customer.name).like(term),
                func.lower(Customer.email).like(term),
                func.lower(Customer.company).like(term),
            )
        )
    customers = db.scalars(query.order_by(Customer.name).limit(300)).all()
    return {"items": [customer_out(db, c) for c in customers], "total": len(customers)}


@router.post("", status_code=201)
def create_customer(
    payload: CustomerCreate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    customer = Customer(business_id=ctx.business.id, **payload.model_dump())
    db.add(customer)
    db.flush()
    audit(
        db,
        ctx.business.id,
        "customer.created",
        "customer",
        customer.id,
        {"name": customer.name},
        ctx.user.id,
    )
    db.commit()
    db.refresh(customer)
    return customer_out(db, customer)


@router.get("/{customer_id}")
def get_customer(
    customer_id: str,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    customer = db.get(Customer, customer_id)
    if not customer or customer.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Customer not found")
    orders = db.scalars(
        select(Order)
        .where(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .limit(25)
    ).all()
    invoices = db.scalars(
        select(Invoice)
        .where(Invoice.customer_id == customer.id)
        .order_by(Invoice.issued_at.desc())
        .limit(25)
    ).all()
    timeline = [
        {
            "type": "order",
            "title": f"Order {o.order_number}",
            "detail": f"{o.status} · {o.currency} {o.total:,.2f}",
            "at": iso(o.created_at),
        }
        for o in orders[:8]
    ] + [
        {
            "type": "invoice",
            "title": f"Invoice {i.invoice_number}",
            "detail": f"{i.status} · {i.currency} {i.total:,.2f}",
            "at": iso(i.issued_at),
        }
        for i in invoices[:8]
    ]
    timeline.sort(key=lambda item: item["at"] or "", reverse=True)
    return {
        **customer_out(db, customer),
        "orders": [order_out(db, o) for o in orders],
        "invoices": [invoice_out(db, i) for i in invoices],
        "timeline": timeline[:12],
    }


@router.patch("/{customer_id}")
def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    customer = db.get(Customer, customer_id)
    if not customer or customer.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(customer, field, value)
    audit(
        db,
        ctx.business.id,
        "customer.updated",
        "customer",
        customer.id,
        payload.model_dump(exclude_unset=True),
        ctx.user.id,
    )
    db.commit()
    db.refresh(customer)
    return customer_out(db, customer)
