from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context, iso
from app.api.serializers import order_out
from app.db.session import get_db
from app.models import Customer, InventoryMovement, Invoice, Order, OrderItem, Product, Sale
from app.schemas import OrderCreate, OrderStatusUpdate
from app.services.audit import audit, notify
from app.services.orders import BusinessRuleError, create_order
from app.core.utils import as_utc, utcnow

router = APIRouter(tags=["sales"])


@router.get("/orders")
def list_orders(
    status: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    query = select(Order).where(Order.business_id == ctx.business.id)
    if status:
        query = query.where(Order.status == status)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.join(Customer, Customer.id == Order.customer_id).where(
            or_(
                func.lower(Order.order_number).like(term),
                func.lower(Customer.name).like(term),
            )
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    orders = db.scalars(
        query.order_by(Order.created_at.desc()).offset(offset).limit(min(limit, 200))
    ).all()
    return {"items": [order_out(db, o) for o in orders], "total": total}


@router.get("/orders/{order_id}")
def get_order(
    order_id: str,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    order = db.get(Order, order_id)
    if not order or order.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Order not found")
    return order_out(db, order, detail=True)


@router.post("/orders", status_code=201)
def create_order_endpoint(
    payload: OrderCreate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    customer = db.get(Customer, payload.customer_id)
    if not customer or customer.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Customer not found")
    quantities: dict[str, int] = {}
    for item in payload.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity
    items: list[tuple[Product, int]] = []
    for product_id, quantity in quantities.items():
        product = db.get(Product, product_id)
        if not product or product.business_id != ctx.business.id:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
        items.append((product, quantity))
    try:
        order, _sale, invoice = create_order(
            db,
            ctx.business,
            customer,
            items,
            idempotency_key=payload.idempotency_key,
            channel="dashboard",
            notes=payload.notes,
        )
        audit(
            db,
            ctx.business.id,
            "order.created",
            "order",
            order.id,
            {
                "order_number": order.order_number,
                "total": order.total,
                "invoice": invoice.invoice_number,
                "source": "dashboard",
            },
            ctx.user.id,
        )
        notify(
            db,
            ctx.business.id,
            "New order created",
            f"{order.order_number} · {ctx.business.currency} {order.total:,.2f} · {customer.name}",
            level="success",
            link=f"/app/orders/{order.id}",
        )
        db.commit()
        db.refresh(order)
        return order_out(db, order, detail=True)
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    order = db.get(Order, order_id)
    if not order or order.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Order not found")
    previous = order.status
    if previous == "cancelled" and payload.status != "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled orders cannot be reopened")
    if payload.status == "cancelled" and previous != "cancelled":
        invoice = db.scalar(select(Invoice).where(Invoice.order_id == order.id))
        # Money already collected makes cancellation a financial action: it must
        # go through a refund approval instead of silently voiding the ledger.
        if invoice and invoice.amount_paid > 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This order has recorded payments. Prepare a refund approval "
                    "before cancelling."
                ),
            )
        # Compensating transaction: put stock back and void financial records.
        for item in order.items:
            product = db.get(Product, item.product_id)
            if product:
                product.stock_quantity += item.quantity
                db.add(
                    InventoryMovement(
                        business_id=ctx.business.id,
                        product_id=product.id,
                        movement_type="in",
                        quantity=item.quantity,
                        stock_after=product.stock_quantity,
                        reason="Order cancelled — stock restored",
                        reference=order.order_number,
                        created_by=ctx.user.id,
                    )
                )
        if invoice:
            invoice.status = "void"
        sale = db.scalar(select(Sale).where(Sale.order_id == order.id))
        if sale:
            sale.status = "void"
    order.status = payload.status
    audit(
        db,
        ctx.business.id,
        "order.status_changed",
        "order",
        order.id,
        {"from": previous, "to": payload.status},
        ctx.user.id,
    )
    db.commit()
    db.refresh(order)
    return order_out(db, order, detail=True)


@router.get("/sales/analytics")
def sales_analytics(
    days: int = 30,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    from datetime import timedelta

    days = max(1, min(days, 365))
    start = utcnow() - timedelta(days=days - 1)
    sales = db.scalars(
        select(Sale).where(Sale.business_id == ctx.business.id, Sale.sold_at >= start)
    ).all()
    bucket: dict[str, dict] = {}
    for offset in range(days):
        key = (start + timedelta(days=offset)).strftime("%Y-%m-%d")
        bucket[key] = {"date": key, "revenue": 0.0, "orders": 0}
    for sale in sales:
        sold_at = as_utc(sale.sold_at)
        key = sold_at.strftime("%Y-%m-%d")
        if key in bucket:
            bucket[key]["revenue"] = round(bucket[key]["revenue"] + float(sale.amount), 2)
            bucket[key]["orders"] += 1

    order_ids = [s.order_id for s in sales]
    top_products = []
    if order_ids:
        rows = db.execute(
            select(
                OrderItem.product_name,
                func.sum(OrderItem.quantity),
                func.sum(OrderItem.line_total),
            )
            .where(OrderItem.order_id.in_(order_ids))
            .group_by(OrderItem.product_name)
            .order_by(func.sum(OrderItem.line_total).desc())
            .limit(6)
        ).all()
        top_products = [
            {"name": name, "units": int(units or 0), "revenue": round(float(amount or 0), 2)}
            for name, units, amount in rows
        ]

    status_counts = dict(
        db.execute(
            select(Order.status, func.count())
            .where(Order.business_id == ctx.business.id)
            .group_by(Order.status)
        ).all()
    )
    channel_counts = dict(
        db.execute(
            select(Order.channel, func.count())
            .where(Order.business_id == ctx.business.id)
            .group_by(Order.channel)
        ).all()
    )
    revenue = round(sum(float(s.amount) for s in sales), 2)
    return {
        "period_days": days,
        "revenue": revenue,
        "orders": len(sales),
        "average_order_value": round(revenue / len(sales), 2) if sales else 0,
        "series": list(bucket.values()),
        "top_products": top_products,
        "status_breakdown": [
            {"name": key, "value": value} for key, value in status_counts.items()
        ],
        "channel_breakdown": [
            {"name": key, "value": value} for key, value in channel_counts.items()
        ],
    }
