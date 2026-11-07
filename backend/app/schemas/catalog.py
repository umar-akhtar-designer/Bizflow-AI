from __future__ import annotations

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    color: str = "#0B7A5C"


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    sku: str = Field(min_length=2, max_length=60)
    description: str | None = None
    category_id: str | None = None
    price: float = Field(ge=0)
    cost: float = Field(ge=0, default=0)
    stock_quantity: int = Field(ge=0, default=0)
    reorder_level: int = Field(ge=0, default=10)
    unit: str = "unit"


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = None
    category_id: str | None = None
    price: float | None = Field(default=None, ge=0)
    cost: float | None = Field(default=None, ge=0)
    reorder_level: int | None = Field(default=None, ge=0)
    status: str | None = None


class StockAdjustment(BaseModel):
    quantity: int = Field(gt=0, le=100000)
    movement_type: str = Field(pattern="^(in|out|adjustment)$")
    reason: str = Field(min_length=2, max_length=200)
