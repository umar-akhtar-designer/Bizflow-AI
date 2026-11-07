"""Reporting Agent — read-back verification and business summaries."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agents.base import AgentProfile, PROFILES
from app.core.utils import money
from app.models import InventoryMovement, Invoice, Order, OrderItem, Sale


class VerificationError(Exception):
    pass


class ReportingAgent:
    profile: AgentProfile = PROFILES["reporting"]

    def verify_order(
        self,
        db: Session,
        *,
        order_id: str,
        expected_total: float,
        expected_quantity: int,
        expected_stock: int,
        product_id: str,
    ) -> dict:
        order = db.get(Order, order_id)
        checks: list[dict] = []

        def check(name: str, passed: bool, detail: str) -> None:
            checks.append({"name": name, "passed": passed, "detail": detail})

        check("Order record persisted", order is not None, f"order_id={order_id}")
        if not order:
            raise VerificationError("Verification failed: order record is missing")
        items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
        total_qty = sum(i.quantity for i in items)
        check(
            "Line items match requested quantity",
            total_qty == expected_quantity,
            f"expected {expected_quantity}, found {total_qty}",
        )
        check(
            "Order total matches deterministic calculation",
            abs(float(order.total) - expected_total) < 0.01,
            f"expected {expected_total:.2f}, stored {float(order.total):.2f}",
        )
        sale = db.scalar(select(Sale).where(Sale.order_id == order.id))
        check(
            "Sales record linked to order",
            sale is not None and abs(float(sale.amount) - float(order.total)) < 0.01,
            f"sale amount={float(sale.amount):.2f}" if sale else "missing",
        )
        invoice = db.scalar(select(Invoice).where(Invoice.order_id == order.id))
        check(
            "Invoice generated and linked",
            invoice is not None and abs(float(invoice.total) - float(order.total)) < 0.01,
            f"invoice={invoice.invoice_number}" if invoice else "missing",
        )
        movement = db.scalar(
            select(InventoryMovement)
            .where(
                InventoryMovement.reference == order.order_number,
                InventoryMovement.product_id == product_id,
                InventoryMovement.movement_type == "out",
            )
            .order_by(InventoryMovement.created_at.desc())
        )
        check(
            "Inventory movement recorded",
            movement is not None
            and movement.stock_after == expected_stock
            and movement.quantity == expected_quantity,
            f"stock_after={movement.stock_after}" if movement else "missing",
        )
        passed = all(c["passed"] for c in checks)
        if not passed:
            raise VerificationError(
                "Verification failed: "
                + "; ".join(c["name"] for c in checks if not c["passed"])
            )
        return {"verified": True, "checks": checks, "checked_records": 5}

    def totals(self, db: Session, business_id: str) -> dict:
        revenue = db.scalar(
            select(func.coalesce(func.sum(Sale.amount), 0)).where(
                Sale.business_id == business_id
            )
        ) or 0
        return {"lifetime_revenue": money(revenue)}
