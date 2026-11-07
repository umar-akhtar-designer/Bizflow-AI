from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_auth_context
from app.api.serializers import workflow_out
from app.core.config import settings
from app.db.session import get_db
from app.models import Workflow
from app.orchestration.executor import create_workflow, execute_workflow
from app.orchestration.planner import PlanError
from app.schemas import WorkflowCreate

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("")
def list_workflows(
    status: str | None = None,
    intent: str | None = None,
    limit: int = 50,
    offset: int = 0,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    query = select(Workflow).where(Workflow.business_id == ctx.business.id)
    if status:
        query = query.where(Workflow.status == status)
    if intent:
        query = query.where(Workflow.intent == intent)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(
        query.order_by(Workflow.created_at.desc()).offset(offset).limit(min(limit, 100))
    ).all()
    return {"items": [workflow_out(db, w) for w in rows], "total": total}


@router.post("", status_code=202)
def start_workflow(
    payload: WorkflowCreate,
    background_tasks: BackgroundTasks,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    try:
        workflow = create_workflow(
            db,
            business=ctx.business,
            user_id=ctx.user.id,
            instruction=payload.instruction.strip(),
            idempotency_key=payload.idempotency_key,
        )
    except PlanError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    background_tasks.add_task(execute_workflow, workflow.id)
    return workflow_out(db, workflow, detail=True)


@router.get("/{workflow_id}")
def get_workflow(
    workflow_id: str,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    workflow = db.get(Workflow, workflow_id)
    if not workflow or workflow.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {
        **workflow_out(db, workflow, detail=True),
        "step_delay_ms": settings.step_delay_ms,
    }


@router.post("/{workflow_id}/retry", status_code=202)
def retry_workflow(
    workflow_id: str,
    background_tasks: BackgroundTasks,
    ctx: AuthContext = Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    previous = db.get(Workflow, workflow_id)
    if not previous or previous.business_id != ctx.business.id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if previous.status in {"queued", "running"}:
        raise HTTPException(status_code=409, detail="This workflow is still running")
    try:
        workflow = create_workflow(
            db,
            business=ctx.business,
            user_id=ctx.user.id,
            instruction=previous.instruction,
            idempotency_key=f"retry-{uuid.uuid4().hex}",
        )
    except PlanError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    background_tasks.add_task(execute_workflow, workflow.id)
    return workflow_out(db, workflow, detail=True)
