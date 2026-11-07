from __future__ import annotations

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=60)
    company: str | None = Field(default=None, max_length=180)
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None
    notes: str | None = None
    status: str | None = None


class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(gt=0, le=100000)


class OrderCreate(BaseModel):
    customer_id: str
    items: list[OrderItemIn] = Field(min_length=1)
    notes: str | None = None
    idempotency_key: str | None = Field(default=None, max_length=80)


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|confirmed|processing|fulfilled|cancelled)$")
