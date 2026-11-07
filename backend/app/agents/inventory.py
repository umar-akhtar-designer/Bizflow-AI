"""Inventory Agent — real stock reads and reorder recommendation logic."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.base import AgentProfile, PROFILES
from app.models import Product


class InventoryAgent:
    profile: AgentProfile = PROFILES["inventory"]

    def low_stock(self, db: Session, business_id: str, limit: int = 20) -> list[dict]:
        products = db.scalars(
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
                "product_id": p.id,
                "name": p.name,
                "sku": p.sku,
                "stock": p.stock_quantity,
                "reorder_level": p.reorder_level,
                "recommended_restock": max(p.reorder_level * 3 - p.stock_quantity, 0),
                "unit_cost": p.cost,
                "estimated_cost": round(max(p.reorder_level * 3 - p.stock_quantity, 0) * p.cost, 2),
            }
            for p in products
        ]
