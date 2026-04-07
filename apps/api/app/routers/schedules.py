"""
routers/schedules.py — Scheduled trigger endpoints for WorkLine AI.

GET  /workflows/{id}/schedule   — get current schedule
PUT  /workflows/{id}/schedule   — set / update cron schedule
DELETE /workflows/{id}/schedule — remove schedule
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.auth.dependencies import get_current_user, require_editor
from app.db.session import get_db
from app.models import models
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["schedules"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ScheduleUpsertRequest(BaseModel):
    cron_expr: str                     # standard 5-field POSIX cron
    enabled: bool = True


class ScheduleResponse(BaseModel):
    id: int
    workflow_id: int
    org_id: Optional[int]
    cron_expr: str
    enabled: bool
    next_run_at: Optional[datetime]
    last_run_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helper — validate cron expression (5 fields)
# ---------------------------------------------------------------------------

def _validate_cron(cron_expr: str):
    print(f"[PY] schedules.py | _validate_cron | L52: System checking in")
    parts = cron_expr.strip().split()
    if len(parts) != 5:
        raise HTTPException(
            status_code=422,
            detail=f"cron_expr must have exactly 5 fields (min hour dom mon dow). Got: {cron_expr!r}"
        )
    
    try:
        from croniter import croniter
        if not croniter.is_valid(cron_expr):
            raise HTTPException(
                status_code=422,
                detail=f"Invalid cron expression logic: {cron_expr!r}. Check ranges (e.g. month cannot be 100)."
            )
    except ImportError:
        pass  # If croniter isn't installed, fall back to basic 5-part check

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/{workflow_id}/schedule", response_model=ScheduleResponse)
async def get_schedule(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return the current cron schedule for a workflow, or 404 if none set."""
    # Verify workflow belongs to this org
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.org_id == current_user.org_id,
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    trigger = db.query(models.ScheduledTrigger).filter_by(workflow_id=workflow_id).first()
    if not trigger:
        raise HTTPException(status_code=404, detail="No schedule set for this workflow")

    return trigger


@router.put("/{workflow_id}/schedule", response_model=ScheduleResponse, dependencies=[Depends(require_editor)])
async def upsert_schedule(
    workflow_id: int,
    body: ScheduleUpsertRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create or update the cron schedule for a deployed workflow."""
    _validate_cron(body.cron_expr)

    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.org_id == current_user.org_id,
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.status not in ("active", "draft"):
        raise HTTPException(status_code=400, detail="Cannot schedule an archived workflow")

    from app.core.scheduler import register_schedule
    try:
        trigger = register_schedule(
            db=db,
            workflow_id=workflow_id,
            cron_expr=body.cron_expr,
            org_id=current_user.org_id,
        )
        if not body.enabled:
            trigger.enabled = False
            db.commit()
            db.refresh(trigger)
            from app.core.scheduler import deregister_schedule
            deregister_schedule(db, workflow_id)
    except Exception as exc:
        logger.error("schedule upsert failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    return trigger


@router.delete("/{workflow_id}/schedule", status_code=204, dependencies=[Depends(require_editor)])
async def delete_schedule(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove the cron schedule for a workflow."""
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.org_id == current_user.org_id,
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    from app.core.scheduler import deregister_schedule
    deregister_schedule(db, workflow_id)

    trigger = db.query(models.ScheduledTrigger).filter_by(workflow_id=workflow_id).first()
    if trigger:
        db.delete(trigger)
        db.commit()