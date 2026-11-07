"""Sales Agent — deterministic pricing and order summaries."""
from __future__ import annotations

from decimal import Decimal

from app.agents.base import AgentProfile, PROFILES
from app.core.utils import money


class SalesAgent:
    profile: AgentProfile = PROFILES["sales"]

    def calculate_totals(
        self, line_items: list[tuple[str, int, float]], tax_rate: float
    ) -> dict:
        subtotal = Decimal("0")
        lines = []
        for name, quantity, unit_price in line_items:
            line_total = Decimal(str(unit_price)) * quantity
            subtotal += line_total
            lines.append(
                {
                    "name": name,
                    "quantity": quantity,
                    "unit_price": money(unit_price),
                    "line_total": money(line_total),
                }
            )
        subtotal = Decimal(str(money(subtotal)))
        tax = Decimal(str(money(subtotal * Decimal(str(tax_rate)) / 100)))
        total = subtotal + tax
        return {
            "lines": lines,
            "subtotal": float(subtotal),
            "tax_rate": tax_rate,
            "tax": float(tax),
            "total": money(total),
        }
