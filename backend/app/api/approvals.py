from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context
from app.api.serializers import approval_out
from app.core.utils import json_dumps, json_loads, money, utcnow
from app.db.session import get_db
from app.models import (
    ApprovalRequest,
    Business,
    Customer,
    InventoryMovement,
    Invoice,
    Product,
)
from app.schemas import ApprovalDecision
from app.services.audit import audit, notify
from app.services.orders import BusinessRuleError, create_refund

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("")
def list_approvals(
    status: str | None = None,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    query = select(ApprovalRequest).where(
        ApprovalRequest.business_id == ctx.business.id
    )
    if status:
        query = query.where(ApprovalRequest.status == status)
    rows = db.scalars(query.order_by(ApprovalRequest.requested_at.desc()).limit(200)).all()
    pending = db.scalar(
        select(ApprovalRequest).where(
            ApprovalRequest.business_id == ctx.business.id,
            ApprovalRequest.status == "pending",
        )
    )
    return {
        "items": [approval_out(a) for a in rows],
        "total": len(rows),
        "pending_count": sum(1 for a in rows if a.status == "pending"),
    }


@router.get("/{approval_id}")
def get_approval(
    approval_id: str,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    approval = db.get(ApprovalRequest, approval_id)
    if not approval or approval.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Approval not found")
    return approval_out(approval)


@router.post("/{approval_id}/approve")
def approve(
    approval_id: str,
    payload: ApprovalDecision,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    approval = db.get(ApprovalRequest, approval_id)
    if not approval or approval.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=409, detail="This request has already been decided")
    biz = db.get(Business, ctx.business.id)
    payload_data = json_loads(approval.payload_json)
    try:
        if approval.action_type == "send_customer_message":
            payload_data["delivery_status"] = "queued_demo_outbox"
            payload_data["queued_at"] = utcnow().isoformat()
            approval.payload_json = json_dumps(payload_data)
            audit(
                db,
                ctx.business.id,
                "customer_message.queued",
                "approval_request",
                approval.id,
                {
                    "recipient": payload_data.get("recipient"),
                    "subject": payload_data.get("subject"),
                    "transport": "demo_outbox",
                },
                ctx.user.id,
            )
            notify(
                db,
                ctx.business.id,
                "Message queued",
                f"Approved message to {payload_data.get('customer_name', 'customer')} was queued in the demo outbox. No external provider is configured.",
                level="info",
                link="/app/approvals",
            )
        elif approval.action_type == "refund_invoice":
            invoice = db.get(Invoice, payload_data.get("invoice_id"))
            if not invoice or invoice.business_id != ctx.business.id:
                raise BusinessRuleError("Linked invoice no longer exists")
            result = create_refund(
                db,
                invoice,
                float(payload_data.get("amount") or 0),
                payload_data.get("reason") or "Approved refund",
            )
            payload_data["execution"] = result
            payload_data["delivery_status"] = "executed"
            approval.payload_json = json_dumps(payload_data)
            audit(
                db,
                ctx.business.id,
                "refund.executed",
                "invoice",
                invoice.id,
                {"amount": payload_data.get("amount"), "approval_id": approval.id},
                ctx.user.id,
            )
            notify(
                db,
                ctx.business.id,
                "Refund executed",
                f"{invoice.currency} {money(float(payload_data.get('amount') or 0)):,.2f} refunded on {invoice.invoice_number}.",
                level="success",
                link="/app/finance",
            )
        elif approval.action_type == "restock_products":
            items = payload_data.get("items") or []
            received = 0
            for item in items:
                product = db.get(Product, item.get("product_id"))
                quantity = int(
                    item.get("quantity") or item.get("recommended_restock") or 0
                )
                if not product or product.business_id != ctx.business.id or quantity <= 0:
                    continue
                product.stock_quantity += quantity
                received += quantity
                db.add(
                    InventoryMovement(
                        business_id=ctx.business.id,
                        product_id=product.id,
                        movement_type="in",
                        quantity=quantity,
                        stock_after=product.stock_quantity,
                        reason="Approved restock",
                        reference=f"APR-{approval.id[:8]}",
                        created_by=ctx.user.id,
                    )
                )
            payload_data["delivery_status"] = "executed"
            payload_data["units_received"] = received
            approval.payload_json = json_dumps(payload_data)
            audit(
                db,
                ctx.business.id,
                "restock.executed",
                "approval_request",
                approval.id,
                {"units_received": received, "sku_count": len(items)},
                ctx.user.id,
            )
            notify(
                db,
                ctx.business.id,
                "Restock applied",
                f"{received} units added across {len(items)} SKU(s).",
                level="success",
                link="/app/inventory",
            )
        else:
            raise BusinessRuleError(
                f"Unsupported approval action: {approval.action_type}"
            )
        approval.status = "approved"
        approval.decided_at = utcnow()
        approval.decided_by = ctx.user.id
        approval.decision_note = payload.note
        audit(
            db,
            ctx.business.id,
            "approval.approved",
            "approval_request",
            approval.id,
            {"action_type": approval.action_type},
            ctx.user.id,
        )
        db.commit()
        db.refresh(approval)
        return approval_out(approval)
    except BusinessRuleError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{approval_id}/reject")
def reject(
    approval_id: str,
    payload: ApprovalDecision,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    approval = db.get(ApprovalRequest, approval_id)
    if not approval or approval.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=409, detail="This request has already been decided")
    approval.status = "rejected"
    approval.decided_at = utcnow()
    approval.decided_by = ctx.user.id
    approval.decision_note = payload.note
    payload_data = json_loads(approval.payload_json)
    payload_data["delivery_status"] = "rejected"
    approval.payload_json = json_dumps(payload_data)
    audit(
        db,
        ctx.business.id,
        "approval.rejected",
        "approval_request",
        approval.id,
        {"action_type": approval.action_type, "note": payload.note},
        ctx.user.id,
    )
    db.commit()
    db.refresh(approval)
    return approval_out(approval)
