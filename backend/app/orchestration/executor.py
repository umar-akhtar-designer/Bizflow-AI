"""Workflow creation and the live execution loop.

Writes for the order core are grouped in a single database transaction. If any
step fails, every write in that group is rolled back and the workflow stops with
an explicit error. A task is never marked complete before its tool succeeds and
its records can be verified.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.utils import json_dumps, json_loads, utcnow
from app.db.session import SessionLocal
from app.models import (
    AgentExecution,
    ApprovalRequest,
    Business,
    Order,
    Workflow,
    WorkflowTask,
)
from app.orchestration.llm import ai_status
from app.orchestration.planner import build_plan
from app.orchestration.tools import TOOL_REGISTRY, ExecutionContext
from app.services.audit import audit, notify

logger = logging.getLogger("bizflow.executor")


class StepFailure(Exception):
    def __init__(self, sequence: int, message: str):
        self.sequence = sequence
        self.message = message
        super().__init__(message)


def create_workflow(
    db: Session,
    *,
    business: Business,
    user_id: str,
    instruction: str,
    idempotency_key: str | None = None,
) -> Workflow:
    if idempotency_key:
        existing = db.scalar(
            select(Workflow).where(
                Workflow.business_id == business.id,
                Workflow.idempotency_key == idempotency_key,
            )
        )
        if existing:
            return existing

    planned = build_plan(db, business, instruction)
    status = ai_status()
    workflow = Workflow(
        business_id=business.id,
        user_id=user_id,
        instruction=instruction,
        intent=planned["intent"],
        status="queued",
        plan_json=json_dumps(planned["plan"]),
        ai_mode=planned["ai_mode"],
        ai_model=planned.get("ai_model") or (status.get("model") if planned["ai_mode"] == "vultr" else None),
        tokens_used=planned.get("tokens_used", 0),
        idempotency_key=idempotency_key,
    )
    db.add(workflow)
    db.flush()
    for index, step in enumerate(planned["plan"], start=1):
        db.add(
            WorkflowTask(
                workflow_id=workflow.id,
                sequence=index,
                agent=step["agent"],
                action=step["action"],
                title=step["title"],
                description=step["description"],
                status="pending",
                input_json=json_dumps(step.get("params") or {}),
                depends_on=str(index - 1) if index > 1 else None,
            )
        )
    audit(
        db,
        business.id,
        "workflow.created",
        "workflow",
        workflow.id,
        {"instruction": instruction[:240], "intent": planned["intent"]},
        user_id,
    )
    db.commit()
    db.refresh(workflow)
    return workflow


def _record_execution(
    db: Session,
    workflow: Workflow,
    task: WorkflowTask,
    *,
    status: str,
    latency_ms: int,
    output: dict,
    error: str | None = None,
) -> None:
    db.add(
        AgentExecution(
            workflow_id=workflow.id,
            task_id=task.id,
            agent=task.agent,
            tool=task.action,
            status=status,
            latency_ms=latency_ms,
            tokens_used=workflow.tokens_used if task.action.startswith("reporting.business") else 0,
            output_json=json_dumps(output),
            error=error,
        )
    )


def _run_tool(
    db: Session,
    ctx: ExecutionContext,
    workflow: Workflow,
    task: WorkflowTask,
    step: dict,
) -> dict:
    started = time.perf_counter()
    task.status = "running"
    task.started_at = utcnow()
    db.flush()
    try:
        fn = TOOL_REGISTRY.get(step["action"])
        if not fn:
            raise RuntimeError(f"Tool {step['action']} is not registered")
        result = fn(ctx, step.get("params") or {})
        verified = bool(result.pop("__verified__", False))
        note = result.pop("__verification_note__", None)
        task.status = "completed"
        task.result_json = json_dumps(result)
        task.verified = verified
        task.verification_note = note
        task.finished_at = utcnow()
        _record_execution(
            db,
            workflow,
            task,
            status="ok",
            latency_ms=int((time.perf_counter() - started) * 1000),
            output=result,
        )
        db.flush()
        return result
    except Exception as exc:
        task.status = "failed"
        task.error = str(exc)
        task.finished_at = utcnow()
        _record_execution(
            db,
            workflow,
            task,
            status="error",
            latency_ms=int((time.perf_counter() - started) * 1000),
            output={},
            error=str(exc),
        )
        db.flush()
        raise


def _pace() -> None:
    if settings.step_delay_ms:
        time.sleep(settings.step_delay_ms / 1000)


def execute_workflow(workflow_id: str) -> None:
    """Run a workflow in its own session. Safe to call from a background task."""
    db = SessionLocal()
    started = time.perf_counter()
    try:
        workflow = db.get(Workflow, workflow_id)
        # Only a queued workflow may start; this prevents duplicate background
        # execution when a request is retried with the same idempotency key.
        if not workflow or workflow.status != "queued":
            return
        business = db.get(Business, workflow.business_id)
        if not business:
            workflow.status = "failed"
            workflow.error = "Business not found"
            workflow.finished_at = utcnow()
            db.commit()
            return
        workflow.status = "running"
        workflow.started_at = utcnow()
        db.commit()
        db.refresh(workflow)

        plan = json_loads(workflow.plan_json, [])
        tasks = {
            task.sequence: task
            for task in db.scalars(
                select(WorkflowTask)
                .where(WorkflowTask.workflow_id == workflow.id)
                .order_by(WorkflowTask.sequence)
            ).all()
        }
        ctx = ExecutionContext(
            db=db,
            business=business,
            workflow=workflow,
            user_id=workflow.user_id,
            state={},
        )
        index = 0
        while index < len(plan):
            step = plan[index]
            sequence = index + 1
            if step.get("atomic_group"):
                group = []
                cursor = index
                while (
                    cursor < len(plan)
                    and plan[cursor].get("atomic_group") == step["atomic_group"]
                ):
                    group.append((cursor + 1, plan[cursor]))
                    cursor += 1
                _pace()
                try:
                    for seq, grouped_step in group:
                        _run_tool(db, ctx, workflow, tasks[seq], grouped_step)
                    db.commit()
                except Exception as exc:
                    db.rollback()
                    failure = StepFailure(
                        seq, str(exc) if str(exc) else "Atomic transaction failed"
                    )
                    _mark_group_failure(workflow_id, group, failure)
                    raise failure from exc
                index = cursor
                continue
            _pace()
            try:
                _run_tool(db, ctx, workflow, tasks[sequence], step)
                db.commit()
            except Exception as exc:
                db.rollback()
                _mark_single_failure(workflow_id, sequence, str(exc))
                raise StepFailure(sequence, str(exc)) from exc
            index += 1

        workflow = db.get(Workflow, workflow_id)
        workflow.status = "completed"
        workflow.finished_at = utcnow()
        workflow.duration_ms = int((time.perf_counter() - started) * 1000)
        if workflow.verification_status == "pending":
            workflow.verification_status = (
                "verified" if any(t.verified for t in tasks.values()) else "read_only"
            )
        audit(
            db,
            workflow.business_id,
            "workflow.completed",
            "workflow",
            workflow.id,
            {
                "intent": workflow.intent,
                "duration_ms": workflow.duration_ms,
                "verification_status": workflow.verification_status,
            },
            workflow.user_id,
        )
        notify(
            db,
            workflow.business_id,
            "Workflow completed",
            workflow.summary or workflow.instruction[:140],
            level="success",
            link=f"/app/workflows/{workflow.id}",
        )
        db.commit()
        logger.info("Workflow %s completed in %sms", workflow_id, workflow.duration_ms)
    except StepFailure as failure:
        _finalize_failure(db, workflow_id, failure.sequence, failure.message, started)
    except Exception as exc:  # noqa: BLE001 - must never leave a workflow hanging
        db.rollback()
        logger.exception("Workflow %s crashed", workflow_id)
        _finalize_failure(db, workflow_id, 0, f"Unexpected error: {exc}", started)
    finally:
        db.close()


def _mark_group_failure(workflow_id: str, group: list, failure: StepFailure) -> None:
    db = SessionLocal()
    try:
        tasks = {
            t.sequence: t
            for t in db.scalars(
                select(WorkflowTask).where(WorkflowTask.workflow_id == workflow_id)
            ).all()
        }
        for seq, _ in group:
            task = tasks.get(seq)
            if not task:
                continue
            if seq < failure.sequence:
                task.status = "rolled_back"
                task.error = "Rolled back with the atomic order transaction"
                task.finished_at = utcnow()
            elif seq == failure.sequence:
                task.status = "failed"
                task.error = failure.message
                task.finished_at = utcnow()
            else:
                task.status = "skipped"
                task.error = "Skipped after an earlier step failed"
        db.commit()
    finally:
        db.close()


def _mark_single_failure(workflow_id: str, sequence: int, message: str) -> None:
    db = SessionLocal()
    try:
        task = db.scalar(
            select(WorkflowTask).where(
                WorkflowTask.workflow_id == workflow_id,
                WorkflowTask.sequence == sequence,
            )
        )
        if task:
            task.status = "failed"
            task.error = message
            task.finished_at = utcnow()
            db.add(
                AgentExecution(
                    workflow_id=workflow_id,
                    task_id=task.id,
                    agent=task.agent,
                    tool=task.action,
                    status="error",
                    latency_ms=0,
                    output_json="{}",
                    error=message,
                )
            )
        remaining = db.scalars(
            select(WorkflowTask).where(
                WorkflowTask.workflow_id == workflow_id,
                WorkflowTask.sequence > sequence,
                WorkflowTask.status == "pending",
            )
        ).all()
        for task in remaining:
            task.status = "skipped"
            task.error = "Skipped after an earlier step failed"
        db.commit()
    finally:
        db.close()


def _finalize_failure(
    db: Session, workflow_id: str, sequence: int, message: str, started: float
) -> None:
    try:
        db.rollback()
        workflow = db.get(Workflow, workflow_id)
        if not workflow:
            return
        workflow.status = "failed"
        workflow.error = message
        workflow.finished_at = utcnow()
        workflow.duration_ms = int((time.perf_counter() - started) * 1000)
        workflow.verification_status = "failed"
        task = db.scalar(
            select(WorkflowTask).where(
                WorkflowTask.workflow_id == workflow.id,
                WorkflowTask.sequence == sequence,
            )
        )
        if task and task.status not in {"failed", "rolled_back"}:
            task.status = "failed"
            task.error = message
            task.finished_at = utcnow()
        audit(
            db,
            workflow.business_id,
            "workflow.failed",
            "workflow",
            workflow.id,
            {"error": message[:400], "task_sequence": sequence},
            workflow.user_id,
        )
        notify(
            db,
            workflow.business_id,
            "Workflow stopped safely",
            message[:240],
            level="warning",
            link=f"/app/workflows/{workflow.id}",
        )
        db.commit()
    finally:
        pass
