from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=255)
    password: str = Field(min_length=8, max_length=128)
    business_name: str | None = Field(default=None, max_length=160)


class LoginRequest(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1, max_length=128)


class UserOut(ORMModel):
    id: str
    email: str
    full_name: str
    avatar_color: str
    created_at: datetime


class BusinessOut(ORMModel):
    id: str
    name: str
    currency: str
    tax_rate: float
    low_stock_threshold: int
    ai_provider: str
    ai_model: str | None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    business: BusinessOut
    role: str
