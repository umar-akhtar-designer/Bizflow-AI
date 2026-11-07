"""Deterministic order, inventory and invoice operations.

These functions are shared by the REST API and the agent orchestrator, so the
same safeguards apply whether a human or an agent triggers them.
"""
from __future__ import annotations

from datetime import timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.utils import money, utcnow
from app.models import (
    Business,
    Customer,
    InventoryMovement,
    Invoice,
    InvoiceItem,
    Order,
    OrderItem,
    Product,
    Sale,
)


class BusinessRuleError(Exception):
    """A safe, user-facing business rule violation."""


class InsufficientStockError(BusinessRuleError):
    pass


def next_sequence_number(db: Session, model, business_id: str, prefix: str) -> str:
    count = (
        db.scalar(
            select(func.count()).select_from(model).where(model.business_id == business_id)
        )
        or 0
    )
    stamp = utcnow().strftime("%Y%m%d")
    for attempt in range(500):
        candidate = f"{prefix}-{stamp}-{count + 1 + attempt:04d}"
        exists = db.scalar(
            select(func.count()).select_from(model).where(
                model.order_number == candidate
                if model is Order
                else model.invoice_number == candidate
            )
        )
        if not exists:
            return candidate
    raise BusinessRuleError("Could not allocate a document number")


def create_order(
    db: Session,
    business: Business,
    customer: Customer,
    items: list[tuple[Product, int]],
    *,
    workflow_id: str | None = None,
    idempotency_key: str | None = None,
    channel: str = "ai_manager",
    notes: str | None = None,
    tax_rate: float | None = None,
) -> tuple[Order, Sale, Invoice]:
    """Create order, decrement stock, record sale and invoice atomically.

    The caller owns the transaction. Any exception rolls back every write.
    """
    if idempotency_key:
        existing = db.scalar(
            select(Order).where(
                Order.business_id == business.id,
                Order.idempotency_key == idempotency_key,
            )
        )
        if existing:
            sale = db.scalar(select(Sale).where(Sale.order_id == existing.id))
            invoice = db.scalar(select(Invoice).where(Invoice.order_id == existing.id))
            if sale and invoice:
                return existing, sale, invoice

    if not items:
        raise BusinessRuleError("An order needs at least one line item")

    # Re-validate and atomically decrement stock. The conditional UPDATE prevents
    # overselling even if two orders race for the same product.
    products: list[Product] = []
    for product, quantity in items:
        if quantity <= 0:
            raise BusinessRuleError("Order quantity must be greater than zero")
        result = db.execute(
            update(Product)
            .where(
                Product.id == product.id,
                Product.business_id == business.id,
                Product.stock_quantity >= quantity,
            )
            .values(stock_quantity=Product.stock_quantity - quantity)
        )
        if result.rowcount != 1:
            db.refresh(product)
            raise InsufficientStockError(
                f"Insufficient stock for {product.name}: requested {quantity}, "
                f"available {product.stock_quantity}."
            )
        db.refresh(product)
        products.append(product)

    order_number = next_sequence_number(db, Order, business.id, "ORD")
    order = Order(
        business_id=business.id,
        customer_id=customer.id,
        order_number=order_number,
        status="confirmed",
        currency=business.currency,
        channel=channel,
        notes=notes,
        workflow_id=workflow_id,
        idempotency_key=idempotency_key,
    )
    db.add(order)
    db.flush()

    subtotal = 0.0
    for product, quantity in items:
        line_total = money(product.price * quantity)
        subtotal += line_total
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                quantity=quantity,
                unit_price=money(product.price),
                line_total=line_total,
            )
        )
        db.add(
            InventoryMovement(
                business_id=business.id,
                product_id=product.id,
                movement_type="out",
                quantity=quantity,
                stock_after=product.stock_quantity,
                reason="Sale via order",
                reference=order_number,
            )
        )

    rate = business.tax_rate if tax_rate is None else tax_rate
    subtotal = money(subtotal)
    tax = money(subtotal * rate / 100)
    total = money(subtotal + tax)
    order.subtotal = subtotal
    order.tax = tax
    order.total = total

    sale = Sale(
        business_id=business.id,
        order_id=order.id,
        customer_id=customer.id,
        amount=total,
        status="completed",
        sold_at=utcnow(),
    )
    db.add(sale)

    invoice = Invoice(
        business_id=business.id,
        order_id=order.id,
        customer_id=customer.id,
        invoice_number=next_sequence_number(
            db, Invoice, business.id, business.invoice_prefix or "INV"
        ),
        status="pending",
        subtotal=subtotal,
        tax=tax,
        total=total,
        currency=business.currency,
        due_date=utcnow() + timedelta(days=14),
        workflow_id=workflow_id,
    )
    db.add(invoice)
    db.flush()
    for item in order.items:
        db.add(
            InvoiceItem(
                invoice_id=invoice.id,
                description=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
        )
    db.flush()
    return order, sale, invoice


def record_payment(
    db: Session,
    invoice: Invoice,
    amount: float,
    method: str = "bank_transfer",
    reference: str | None = None,
) -> Invoice:
    """Apply a payment; deterministic status transitions."""
    from app.models import Payment

    amount = money(amount)
    if amount <= 0:
        raise BusinessRuleError("Payment amount must be greater than zero")
    remaining = money(invoice.total - invoice.amount_paid)
    if amount > remaining + 0.001:
        raise BusinessRuleError(
            f"Payment exceeds the outstanding balance of {remaining:.2f}"
        )
    invoice.amount_paid = money(invoice.amount_paid + amount)
    if invoice.amount_paid >= invoice.total - 0.001:
        invoice.status = "paid"
        invoice.paid_at = utcnow()
    else:
        invoice.status = "partial"
    db.add(
        Payment(
            business_id=invoice.business_id,
            invoice_id=invoice.id,
            amount=amount,
            method=method,
            reference=reference,
            status="completed",
        )
    )
    db.flush()
    return invoice


def create_refund(db: Session, invoice: Invoice, amount: float, reason: str) -> dict:
    """Execute an approved refund. Kept deterministic and auditable."""
    from app.models import Payment

    amount = money(amount)
    if amount <= 0:
        raise BusinessRuleError("Refund amount must be greater than zero")
    if amount > invoice.amount_paid + 0.001:
        raise BusinessRuleError(
            f"Refund exceeds amount paid ({invoice.amount_paid:.2f})"
        )
    invoice.amount_paid = money(invoice.amount_paid - amount)
    invoice.status = "refunded" if invoice.amount_paid <= 0 else "partial"
    db.add(
        Payment(
            business_id=invoice.business_id,
            invoice_id=invoice.id,
            amount=-amount,
            method="refund",
            reference=reason[:80],
            status="completed",
        )
    )
    db.flush()
    return {"refunded": amount, "invoice_status": invoice.status}
