"""Natural-language planning into a dependency-aware, tool-bound execution plan.

The deterministic parser is always available. When a Vultr inference key is
configured, the model may refine intent/entity extraction, but it can only
select from registered tools — it cannot generate SQL or arbitrary actions.
"""
from __future__ import annotations

import logging
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.utils import normalize
from app.models import Business, Customer, Product
from app.orchestration.llm import AIProviderError, get_provider

logger = logging.getLogger("bizflow.planner")


class PlanError(Exception):
    pass


def _step(
    action: str,
    agent: str,
    title: str,
    description: str,
    params: dict | None = None,
    atomic_group: str | None = None,
) -> dict:
    step = {
        "action": action,
        "agent": agent,
        "title": title,
        "description": description,
        "params": params or {},
    }
    if atomic_group:
        step["atomic_group"] = atomic_group
    return step


def extract_quantity(text: str) -> int | None:
    patterns = [
        r"\b(\d{1,5})\s*(?:units?|pcs|pieces|items?|qty)\b",
        r"\bqty\s*[:=]?\s*(\d{1,5})\b",
        r"\b(\d{1,5})\s+of\b",
        r"\bx\s*(\d{1,5})\b",
    ]
    lowered = text.lower()
    for pattern in patterns:
        match = re.search(pattern, lowered)
        if match:
            value = int(match.group(1))
            if 0 < value <= 100000:
                return value
    return None


def _name_variants(name: str) -> list[str]:
    variants = {normalize(name)}
    for separator in ["—", "–", " - ", "|", "/"]:
        if separator in name:
            variants.add(normalize(name.split(separator)[0]))
    words = normalize(name).split()
    if words and len(words[0]) >= 4:
        variants.add(words[0])
    return [v for v in variants if v]


def extract_customer_hint(text: str, customers: list[Customer]) -> str:
    lowered = f" {normalize(text)} "
    for customer in customers:
        if normalize(customer.name) and f" {normalize(customer.name)} " in lowered:
            return customer.name
    for customer in customers:
        first = normalize(customer.name).split()[0] if customer.name else ""
        if len(first) >= 3 and re.search(rf"\b{re.escape(first)}\b", lowered):
            return customer.name
    match = re.search(
        r"(?:for|customer|to)\s+([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*)?)",
        text,
    )
    if match:
        candidate = match.group(1).strip()
        if normalize(candidate) not in {"the", "a", "an", "product", "order", "customer"}:
            return candidate
    return ""


def extract_product_hint(text: str, products: list[Product]) -> str:
    lowered = f" {normalize(text)} "
    best_name, best_len = "", 0
    for product in products:
        candidates = list(_name_variants(product.name))
        sku = normalize(product.sku)
        if sku:
            candidates.append(sku)
        for variant in candidates:
            if variant and f" {variant} " in lowered and len(variant) > best_len:
                best_name, best_len = product.name, len(variant)
    if best_name:
        return best_name
    match = re.search(
        r"(?:of|for)\s+([A-Za-z0-9][\w\s&'./-]{2,70}?)(?:\.|,|$|\s+(?:and|then|with|please)\b)",
        text,
        re.IGNORECASE,
    )
    if match:
        candidate = match.group(1).strip()
        if not re.fullmatch(r"\d+\s*(?:units?|pcs|pieces)?", candidate.lower()):
            return candidate
    return ""


def extract_message_topic(text: str, customer_hint: str = "") -> str:
    """Turn a messaging instruction into a clean body topic.

    Keeps the deterministic planner from echoing the whole command into the
    customer-facing draft. Falls back to the original instruction.
    """
    match = re.search(
        r"\b(?:about|regarding|saying|that says|with an update on)\b\s*(.+)$",
        text,
        re.IGNORECASE,
    )
    if match:
        topic = match.group(1).strip()
    else:
        topic = text
        if customer_hint:
            topic = re.sub(re.escape(customer_hint), " ", topic, flags=re.IGNORECASE)
        topic = re.sub(
            r"^\s*(?:please\s+)?(?:send|draft|write|prepare|compose|email|message|notify)"
            r"(?:\s+(?:a|an|the))?(?:\s+(?:message|email|note|update|follow[-\s]?up))?"
            r"(?:\s+(?:to|for))?\s*",
            "",
            topic,
            flags=re.IGNORECASE,
        ).strip(" .,:;-")
    topic = topic.strip()
    if not topic:
        return "A quick update from our team."
    return topic[0].upper() + topic[1:]


def _intent(text: str, quantity: int | None, customer: str, product: str) -> str:
    lowered = normalize(text)
    if any(word in lowered for word in ["refund", "chargeback", "credit note"]):
        return "refund"
    if any(word in lowered for word in ["restock", "reorder", "replenish", "purchase order"]):
        return "restock"
    order_words = [
        "order",
        "sell",
        "sold",
        "sale",
        "place",
        "process",
        "purchase",
        "invoice and",
        "bill",
    ]
    # Order intent wins when the instruction contains a complete order triple.
    # This prevents words like "confirmation message" from hijacking the workflow.
    if quantity and customer and product and any(word in lowered for word in order_words):
        return "order"
    if quantity and customer and product:
        return "order"
    if any(word in lowered for word in ["send message", "email", "message", "notify", "follow up"]):
        if customer:
            return "message"
    if any(word in lowered for word in ["low stock", "inventory", "stock level", "out of stock"]):
        return "inventory_audit"
    if any(word in lowered for word in ["history", "who is", "profile", "past orders"]):
        if customer:
            return "customer_lookup"
    if any(word in lowered for word in ["finance", "outstanding", "unpaid", "payments", "cash flow"]):
        return "finance_summary"
    if any(word in lowered for word in ["report", "summary", "performance", "trend", "how are sales"]):
        return "report"
    if customer and product and quantity:
        return "order"
    return "report"


def _ai_refine(db: Session, business: Business, instruction: str, base: dict) -> dict | None:
    provider = get_provider()
    if not provider:
        return None
    products = db.scalars(
        select(Product).where(Product.business_id == business.id).limit(40)
    ).all()
    customers = db.scalars(
        select(Customer).where(Customer.business_id == business.id).limit(40)
    ).all()
    system = (
        "You are the planning layer of a business operations platform. "
        "Return ONLY JSON with keys: intent, customer, product, quantity, days. "
        "intent must be one of order, inventory_audit, restock, customer_lookup, "
        "finance_summary, report, refund, message. Use exact names from the "
        "provided lists. Never invent products or customers."
    )
    user = (
        f"Instruction: {instruction}\n"
        f"Customers: {[c.name for c in customers]}\n"
        f"Products: {[p.name for p in products]}\n"
        f"Deterministic reading: {base}"
    )
    try:
        data, result = provider.complete_json(system, user, max_tokens=220)
        allowed = {
            "order",
            "inventory_audit",
            "restock",
            "customer_lookup",
            "finance_summary",
            "report",
            "refund",
            "message",
        }
        if data.get("intent") not in allowed:
            return None
        merged = dict(base)
        merged["intent"] = data["intent"]
        if isinstance(data.get("quantity"), int) and 0 < data["quantity"] < 100000:
            merged["quantity"] = data["quantity"]
        if data.get("customer"):
            merged["customer_hint"] = str(data["customer"])
        if data.get("product"):
            merged["product_hint"] = str(data["product"])
        if isinstance(data.get("days"), int) and 1 <= data["days"] <= 90:
            merged["days"] = data["days"]
        merged["ai_mode"] = "vultr"
        merged["ai_model"] = result.model
        merged["tokens_used"] = result.tokens
        return merged
    except AIProviderError as exc:
        logger.info("AI refinement skipped: %s", exc)
        return None


def build_plan(db: Session, business: Business, instruction: str) -> dict:
    instruction = instruction.strip()
    if len(instruction) < 3:
        raise PlanError("Please describe the business task you want to run.")
    products = db.scalars(
        select(Product).where(Product.business_id == business.id)
    ).all()
    customers = db.scalars(
        select(Customer).where(Customer.business_id == business.id)
    ).all()
    quantity = extract_quantity(instruction)
    customer_hint = extract_customer_hint(instruction, customers)
    product_hint = extract_product_hint(instruction, products)
    intent = _intent(instruction, quantity, customer_hint, product_hint)
    days = 1 if "daily" in instruction.lower() else 30 if "monthly" in instruction.lower() else 7
    refund_match = re.search(r"(?:refund|credit)\s+(?:of\s+)?\$?(\d+(?:\.\d{1,2})?)", instruction, re.I)

    base = {
        "intent": intent,
        "quantity": quantity,
        "customer_hint": customer_hint,
        "product_hint": product_hint,
        "days": days,
        "ai_mode": "deterministic",
        "ai_model": None,
        "tokens_used": 0,
    }
    if settings.vultr_enabled:
        refined = _ai_refine(db, business, instruction, base)
        if refined:
            base = refined
            intent = base["intent"]
            quantity = base.get("quantity")
            customer_hint = base.get("customer_hint") or customer_hint
            product_hint = base.get("product_hint") or product_hint

    plan: list[dict] = []
    if intent == "order":
        plan = [
            _step(
                "customer.resolve",
                "customer",
                "Identify customer",
                f'Match "{customer_hint or "customer"}" against the customer directory.',
                {"name": customer_hint},
            ),
            _step(
                "inventory.resolve_product",
                "inventory",
                "Retrieve product",
                f'Match "{product_hint or "product"}" against the catalog and read live stock.',
                {"name": product_hint},
            ),
            _step(
                "inventory.validate_stock",
                "inventory",
                "Validate available stock",
                f"Confirm at least {quantity or 1} unit(s) are available before writing anything.",
                {"quantity": quantity or 1},
            ),
            _step(
                "sales.calculate_totals",
                "sales",
                "Calculate order total",
                "Deterministic subtotal, tax and total calculation in the backend.",
            ),
            _step(
                "sales.create_order",
                "sales",
                "Create order record",
                "Insert the order and line items inside the atomic order transaction.",
                atomic_group="order_tx",
            ),
            _step(
                "inventory.decrement",
                "inventory",
                "Reserve inventory",
                "Atomic conditional stock decrement with a movement record.",
                atomic_group="order_tx",
            ),
            _step(
                "sales.record_sale",
                "sales",
                "Record sale",
                "Create the sales record linked to the order.",
                atomic_group="order_tx",
            ),
            _step(
                "finance.generate_invoice",
                "finance",
                "Generate invoice",
                "Create the invoice and line items with a 14-day due date.",
                atomic_group="order_tx",
            ),
            _step(
                "customer.prepare_message",
                "customer",
                "Prepare confirmation",
                "Draft the customer email. Sensitive action: delivery requires approval.",
            ),
            _step(
                "reporting.verify_order",
                "reporting",
                "Verify persisted records",
                "Read back order, items, sale, invoice and stock movement, then compare totals.",
            ),
            _step(
                "reporting.finalize",
                "reporting",
                "Write final report",
                "Summarise the verified execution with timings and next actions.",
            ),
        ]
    elif intent == "inventory_audit":
        plan = [
            _step(
                "inventory.low_stock",
                "inventory",
                "Audit stock levels",
                "Read live quantities and compare them with reorder levels.",
            ),
            _step(
                "reporting.finalize",
                "reporting",
                "Summarise inventory",
                "Report low-stock risk and recommended replenishment.",
            ),
        ]
    elif intent == "restock":
        plan = [
            _step(
                "inventory.low_stock",
                "inventory",
                "Identify replenishment needs",
                "Find products at or below their reorder level.",
            ),
            _step(
                "procurement.restock_request",
                "inventory",
                "Prepare purchase request",
                "Create an approval request. Inventory and cash remain unchanged.",
            ),
            _step(
                "reporting.finalize",
                "reporting",
                "Summarise restock plan",
                "Report the proposed purchase and approval requirement.",
            ),
        ]
    elif intent == "customer_lookup":
        plan = [
            _step(
                "customer.resolve",
                "customer",
                "Identify customer",
                f'Match "{customer_hint or "customer"}" against the directory.',
                {"name": customer_hint},
            ),
            _step(
                "customer.history",
                "customer",
                "Compile customer history",
                "Read orders, invoices and lifetime value from live records.",
            ),
            _step(
                "reporting.finalize",
                "reporting",
                "Summarise relationship",
                "Produce the customer briefing.",
            ),
        ]
    elif intent == "finance_summary":
        plan = [
            _step(
                "finance.summary",
                "finance",
                "Analyse receivables",
                "Compute open invoices, outstanding and overdue balances.",
            ),
            _step(
                "reporting.finalize",
                "reporting",
                "Summarise finances",
                "Report the receivables position.",
            ),
        ]
    elif intent == "refund":
        plan = [
            _step(
                "customer.resolve",
                "customer",
                "Identify customer",
                f'Match "{customer_hint or "customer"}" against the directory.',
                {"name": customer_hint},
            ),
            _step(
                "finance.prepare_refund",
                "finance",
                "Prepare refund",
                "Create a refund approval request. No money moves at this stage.",
                {"amount": float(refund_match.group(1)) if refund_match else None},
            ),
            _step(
                "reporting.finalize",
                "reporting",
                "Summarise approval request",
                "Report the pending approval and safety state.",
            ),
        ]
    elif intent == "message":
        plan = [
            _step(
                "customer.resolve",
                "customer",
                "Identify customer",
                f'Match "{customer_hint or "customer"}" against the directory.',
                {"name": customer_hint},
            ),
            _step(
                "customer.prepare_generic_message",
                "customer",
                "Prepare customer message",
                "Draft the message and create an approval request. No delivery yet.",
                {"topic": extract_message_topic(instruction, customer_hint)},
            ),
            _step(
                "reporting.finalize",
                "reporting",
                "Summarise draft",
                "Report that delivery is blocked pending approval.",
            ),
        ]
    else:
        intent = "report"
        plan = [
            _step(
                "reporting.business_report",
                "reporting",
                "Analyse business data",
                f"Aggregate the last {days} days of orders, invoices and inventory.",
                {"days": days},
            ),
            _step(
                "reporting.finalize",
                "reporting",
                "Write business report",
                "Summarise revenue, orders, stock risk and receivables.",
            ),
        ]

    return {
        "intent": intent,
        "plan": plan,
        "ai_mode": base["ai_mode"],
        "ai_model": base.get("ai_model"),
        "tokens_used": int(base.get("tokens_used") or 0),
    }
