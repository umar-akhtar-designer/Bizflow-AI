"""Agent profiles and shared entity resolution."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.utils import normalize
from app.models import Customer, Product


@dataclass(frozen=True)
class AgentProfile:
    key: str
    name: str
    role: str
    description: str
    color: str
    initials: str


PROFILES: dict[str, AgentProfile] = {
    "inventory": AgentProfile(
        "inventory",
        "Inventory Agent",
        "Stock control",
        "Checks availability, updates quantities and flags reorder risk.",
        "#0B7A5C",
        "IN",
    ),
    "sales": AgentProfile(
        "sales",
        "Sales Agent",
        "Order desk",
        "Creates orders, calculates totals and records sales.",
        "#B45309",
        "SA",
    ),
    "customer": AgentProfile(
        "customer",
        "Customer Agent",
        "Relationship",
        "Resolves customers, pulls history and drafts communication.",
        "#1D4ED8",
        "CU",
    ),
    "finance": AgentProfile(
        "finance",
        "Finance Agent",
        "Invoicing",
        "Generates invoices, applies deterministic tax and tracks balances.",
        "#7C3AED",
        "FI",
    ),
    "reporting": AgentProfile(
        "reporting",
        "Reporting Agent",
        "Verification",
        "Reads back records, verifies outcomes and writes the final report.",
        "#0F766E",
        "RE",
    ),
}


class AgentError(Exception):
    """Raised when an agent cannot complete its task safely."""


def _overlap_score(haystack: str, needle: str) -> float:
    h = normalize(haystack)
    n = normalize(needle)
    if not n:
        return 0.0
    if h == n:
        return 100.0
    if n in h:
        return 80.0 + min(len(n), 15) / 15
    words = [w for w in n.split() if len(w) > 2]
    if not words:
        return 0.0
    return 55.0 * (sum(1 for w in words if w in h) / len(words))


def find_customer(db: Session, business_id: str, hint: str) -> Customer | None:
    customers = db.scalars(
        select(Customer).where(Customer.business_id == business_id)
    ).all()
    best: Customer | None = None
    best_score = 0.0
    for customer in customers:
        score = max(
            _overlap_score(hint, customer.name),
            _overlap_score(customer.name, hint),
            _overlap_score(hint, customer.email or ""),
        )
        if score > best_score:
            best, best_score = customer, score
    return best if best_score >= 55 else None


def find_product(db: Session, business_id: str, hint: str) -> Product | None:
    products = db.scalars(
        select(Product).where(Product.business_id == business_id)
    ).all()
    best: Product | None = None
    best_score = 0.0
    for product in products:
        score = max(
            _overlap_score(hint, product.name),
            _overlap_score(product.name, hint),
            _overlap_score(hint, product.sku),
            _overlap_score(product.sku, hint) * 0.98,
        )
        if score > best_score:
            best, best_score = product, score
    return best if best_score >= 50 else None
