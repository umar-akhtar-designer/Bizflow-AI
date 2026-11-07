from __future__ import annotations

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: str = Field(default="bank_transfer", max_length=30)
    reference: str | None = Field(default=None, max_length=80)


class WorkflowCreate(BaseModel):
    instruction: str = Field(min_length=3, max_length=2000)
    idempotency_key: str | None = Field(default=None, max_length=80)


class ApprovalDecision(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class SettingsUpdate(BaseModel):
    business_name: str | None = Field(default=None, min_length=2, max_length=180)
    legal_name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=8)
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    low_stock_threshold: int | None = Field(default=None, ge=0, le=100000)
    invoice_prefix: str | None = Field(default=None, max_length=12)
    ai_provider: str | None = None
    ai_model: str | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
