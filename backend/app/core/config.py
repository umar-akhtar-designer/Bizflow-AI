"""Environment-driven configuration for BizFlow AI.

No secret is ever hard-coded for production. Development defaults are safe
placeholders and are logged as such at startup.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]

try:  # Local development convenience; container env vars still take priority.
    from dotenv import load_dotenv

    load_dotenv(BACKEND_ROOT / ".env", override=False)
except Exception:  # pragma: no cover - dotenv is optional at runtime
    pass


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _csv(value: str | None, default: str) -> list[str]:
    return [item.strip() for item in (value or default).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "BizFlow AI"
    version: str = "1.0.0"
    environment: str = os.getenv("ENVIRONMENT", "development")
    database_url: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BACKEND_ROOT / 'bizflow.db'}"
    )
    jwt_secret: str = os.getenv(
        "JWT_SECRET", "dev-only-change-me-bizflow-2026-secret-key"
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )
    cors_origins: list[str] = None  # type: ignore[assignment]
    seed_demo_data: bool = _bool(os.getenv("SEED_DEMO_DATA"), True)

    # AI provider abstraction. "auto" uses Vultr only when a key exists.
    ai_provider: str = os.getenv("AI_PROVIDER", "auto")
    vultr_api_key: str = os.getenv("VULTR_INFERENCE_API_KEY", "")
    vultr_base_url: str = os.getenv(
        "VULTR_INFERENCE_BASE_URL", "https://api.vultrinference.com/v1"
    )
    vultr_model: str = os.getenv(
        "VULTR_MODEL", "llama-3.1-70b-instruct-fp8"
    )
    ai_timeout_seconds: float = float(os.getenv("AI_TIMEOUT_SECONDS", "25"))
    ai_max_retries: int = int(os.getenv("AI_MAX_RETRIES", "2"))

    # Demo pacing so the live execution timeline is legible.
    step_delay_ms: int = int(os.getenv("WORKFLOW_STEP_DELAY_MS", "320"))
    workflow_timeout_seconds: int = int(
        os.getenv("WORKFLOW_TIMEOUT_SECONDS", "120")
    )
    rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "180"))

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "cors_origins",
            _csv(
                os.getenv("CORS_ORIGINS"),
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080",
            ),
        )

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def vultr_enabled(self) -> bool:
        if self.ai_provider == "deterministic":
            return False
        if self.ai_provider == "vultr":
            return bool(self.vultr_api_key)
        return bool(self.vultr_api_key)


settings = Settings()
