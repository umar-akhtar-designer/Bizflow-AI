"""Reporting and dashboard aggregations, computed from persisted records."""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.utils import as_utc, json_loads, money, utcnow
from app.models import (
    ApprovalRequest,
    AuditLog,
    Customer,
    Invoice,
    Order,
    Product,
    ProductCategory,
    Sale,
    Workflow,
)


def _series(db: Session, business_id: str, days: int = 14) -> list[dict]:
    start = utcnow() - timedelta(days=days - 1)
    sales = db.scalars(
        select(Sale).where(Sale.business_id == business_id, Sale.sold_at >= start)
    ).all()
    buckets: dict[str, float] = defaultdict(float)
    orders: dict[str, int] = defaultdict(int)
    for sale in sales:
        key = sale.sold_at.strftime("%Y-%m-%d")
        buckets[key] += float(sale.amount)
        orders[key] += 1
    result = []
    for offset in range(days):
        day = (start + timedelta(days=offset)).strftime("%Y-%m-%d")
        result.append(
            {
                "date": day,
                "revenue": money(buckets.get(day, 0)),
                "orders": orders.get(day, 0),
            }
        )
    return result


def low_stock_products(db: Session, business_id: str, limit: int = 6) -> list[dict]:
    rows = db.scalars(
        select(Product)
        .where(
            Product.business_id == business_id,
            Product.stock_quantity <= Product.reorder_level,
        )
        .order_by(Product.stock_quantity.asc())
        .limit(limit)
    ).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "stock_quantity": p.stock_quantity,
            "reorder_level": p.reorder_level,
            "price": p.price,
        }
        for p in rows
    ]


def dashboard(db: Session, business_id: str) -> dict:
    revenue = db.scalar(
        select(func.coalesce(func.sum(Sale.amount), 0)).where(
            Sale.business_id == business_id
        )
    ) or 0
    order_count = db.scalar(
        select(func.count()).select_from(Order).where(Order.business_id == business_id)
    ) or 0
    customer_count = db.scalar(
        select(func.count()).select_from(Customer).where(Customer.business_id == business_id)
    ) or 0
    inventory_value = db.scalar(
        select(func.coalesce(func.sum(Product.price * Product.stock_quantity), 0)).where(
            Product.business_id == business_id
        )
    ) or 0
    pending = db.scalar(
        select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).where(
            Invoice.business_id == business_id,
            Invoice.status.in_(["pending", "partial"]),
        )
    ) or 0
    pending_count = db.scalar(
        select(func.count()).select_from(Invoice).where(
            Invoice.business_id == business_id,
            Invoice.status.in_(["pending", "partial"]),
        )
    ) or 0
    approvals = db.scalar(
        select(func.count()).select_from(ApprovalRequest).where(
            ApprovalRequest.business_id == business_id,
            ApprovalRequest.status == "pending",
        )
    ) or 0
    wf_total = db.scalar(
        select(func.count()).select_from(Workflow).where(Workflow.business_id == business_id)
    ) or 0
    wf_completed = db.scalar(
        select(func.count()).select_from(Workflow).where(
            Workflow.business_id == business_id, Workflow.status.in_(["completed", "partial"])
        )
    ) or 0
    wf_failed = db.scalar(
        select(func.count()).select_from(Workflow).where(
            Workflow.business_id == business_id, Workflow.status == "failed"
        )
    ) or 0

    category_rows = db.execute(
        select(
            ProductCategory.name,
            func.coalesce(func.sum(Product.stock_quantity * Product.price), 0),
        )
        .join(Product, Product.category_id == ProductCategory.id, isouter=True)
        .where(ProductCategory.business_id == business_id)
        .group_by(ProductCategory.name)
    ).all()

    recent_workflows = db.scalars(
        select(Workflow)
        .where(Workflow.business_id == business_id)
        .order_by(Workflow.created_at.desc())
        .limit(5)
    ).all()
    recent_activity = db.scalars(
        select(AuditLog)
        .where(AuditLog.business_id == business_id)
        .order_by(AuditLog.created_at.desc())
        .limit(8)
    ).all()

    series = _series(db, business_id, 14)
    today = series[-1]
    yesterday = series[-2] if len(series) > 1 else {"revenue": 0}

    return {
        "metrics": {
            "revenue": money(revenue),
            "orders": order_count,
            "customers": customer_count,
            "inventory_value": money(inventory_value),
            "pending_invoices_amount": money(pending),
            "pending_invoices_count": pending_count,
            "pending_approvals": approvals,
            "low_stock_count": len(low_stock_products(db, business_id, 100)),
            "today_revenue": today["revenue"],
            "today_orders": today["orders"],
            "revenue_change_pct": round(
                ((today["revenue"] - yesterday["revenue"]) / yesterday["revenue"] * 100)
                if yesterday["revenue"]
                else 0.0,
                1,
            ),
        },
        "workflow_stats": {
            "total": wf_total,
            "completed": wf_completed,
            "failed": wf_failed,
            "success_rate": round(wf_completed / wf_total * 100, 1) if wf_total else 0.0,
        },
        "revenue_series": series,
        "category_breakdown": [
            {"name": name, "value": money(value)} for name, value in category_rows
        ],
        "low_stock": low_stock_products(db, business_id),
        "recent_workflows": [
            {
                "id": w.id,
                "instruction": w.instruction,
                "status": w.status,
                "intent": w.intent,
                "verification_status": w.verification_status,
                "duration_ms": w.duration_ms,
                "created_at": w.created_at,
                "summary": w.summary,
            }
            for w in recent_workflows
        ],
        "recent_activity": [
            {
                "id": a.id,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "detail": json_loads(a.detail_json),
                "created_at": a.created_at,
            }
            for a in recent_activity
        ],
    }


def report_summary(db: Session, business_id: str, days: int = 7) -> dict:
    now = utcnow()
    start = now - timedelta(days=days)
    prev_start = start - timedelta(days=days)
    sales = db.scalars(
        select(Sale).where(Sale.business_id == business_id, Sale.sold_at >= prev_start)
    ).all()
    current = [s for s in sales if as_utc(s.sold_at) >= start]
    previous = [s for s in sales if as_utc(s.sold_at) < start]
    revenue = money(sum(float(s.amount) for s in current))
    prev_revenue = money(sum(float(s.amount) for s in previous))
    order_ids = [s.order_id for s in current]

    top_products: list[dict] = []
    units_sold = 0
    if order_ids:
        from app.models import OrderItem

        rows = db.execute(
            select(
                OrderItem.product_name,
                func.sum(OrderItem.quantity),
                func.sum(OrderItem.line_total),
            )
            .where(OrderItem.order_id.in_(order_ids))
            .group_by(OrderItem.product_name)
            .order_by(func.sum(OrderItem.line_total).desc())
            .limit(5)
        ).all()
        top_products = [
            {"name": name, "units": int(units or 0), "revenue": money(amount or 0)}
            for name, units, amount in rows
        ]
        units_sold = int(
            db.scalar(
                select(func.coalesce(func.sum(OrderItem.quantity), 0)).where(
                    OrderItem.order_id.in_(order_ids)
                )
            )
            or 0
        )

    outstanding = db.scalar(
        select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).where(
            Invoice.business_id == business_id,
            Invoice.status.in_(["pending", "partial"]),
        )
    ) or 0
    low = low_stock_products(db, business_id, 100)
    orders_count = len({s.order_id for s in current})
    avg_order = money(revenue / orders_count) if orders_count else 0.0
    trend = round(((revenue - prev_revenue) / prev_revenue * 100) if prev_revenue else 0.0, 1)

    insights = []
    if trend > 0:
        insights.append(
            f"Revenue is up {trend}% versus the previous {days}-day period, driven by {orders_count} completed orders."
        )
    elif trend < 0:
        insights.append(
            f"Revenue is down {abs(trend)}% versus the previous {days}-day period. Review the lowest-performing products."
        )
    else:
        insights.append(
            f"Revenue held steady across the last {days} days with {orders_count} completed orders."
        )
    if low:
        stock_value = money(sum(p["stock_quantity"] * p["price"] for p in low))
        insights.append(
            f"{len(low)} product(s) are at or below their reorder level, representing {stock_value:,.2f} in at-risk sales value."
        )
    if outstanding:
        insights.append(
            f"{money(outstanding):,.2f} remains outstanding across unpaid invoices. Prioritise follow-ups on the oldest balances."
        )
    if top_products:
        insights.append(
            f"{top_products[0]['name']} is the top revenue product with {top_products[0]['units']} units sold."
        )

    return {
        "period_days": days,
        "generated_at": now,
        "metrics": {
            "revenue": revenue,
            "previous_revenue": prev_revenue,
            "revenue_change_pct": trend,
            "orders": orders_count,
            "average_order_value": avg_order,
            "outstanding": money(outstanding),
            "low_stock_count": len(low),
            "units_sold": units_sold,
        },
        "series": _series(db, business_id, days),
        "top_products": top_products,
        "low_stock": low,
        "insights": insights,
        "source": "computed from database records",
    }
