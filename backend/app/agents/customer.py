"""Customer Agent — profile resolution and message drafting."""
from __future__ import annotations

from app.agents.base import AgentProfile, PROFILES


class CustomerAgent:
    profile: AgentProfile = PROFILES["customer"]

    def draft_order_confirmation(
        self,
        *,
        customer_name: str,
        business_name: str,
        order_number: str,
        total: float,
        currency: str,
        item_summary: str,
        invoice_number: str,
    ) -> dict:
        # Avoid a doubled period when the business name already ends in one.
        business_label = business_name.rstrip(". ")
        body = (
            f"Hi {customer_name},\n\n"
            f"Thank you for your order with {business_label}. We have confirmed "
            f"{order_number} for {item_summary}.\n\n"
            f"Order total: {currency} {total:,.2f}\n"
            f"Invoice: {invoice_number} (due in 14 days)\n\n"
            f"We will let you know as soon as your order is on its way.\n\n"
            f"— {business_name}"
        )
        return {
            "subject": f"Your {business_name} order {order_number} is confirmed",
            "body": body,
            "channel": "email",
            "status": "drafted",
        }
