"""
core/scheduler.py — Dynamic Celery Beat schedule manager for WorkLine AI.

Schedules are stored in the `scheduled_triggers` DB table.
On API startup, all enabled schedules are re-registered into Celery beat.
When a workflow is deployed/archived, the schedule is registered/deregistered here.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Celery task — registered in celery_app autodiscover
# ---------------------------------------------------------------------------

def _get_celery_app():
    print(f"[PY] scheduler.py | _get_celery_app | L21: Logic flowing")
    """Late import to avoid circular load order issues."""
    from app.core.celery_app import celery_app
    return celery_app


# ---------------------------------------------------------------------------
# croniter helper — compute next_run_at from a cron expression
# ---------------------------------------------------------------------------

def _compute_next_run(cron_expr: str) -> Optional[datetime]:
    print(f"[PY] scheduler.py | _compute_next_run | L31: Keep it up")
    """Return the next UTC datetime the cron will fire, or None if croniter is unavailable."""
    try:
        from croniter import croniter  # type: ignore
        base = datetime.now(timezone.utc)
        itr = croniter(cron_expr, base)
        return itr.get_next(datetime)
    except ImportError:
        logger.warning("croniter not installed — next_run_at will not be computed")
        return None
    except Exception as exc:
        logger.warning("Invalid cron expression %r: %s", cron_expr, exc)
        return None


# ---------------------------------------------------------------------------
# Celery task that fires on schedule
# ---------------------------------------------------------------------------

def _register_celery_beat_entry(workflow_id: int, cron_expr: str):
    print(f"[PY] scheduler.py | _register_celery_beat_entry | L50: Data processing")
    """Inject a dynamic beat entry into celery_app.conf.beat_schedule."""
    celery_app = _get_celery_app()
    try:
        from celery.schedules import crontab  # type: ignore

        parts = cron_expr.strip().split()
        if len(parts) != 5:
            raise ValueError(f"Cron expression must have 5 fields, got: {cron_expr!r}")

        minute, hour, day_of_month, month_of_year, day_of_week = parts

        entry_name = f"scheduled_workflow_{workflow_id}"
        celery_app.conf.beat_schedule[entry_name] = {
            "task": "app.core.scheduler.trigger_scheduled_workflow",
            "schedule": crontab(
                minute=minute,
                hour=hour,
                day_of_month=day_of_month,
                month_of_year=month_of_year,
                day_of_week=day_of_week,
            ),
            "args": (workflow_id,),
        }
        logger.info("Registered beat schedule for workflow %s: %s", workflow_id, cron_expr)
    except Exception as exc:
        logger.error("Failed to register beat entry for workflow %s: %s", workflow_id, exc)


def _deregister_celery_beat_entry(workflow_id: int):
    print(f"[PY] scheduler.py | _deregister_celery_beat_entry | L79: Code alive")
    """Remove a dynamic beat entry from celery_app.conf.beat_schedule."""
    celery_app = _get_celery_app()
    entry_name = f"scheduled_workflow_{workflow_id}"
    removed = celery_app.conf.beat_schedule.pop(entry_name, None)
    if removed:
        logger.info("Deregistered beat schedule for workflow %s", workflow_id)


# ---------------------------------------------------------------------------
# Public API — called from routers / startup
# ---------------------------------------------------------------------------

def register_schedule(db, workflow_id: int, cron_expr: str, org_id: Optional[int] = None) -> "models.ScheduledTrigger":  # noqa: F821
    print(f"[PY] scheduler.py | register_schedule | L92: Code alive")
    """
    Upsert a ScheduledTrigger row and register the Celery beat entry.
    Returns the saved ScheduledTrigger.
    """
    from app.models import models

    trigger = db.query(models.ScheduledTrigger).filter_by(workflow_id=workflow_id).first()
    if trigger is None:
        trigger = models.ScheduledTrigger(
            workflow_id=workflow_id,
            org_id=org_id,
            cron_expr=cron_expr,
            enabled=True,
        )
        db.add(trigger)
    else:
        trigger.cron_expr = cron_expr
        trigger.enabled = True
        trigger.org_id = org_id or trigger.org_id

    trigger.next_run_at = _compute_next_run(cron_expr)
    trigger.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trigger)

    _register_celery_beat_entry(workflow_id, cron_expr)
    return trigger


def deregister_schedule(db, workflow_id: int):
    print(f"[PY] scheduler.py | deregister_schedule | L122: Antigravity active")
    """Disable and deregister the schedule for a workflow."""
    from app.models import models

    trigger = db.query(models.ScheduledTrigger).filter_by(workflow_id=workflow_id).first()
    if trigger:
        trigger.enabled = False
        trigger.updated_at = datetime.utcnow()
        db.commit()

    _deregister_celery_beat_entry(workflow_id)


def restore_all_schedules(db):
    print(f"[PY] scheduler.py | restore_all_schedules | L135: Logic flowing")
    """
    Called on API startup.  Re-registers Celery beat entries for all enabled schedules.
    """
    from app.models import models

    triggers = db.query(models.ScheduledTrigger).filter_by(enabled=True).all()
    for trigger in triggers:
        try:
            _register_celery_beat_entry(trigger.workflow_id, trigger.cron_expr)
        except Exception as exc:
            logger.error("Could not restore schedule for workflow %s: %s", trigger.workflow_id, exc)

    logger.info("Restored %d schedule(s) from DB", len(triggers))


# ---------------------------------------------------------------------------
# Celery task — triggers a scheduled workflow run
# ---------------------------------------------------------------------------

def trigger_scheduled_workflow(workflow_id: int):
    print(f"[PY] scheduler.py | trigger_scheduled_workflow | L155: Logic flowing")
    """
    Celery task that fires when a cron schedule fires.
    Delegates to execute_workflow_task and updates last_run_at.
    """
    from app.core.tasks import execute_workflow_task
    from app.db.session import SessionLocal
    from app.models import models

    logger.info("Cron-triggered run: workflow_id=%s", workflow_id)

    db = SessionLocal()
    try:
        # Fetch org_id for the run
        workflow = db.query(models.Workflow).filter_by(id=workflow_id).first()
        org_id = workflow.org_id if workflow else None

        # Update last_run_at and next_run_at
        trigger = db.query(models.ScheduledTrigger).filter_by(workflow_id=workflow_id).first()
        if trigger:
            trigger.last_run_at = datetime.utcnow()
            trigger.next_run_at = _compute_next_run(trigger.cron_expr)
            db.commit()
    finally:
        db.close()

    # Execute the workflow (try Celery, fall back to sync)
    try:
        execute_workflow_task.delay(workflow_id, org_id=org_id)
    except Exception:
        execute_workflow_task(workflow_id, org_id=org_id)


# Register as a proper Celery task so autodiscover picks it up
celery_app = _get_celery_app()
trigger_scheduled_workflow = celery_app.task(
    name="app.core.scheduler.trigger_scheduled_workflow"
)(trigger_scheduled_workflow)