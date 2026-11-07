"""AI inference provider abstraction.

Vultr Serverless Inference exposes an OpenAI-compatible chat completions API.
When no key is configured the platform runs its deterministic planner and
clearly labels the mode — it never claims a mock response came from a model.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger("bizflow.ai")


@dataclass
class AIResult:
    text: str
    model: str
    provider: str
    tokens: int = 0


class AIProviderError(Exception):
    pass


class VultrProvider:
    provider = "vultr"

    def __init__(self) -> None:
        self.api_key = settings.vultr_api_key
        self.base_url = settings.vultr_base_url.rstrip("/")
        self.model = settings.vultr_model

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def complete(self, system: str, user: str, max_tokens: int = 500) -> AIResult:
        if not self.available:
            raise AIProviderError("Vultr inference is not configured")
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens,
        }
        last_error: Exception | None = None
        for attempt in range(settings.ai_max_retries + 1):
            try:
                with httpx.Client(timeout=settings.ai_timeout_seconds) as client:
                    response = client.post(
                        f"{self.base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json=payload,
                    )
                    response.raise_for_status()
                    data = response.json()
                message = data["choices"][0]["message"]["content"]
                usage = data.get("usage") or {}
                return AIResult(
                    text=message.strip(),
                    model=data.get("model") or self.model,
                    provider=self.provider,
                    tokens=int(usage.get("total_tokens") or 0),
                )
            except Exception as exc:  # noqa: BLE001 - retried and logged safely
                last_error = exc
                logger.warning(
                    "Vultr inference attempt %s failed: %s",
                    attempt + 1,
                    type(exc).__name__,
                )
        raise AIProviderError(
            f"Vultr inference unavailable after retries ({type(last_error).__name__})"
        )

    def complete_json(self, system: str, user: str, max_tokens: int = 500) -> tuple[dict, AIResult]:
        result = self.complete(system, user, max_tokens)
        text = result.text
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise AIProviderError("Model did not return JSON")
        try:
            return json.loads(text[start : end + 1]), result
        except json.JSONDecodeError as exc:
            raise AIProviderError("Model returned invalid JSON") from exc


def get_provider() -> VultrProvider | None:
    if settings.vultr_enabled:
        provider = VultrProvider()
        if provider.available:
            return provider
    return None


def ai_status() -> dict:
    provider = get_provider()
    if provider:
        return {
            "mode": "vultr",
            "provider": "Vultr Serverless Inference",
            "model": provider.model,
            "available": True,
            "label": "Vultr Serverless Inference connected",
        }
    return {
        "mode": "deterministic",
        "provider": "Built-in deterministic planner",
        "model": None,
        "available": False,
        "label": "Demo mode: deterministic planner (no Vultr key configured)",
    }
