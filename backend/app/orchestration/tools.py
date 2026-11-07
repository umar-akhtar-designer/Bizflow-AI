"""Controlled tool layer.

LLM output never touches SQL directly. Every step the orchestrator can run is
registered here with a fixed, validated contract and deterministic code.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Callable

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.agents import (
    AgentError,
    CustomerAgent,
    FinanceAgent,
    InventoryAgent,
    ReportingAgent,
    SalesAgent,
    VerificationError,
    find_customer,
    find_product,
)
from app.core.utils import as_utc, json_dumps, money, utcnow
from app.models import (
    ApprovalRequest,
    Business,
    Customer,
    InventoryMovement,
    Invoice,
    InvoiceItem,
    Order,
    OrderItem,
    Product,
    Sale,
    Workflow,
)
from app.services.audit import audit, notify
from app.services.orders import (
    BusinessRuleError,
    InsufficientStockError,
    next_sequence_number,
)
from app.services.reporting import report_summary

TOOL_REGISTRY: dict[str, Callable] = {}


def tool(name: str):
    def decorator(fn: Callable) -> Callable:
        TOOL_REGISTRY[name] = fn
        return fn

    return decorator


@dataclass
class ExecutionContext:
    db: Session
    business: Business
    workflow: Workflow
    user_id: str
    state: dict = field(default_factory=dict)


def _customer(ctx: ExecutionContext) -> Customer:
    customer = ctx.db.get(Customer, ctx.state.get("customer_id"))
    if not customer:
        raise AgentError("Customer could not be resolved")
    return customer


def _product(ctx: ExecutionContext) -> Product:
    product = ctx.db.get(Product, ctx.state.get("product_id"))
    if not product:
        raise AgentError("Product could not be resolved")
    return product


def _suggestions(ctx: ExecutionContext, model) -> str:
    names = ctx.db.scalars(
        select(model.name).where(model.business_id == ctx.business.id).limit(4)
    ).all()
    return ", ".join(names) if names else "none available"


@tool("customer.resolve")
def resolve_customer(ctx: ExecutionContext, params: dict) -> dict:
    hint = (params.get("name") or "").strip()
    if not hint:
        raise BusinessRuleError("No customer name was found in the instruction.")
    customer = find_customer(ctx.db, ctx.business.id, hint)
    if not customer:
        raise BusinessRuleError(
            f'I could not find a customer matching "{hint}". Known customers: {_suggestions(ctx, Customer)}.'
        )
    orders = ctx.db.scalar(
        select(func.count()).select_from(Order).where(Order.customer_id == customer.id)
    ) or 0
    outstanding = ctx.db.scalar(
        select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).where(
            Invoice.customer_id == customer.id,
            Invoice.status.in_(["pending", "partial"]),
        )
    ) or 0
    ctx.state["customer_id"] = customer.id
    ctx.state["customer_name"] = customer.name
    return {
        "customer_id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "company": customer.company,
        "prior_orders": orders,
        "outstanding_balance": money(outstanding),
    }


@tool("inventory.resolve_product")
def resolve_product(ctx: ExecutionContext, params: dict) -> dict:
    hint = (params.get("name") or "").strip()
    product = find_product(ctx.db, ctx.business.id, hint) if hint else None
    if not product:
        raise BusinessRuleError(
            f'I could not find a product matching "{hint or "the request"}". Catalog: {_suggestions(ctx, Product)}.'
        )
    ctx.state["product_id"] = product.id
    ctx.state["product_name"] = product.name
    return {
        "product_id": product.id,
        "name": product.name,
        "sku": product.sku,
        "unit_price": money(product.price),
        "stock_quantity": product.stock_quantity,
        "reorder_level": product.reorder_level,
        "status": "active" if product.status == "active" else product.status,
    }


@tool("inventory.validate_stock")
def validate_stock(ctx: ExecutionContext, params: dict) -> dict:
    product = _product(ctx)
    quantity = int(params.get("quantity") or ctx.state.get("quantity") or 1)
    ctx.db.refresh(product)
    ctx.state["quantity"] = quantity
    if quantity <= 0:
        raise BusinessRuleError("Order quantity must be greater than zero.")
    if product.stock_quantity < quantity:
        raise InsufficientStockError(
            f"Insufficient stock for {product.name}: requested {quantity}, "
            f"available {product.stock_quantity}. Workflow stopped before any records were created."
        )
    return {
        "product": product.name,
        "requested": quantity,
        "available": product.stock_quantity,
        "after_reservation": product.stock_quantity - quantity,
        "status": "sufficient",
    }


@tool("sales.calculate_totals")
def calculate_totals(ctx: ExecutionContext, params: dict) -> dict:
    product = _product(ctx)
    quantity = int(ctx.state["quantity"])
    totals = SalesAgent().calculate_totals(
        [(product.name, quantity, float(product.price))], ctx.business.tax_rate
    )
    ctx.state["totals"] = totals
    ctx.state["unit_price"] = money(product.price)
    return {**totals, "tax_rate": ctx.business.tax_rate}


@tool("sales.create_order")
def create_order_record(ctx: ExecutionContext, params: dict) -> dict:
    product = _product(ctx)
    customer = _customer(ctx)
    totals = ctx.state.get("totals")
    if not totals:
        raise AgentError("Pricing must be calculated before creating the order")
    order_number = next_sequence_number(ctx.db, Order, ctx.business.id, "ORD")
    order = Order(
        business_id=ctx.business.id,
        customer_id=customer.id,
        order_number=order_number,
        status="confirmed",
        subtotal=totals["subtotal"],
        tax=totals["tax"],
        total=totals["total"],
        currency=ctx.business.currency,
        channel="ai_manager",
        workflow_id=ctx.workflow.id,
        idempotency_key=ctx.workflow.idempotency_key,
    )
    ctx.db.add(order)
    ctx.db.flush()
    ctx.db.add(
        OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=ctx.state["quantity"],
            unit_price=ctx.state["unit_price"],
            line_total=totals["lines"][0]["line_total"],
        )
    )
    ctx.db.flush()
    ctx.state["order_id"] = order.id
    ctx.state["order_number"] = order.order_number
    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "total": order.total,
        "currency": order.currency,
    }


@tool("inventory.decrement")
def decrement_inventory(ctx: ExecutionContext, params: dict) -> dict:
    product = _product(ctx)
    quantity = int(ctx.state["quantity"])
    result = ctx.db.execute(
        update(Product)
        .where(
            Product.id == product.id,
            Product.stock_quantity >= quantity,
        )
        .values(stock_quantity=Product.stock_quantity - quantity)
    )
    if result.rowcount != 1:
        ctx.db.refresh(product)
        raise InsufficientStockError(
            f"Insufficient stock for {product.name}: requested {quantity}, "
            f"available {product.stock_quantity}. All order writes were rolled back."
        )
    ctx.db.refresh(product)
    ctx.state["stock_after"] = product.stock_quantity
    ctx.db.add(
        InventoryMovement(
            business_id=ctx.business.id,
            product_id=product.id,
            movement_type="out",
            quantity=quantity,
            stock_after=product.stock_quantity,
            reason="Sale via AI Business Manager",
            reference=ctx.state["order_number"],
            created_by=ctx.user_id,
        )
    )
    ctx.db.flush()
    return {
        "product": product.name,
        "quantity_removed": quantity,
        "stock_before": product.stock_quantity + quantity,
        "stock_after": product.stock_quantity,
        "movement": "out",
    }


@tool("sales.record_sale")
def record_sale(ctx: ExecutionContext, params: dict) -> dict:
    order = ctx.db.get(Order, ctx.state["order_id"])
    if not order:
        raise AgentError("Order record is missing")
    sale = Sale(
        business_id=ctx.business.id,
        order_id=order.id,
        customer_id=order.customer_id,
        amount=order.total,
        status="completed",
        sold_at=utcnow(),
    )
    ctx.db.add(sale)
    ctx.db.flush()
    ctx.state["sale_id"] = sale.id
    return {
        "sale_id": sale.id,
        "order_number": order.order_number,
        "amount": sale.amount,
        "status": sale.status,
    }


@tool("finance.generate_invoice")
def generate_invoice(ctx: ExecutionContext, params: dict) -> dict:
    order = ctx.db.get(Order, ctx.state["order_id"])
    if not order:
        raise AgentError("Order record is missing")
    invoice_number = next_sequence_number(
        ctx.db, Invoice, ctx.business.id, ctx.business.invoice_prefix or "INV"
    )
    invoice = Invoice(
        business_id=ctx.business.id,
        order_id=order.id,
        customer_id=order.customer_id,
        invoice_number=invoice_number,
        status="pending",
        subtotal=order.subtotal,
        tax=order.tax,
        total=order.total,
        currency=order.currency,
        due_date=utcnow() + timedelta(days=14),
        workflow_id=ctx.workflow.id,
    )
    ctx.db.add(invoice)
    ctx.db.flush()
    for item in order.items:
        ctx.db.add(
            InvoiceItem(
                invoice_id=invoice.id,
                description=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
        )
    ctx.db.flush()
    ctx.state["invoice_id"] = invoice.id
    ctx.state["invoice_number"] = invoice.invoice_number
    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "total": invoice.total,
        "tax": invoice.tax,
        "due_date": invoice.due_date,
        "status": invoice.status,
    }


@tool("customer.prepare_message")
def prepare_message(ctx: ExecutionContext, params: dict) -> dict:
    customer = _customer(ctx)
    product = _product(ctx)
    draft = CustomerAgent().draft_order_confirmation(
        customer_name=customer.name,
        business_name=ctx.business.name,
        order_number=ctx.state.get("order_number", "—"),
        total=ctx.state.get("totals", {}).get("total", 0),
        currency=ctx.business.currency,
        item_summary=f"{ctx.state.get('quantity')} × {product.name}",
        invoice_number=ctx.state.get("invoice_number", "—"),
    )
    approval = ApprovalRequest(
        business_id=ctx.business.id,
        workflow_id=ctx.workflow.id,
        action_type="send_customer_message",
        title=f"Send order confirmation to {customer.name}",
        description=(
            f"Prepared email to {customer.email or 'customer'} for order "
            f"{ctx.state.get('order_number')}. Message was NOT sent."
        ),
        payload_json=json_dumps(
            {
                "customer_id": customer.id,
                "customer_name": customer.name,
                "recipient": customer.email,
                "subject": draft["subject"],
                "body": draft["body"],
                "channel": draft["channel"],
                "order_id": ctx.state.get("order_id"),
                "order_number": ctx.state.get("order_number"),
                "delivery_status": "not_sent",
            }
        ),
        status="pending",
        requested_by=ctx.user_id,
    )
    ctx.db.add(approval)
    ctx.db.flush()
    notify(
        ctx.db,
        ctx.business.id,
        "Approval required: customer message",
        f"Draft for {customer.name} is waiting in the Approval Center.",
        level="approval",
        link="/app/approvals",
    )
    audit(
        ctx.db,
        ctx.business.id,
        "approval.requested",
        "approval_request",
        approval.id,
        {"action_type": approval.action_type},
        ctx.user_id,
    )
    ctx.state["approval_id"] = approval.id
    return {
        "approval_id": approval.id,
        "recipient": customer.email,
        "subject": draft["subject"],
        "body": draft["body"],
        "delivery_status": "blocked_pending_approval",
        "__verified__": True,
        "__verification_note__": "Draft prepared only — external delivery is blocked until a human approves.",
    }


@tool("reporting.verify_order")
def verify_order(ctx: ExecutionContext, params: dict) -> dict:
    totals = ctx.state.get("totals", {})
    result = ReportingAgent().verify_order(
        ctx.db,
        order_id=ctx.state["order_id"],
        expected_total=float(totals.get("total", 0)),
        expected_quantity=int(ctx.state["quantity"]),
        expected_stock=int(ctx.state["stock_after"]),
        product_id=ctx.state["product_id"],
    )
    ctx.state["verification"] = result
    ctx.workflow.verification_status = "verified"
    return {
        **result,
        "__verified__": True,
        "__verification_note__": f"{len(result['checks'])} independent read-back checks passed.",
    }


@tool("reporting.finalize")
def finalize(ctx: ExecutionContext, params: dict) -> dict:
    started = as_utc(ctx.workflow.started_at) or utcnow()
    finished = utcnow()
    seconds = max((finished - started).total_seconds(), 0.001)
    records = 0
    summary = ""
    if ctx.state.get("order_id"):
        records = 5
        baseline_minutes = 14
        saved = max(baseline_minutes - seconds / 60, 0)
        summary = (
            f"Order {ctx.state.get('order_number')} was completed for "
            f"{ctx.state.get('customer_name')} — {ctx.state.get('quantity')} × "
            f"{ctx.state.get('product_name')} — for {ctx.business.currency} "
            f"{ctx.state.get('totals', {}).get('total', 0):,.2f}. "
            f"Invoice {ctx.state.get('invoice_number')} was generated and 5 linked records were "
            f"independently verified. A customer message is prepared and waiting for human approval."
        )
    elif ctx.state.get("report"):
        metrics = ctx.state["report"].get("metrics", {})
        summary = (
            f"Business review complete: {ctx.business.currency} "
            f"{metrics.get('revenue', 0):,.2f} revenue across {metrics.get('orders', 0)} orders "
            f"in the last {ctx.state['report'].get('period_days', 7)} days, with "
            f"{metrics.get('low_stock_count', 0)} low-stock product(s) and "
            f"{ctx.business.currency} {metrics.get('outstanding', 0):,.2f} outstanding."
        )
    elif ctx.state.get("refund_approval_id"):
        summary = (
            "Refund prepared and held for approval. No money has moved yet. "
            "Approve it in the Approval Center to execute the refund."
        )
    elif ctx.state.get("generic_approval_id"):
        summary = (
            "Customer message prepared and held for approval. Nothing was delivered externally."
        )
    elif ctx.state.get("restock_approval_id"):
        low = ctx.state.get("low_stock") or []
        summary = (
            f"Restock plan prepared for {len(low)} low-stock product(s). "
            "A purchase approval is waiting in the Approval Center — no inventory or cash has moved yet."
        )
    elif ctx.state.get("low_stock") is not None:
        low = ctx.state["low_stock"]
        summary = f"Inventory audit complete. {len(low)} product(s) are at or below their reorder level."
    elif ctx.state.get("customer_history"):
        summary = f"Customer history for {ctx.state.get('customer_name')} compiled from live records."
    elif ctx.state.get("finance_summary"):
        fs = ctx.state["finance_summary"]
        summary = (
            f"{fs['open_invoices']} open invoice(s), {ctx.business.currency} "
            f"{fs['outstanding']:,.2f} outstanding and {ctx.business.currency} "
            f"{fs['overdue']:,.2f} overdue."
        )
    else:
        summary = "Workflow completed. Read-only analysis produced with no external side effects."

    ctx.workflow.summary = summary
    if ctx.state.get("verification"):
        ctx.workflow.verification_status = "verified"
    elif ctx.workflow.intent in {"report", "inventory_audit", "customer_lookup", "finance_summary"}:
        ctx.workflow.verification_status = "read_only"

    return {
        "summary": summary,
        "records_created": records,
        "duration_seconds": round(seconds, 2),
        "manual_baseline_minutes": 14 if ctx.state.get("order_id") else None,
        "estimated_time_saved_minutes": round(max(14 - seconds / 60, 0), 2)
        if ctx.state.get("order_id")
        else None,
        "measurement_note": "Baseline is an illustrative 14-minute manual order-to-cash estimate, not a timed user study."
        if ctx.state.get("order_id")
        else None,
        "__verified__": True,
        "__verification_note__": "Summary generated from persisted records.",
    }


@tool("inventory.low_stock")
def low_stock(ctx: ExecutionContext, params: dict) -> dict:
    items = InventoryAgent().low_stock(ctx.db, ctx.business.id)
    ctx.state["low_stock"] = items
    return {
        "items": items,
        "count": len(items),
        "total_restock_cost": money(sum(i["estimated_cost"] for i in items)),
    }


@tool("procurement.restock_request")
def restock_request(ctx: ExecutionContext, params: dict) -> dict:
    items = ctx.state.get("low_stock")
    if items is None:
        items = InventoryAgent().low_stock(ctx.db, ctx.business.id)
    if not items:
        return {"created": False, "message": "No products are below their reorder level."}
    total = money(sum(i["estimated_cost"] for i in items))
    approval = ApprovalRequest(
        business_id=ctx.business.id,
        workflow_id=ctx.workflow.id,
        action_type="restock_products",
        title=f"Restock {len(items)} low-stock product(s)",
        description=(
            f"Proposed purchase of {len(items)} SKUs for an estimated "
            f"{ctx.business.currency} {total:,.2f}. Stock will not change until approved."
        ),
        payload_json=json_dumps(
            {"items": items, "estimated_cost": total, "delivery_status": "not_executed"}
        ),
        status="pending",
        requested_by=ctx.user_id,
    )
    ctx.db.add(approval)
    ctx.db.flush()
    notify(
        ctx.db,
        ctx.business.id,
        "Approval required: restock purchase",
        f"{len(items)} product(s) need replenishment.",
        level="approval",
        link="/app/approvals",
    )
    audit(
        ctx.db,
        ctx.business.id,
        "approval.requested",
        "approval_request",
        approval.id,
        {"action_type": approval.action_type, "estimated_cost": total},
        ctx.user_id,
    )
    ctx.state["restock_approval_id"] = approval.id
    return {
        "approval_id": approval.id,
        "items": len(items),
        "estimated_cost": total,
        "status": "pending_approval",
        "message": "Restock purchase prepared. No inventory or money moved.",
        "__verified__": True,
        "__verification_note__": "Purchase proposal created; stock unchanged pending approval.",
    }


@tool("customer.history")
def customer_history(ctx: ExecutionContext, params: dict) -> dict:
    customer = _customer(ctx)
    orders = ctx.db.scalars(
        select(Order)
        .where(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .limit(10)
    ).all()
    invoices = ctx.db.scalars(
        select(Invoice)
        .where(Invoice.customer_id == customer.id)
        .order_by(Invoice.issued_at.desc())
        .limit(10)
    ).all()
    lifetime = sum(float(o.total) for o in orders)
    ctx.state["customer_history"] = True
    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "company": customer.company,
        },
        "orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "total": o.total,
                "created_at": o.created_at,
            }
            for o in orders
        ],
        "invoices": [
            {
                "id": i.id,
                "invoice_number": i.invoice_number,
                "status": i.status,
                "total": i.total,
                "amount_paid": i.amount_paid,
            }
            for i in invoices
        ],
        "lifetime_value": money(lifetime),
        "order_count": len(orders),
    }


@tool("finance.summary")
def finance_summary(ctx: ExecutionContext, params: dict) -> dict:
    data = FinanceAgent().outstanding(ctx.db, ctx.business.id)
    ctx.state["finance_summary"] = data
    return data


@tool("reporting.business_report")
def business_report(ctx: ExecutionContext, params: dict) -> dict:
    days = int(params.get("days") or 7)
    report = report_summary(ctx.db, ctx.business.id, days)
    ctx.state["report"] = report
    return report


@tool("finance.prepare_refund")
def prepare_refund(ctx: ExecutionContext, params: dict) -> dict:
    customer = _customer(ctx)
    invoice = ctx.db.scalar(
        select(Invoice)
        .where(Invoice.customer_id == customer.id, Invoice.amount_paid > 0)
        .order_by(Invoice.issued_at.desc())
    )
    if not invoice:
        raise BusinessRuleError(
            f"{customer.name} has no paid invoice available to refund."
        )
    amount = params.get("amount")
    amount = money(float(amount)) if amount else money(invoice.amount_paid)
    if amount > invoice.amount_paid + 0.001:
        raise BusinessRuleError(
            f"Refund amount exceeds paid balance of {invoice.amount_paid:.2f}."
        )
    approval = ApprovalRequest(
        business_id=ctx.business.id,
        workflow_id=ctx.workflow.id,
        action_type="refund_invoice",
        title=f"Refund {ctx.business.currency} {amount:,.2f} to {customer.name}",
        description=(
            f"Refund against invoice {invoice.invoice_number}. "
            "No money will move until this is approved."
        ),
        payload_json=json_dumps(
            {
                "invoice_id": invoice.id,
                "customer_id": customer.id,
                "amount": amount,
                "reason": params.get("reason") or "Requested via AI Business Manager",
            }
        ),
        status="pending",
        requested_by=ctx.user_id,
    )
    ctx.db.add(approval)
    ctx.db.flush()
    notify(
        ctx.db,
        ctx.business.id,
        "Approval required: refund",
        f"{ctx.business.currency} {amount:,.2f} refund for {customer.name}.",
        level="approval",
        link="/app/approvals",
    )
    audit(
        ctx.db,
        ctx.business.id,
        "approval.requested",
        "approval_request",
        approval.id,
        {"action_type": approval.action_type, "amount": amount},
        ctx.user_id,
    )
    ctx.state["refund_approval_id"] = approval.id
    return {
        "approval_id": approval.id,
        "invoice_number": invoice.invoice_number,
        "amount": amount,
        "currency": ctx.business.currency,
        "status": "pending_approval",
        "message": "Refund prepared. No money moved.",
        "__verified__": True,
        "__verification_note__": "Refund is pending human approval; no payment was executed.",
    }


@tool("customer.prepare_generic_message")
def prepare_generic_message(ctx: ExecutionContext, params: dict) -> dict:
    customer = _customer(ctx)
    topic = (params.get("topic") or "A quick update from our team.").strip()
    draft = {
        "subject": f"An update from {ctx.business.name}",
        "body": (
            f"Hi {customer.name},\n\n"
            f"We wanted to share a quick update with you:\n\n{topic}\n\n"
            "Reply to this email if you have any questions — we are happy to help.\n\n"
            f"— {ctx.business.name}"
        ),
        "channel": "email",
    }
    approval = ApprovalRequest(
        business_id=ctx.business.id,
        workflow_id=ctx.workflow.id,
        action_type="send_customer_message",
        title=f"Send message to {customer.name}",
        description=f"Prepared message to {customer.email or 'customer'}. Not sent.",
        payload_json=json_dumps(
            {
                "customer_id": customer.id,
                "customer_name": customer.name,
                "recipient": customer.email,
                "subject": draft["subject"],
                "body": draft["body"],
                "channel": "email",
                "delivery_status": "not_sent",
            }
        ),
        status="pending",
        requested_by=ctx.user_id,
    )
    ctx.db.add(approval)
    ctx.db.flush()
    notify(
        ctx.db,
        ctx.business.id,
        "Approval required: customer message",
        f"Draft for {customer.name} is waiting for review.",
        level="approval",
        link="/app/approvals",
    )
    ctx.state["generic_approval_id"] = approval.id
    return {
        "approval_id": approval.id,
        "recipient": customer.email,
        "subject": draft["subject"],
        "body": draft["body"],
        "delivery_status": "blocked_pending_approval",
        "__verified__": True,
        "__verification_note__": "Draft only — delivery is blocked pending approval.",
    }
