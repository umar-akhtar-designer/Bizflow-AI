from __future__ import annotations

from fastapi import APIRouter, Depends

from app.agents.base import PROFILES
from app.api.deps import AuthContext, get_auth_context
from app.orchestration.llm import ai_status

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
def list_agents(ctx: AuthContext = Depends(get_auth_context)):
    return {
        "items": [
            {
                "key": profile.key,
                "name": profile.name,
                "role": profile.role,
                "description": profile.description,
                "color": profile.color,
                "initials": profile.initials,
            }
            for profile in PROFILES.values()
        ],
        "ai": ai_status(),
    }
