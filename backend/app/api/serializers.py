"""Response serializers shared by API routes."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.utils import json_loads
from app.models import (
    AgentExecution,
    ApprovalRequest,
    Customer,
    Invoice,
    Order,
    Product,
    ProductCategory,
    Sale,
    Workflow,
    WorkflowTask,
)
from app.api.deps import iso


def product_out(db: Session, product: Product) -> dict:
    category = db.get(ProductCategory, product.category_id) if product.category_id else None
    margin = (
        round((product.price - product.cost) / product.price * 100, 1)
        if product.price
        else 0
    )
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "description": product.description,
        "category_id": product.category_id,
        "category": category.name if category else None,
        "category_color": category.color if category else None,
        "price": product.price,
        "cost": product.cost,
        "margin_pct": margin,
        "stock_quantity": product.stock_quantity,
        "reorder_level": product.reorder_level,
        "unit": product.unit,
        "status": product.status,
        "stock_status": (
            "out"
            if product.stock_quantity <= 0
            else "low"
            if product.stock_quantity <= product.reorder_level
            else "healthy"
        ),
        "created_at": iso(product.created_at),
        "updated_at": iso(product.updated_at),
    }


def customer_out(db: Session, customer: Customer) -> dict:
    orders = db.scalars(select(Order).where(Order.customer_id == customer.id)).all()
    invoices = db.scalars(
        select(Invoice).where(Invoice.customer_id == customer.id)
    ).all()
    lifetime = sum(float(o.total) for o in orders)
    outstanding = sum(
        float(i.total - i.amount_paid)
        for i in invoices
        if i.status in {"pending", "partial"}
    )
    last_order = max((o.created_at for o in orders), default=None)
    return {
        "id": customer.id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "company": customer.company,
        "address": customer.address,
        "notes": customer.notes,
        "status": customer.status,
        "order_count": len(orders),
        "lifetime_value": round(lifetime, 2),
        "outstanding": round(outstanding, 2),
        "last_order_at": iso(last_order),
        "created_at": iso(customer.created_at),
    }


def order_out(db: Session, order: Order, detail: bool = False) -> dict:
    customer = db.get(Customer, order.customer_id)
    invoice = db.scalar(select(Invoice).where(Invoice.order_id == order.id))
    data = {
        "id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "customer_name": customer.name if customer else "Unknown",
        "customer_company": customer.company if customer else None,
        "status": order.status,
        "subtotal": order.subtotal,
        "tax": order.tax,
        "total": order.total,
        "currency": order.currency,
        "channel": order.channel,
        "notes": order.notes,
        "workflow_id": order.workflow_id,
        "invoice_id": invoice.id if invoice else None,
        "invoice_status": invoice.status if invoice else None,
        "created_at": iso(order.created_at),
    }
    if detail:
        data["items"] = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": item.line_total,
            }
            for item in order.items
        ]
        data["invoice"] = invoice_out(db, invoice) if invoice else None
    return data


def invoice_out(db: Session, invoice: Invoice, detail: bool = False) -> dict:
    customer = db.get(Customer, invoice.customer_id)
    order = db.get(Order, invoice.order_id) if invoice.order_id else None
    data = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "customer_id": invoice.customer_id,
        "customer_name": customer.name if customer else "Unknown",
        "customer_company": customer.company if customer else None,
        "order_id": invoice.order_id,
        "order_number": order.order_number if order else None,
        "status": invoice.status,
        "subtotal": invoice.subtotal,
        "tax": invoice.tax,
        "total": invoice.total,
        "amount_paid": invoice.amount_paid,
        "balance": round(invoice.total - invoice.amount_paid, 2),
        "currency": invoice.currency,
        "due_date": iso(invoice.due_date),
        "issued_at": iso(invoice.issued_at),
        "paid_at": iso(invoice.paid_at),
        "workflow_id": invoice.workflow_id,
    }
    if detail:
        data["items"] = [
            {
                "id": item.id,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": item.line_total,
            }
            for item in invoice.items
        ]
    return data


def task_out(task: WorkflowTask) -> dict:
    return {
        "id": task.id,
        "sequence": task.sequence,
        "agent": task.agent,
        "action": task.action,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "input": json_loads(task.input_json),
        "result": json_loads(task.result_json),
        "error": task.error,
        "verified": task.verified,
        "verification_note": task.verification_note,
        "started_at": iso(task.started_at),
        "finished_at": iso(task.finished_at),
    }


def workflow_out(
    db: Session, workflow: Workflow, detail: bool = False
) -> dict:
    tasks = db.scalars(
        select(WorkflowTask)
        .where(WorkflowTask.workflow_id == workflow.id)
        .order_by(WorkflowTask.sequence)
    ).all()
    approvals = db.scalars(
        select(ApprovalRequest).where(ApprovalRequest.workflow_id == workflow.id)
    ).all()
    data = {
        "id": workflow.id,
        "instruction": workflow.instruction,
        "intent": workflow.intent,
        "status": workflow.status,
        "summary": workflow.summary,
        "error": workflow.error,
        "verification_status": workflow.verification_status,
        "ai_mode": workflow.ai_mode,
        "ai_model": workflow.ai_model,
        "tokens_used": workflow.tokens_used,
        "duration_ms": workflow.duration_ms,
        "started_at": iso(workflow.started_at),
        "finished_at": iso(workflow.finished_at),
        "created_at": iso(workflow.created_at),
        "task_count": len(tasks),
        "completed_tasks": sum(1 for t in tasks if t.status == "completed"),
        "approval_ids": [a.id for a in approvals],
        "plan": json_loads(workflow.plan_json, []),
    }
    if detail:
        data["tasks"] = [task_out(t) for t in tasks]
        data["executions"] = [
            {
                "id": item.id,
                "agent": item.agent,
                "tool": item.tool,
                "status": item.status,
                "latency_ms": item.latency_ms,
                "tokens_used": item.tokens_used,
                "output": json_loads(item.output_json),
                "error": item.error,
                "created_at": iso(item.created_at),
            }
            for item in db.scalars(
                select(AgentExecution)
                .where(AgentExecution.workflow_id == workflow.id)
                .order_by(AgentExecution.created_at)
            ).all()
        ]
        data["approvals"] = [approval_out(a) for a in approvals]
        orders = db.scalars(
            select(Order).where(Order.workflow_id == workflow.id)
        ).all()
        data["orders"] = [order_out(db, o) for o in orders]
        invoices = db.scalars(
            select(Invoice).where(Invoice.workflow_id == workflow.id)
        ).all()
        data["invoices"] = [invoice_out(db, i) for i in invoices]
    return data


def approval_out(approval: ApprovalRequest) -> dict:
    return {
        "id": approval.id,
        "workflow_id": approval.workflow_id,
        "action_type": approval.action_type,
        "title": approval.title,
        "description": approval.description,
        "payload": json_loads(approval.payload_json),
        "status": approval.status,
        "requested_by": approval.requested_by,
        "requested_at": iso(approval.requested_at),
        "decided_at": iso(approval.decided_at),
        "decided_by": approval.decided_by,
        "decision_note": approval.decision_note,
    }
