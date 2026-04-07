from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List

from app.db.session import get_db
from app.models.models import WorkflowRun, Workflow, DriftAlert, User
from app.schemas.dashboard import DashboardSummary, DashboardRecentRuns, DashboardDriftAlerts, RecentRun, DashboardDriftAlert
from app.auth.dependencies import get_current_user

router = APIRouter()

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get KPI summary for the dashboard.
    Multi-tenancy is automatically enforced by the org_id query modifier.
    """
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    
    # 1. Total Runs This Week
    total_runs = db.query(WorkflowRun).filter(WorkflowRun.started_at >= one_week_ago).count()
    
    # 2. Success Rate
    completed_runs = db.query(WorkflowRun).filter(
        and_(
            WorkflowRun.started_at >= one_week_ago,
            WorkflowRun.status == "completed"
        )
    ).count()
    
    success_rate = (completed_runs / total_runs * 100) if total_runs > 0 else 0.0
    
    # 3. Avg Duration (for completed runs)
    # Note: SQLite doesn't have a native interval diff for avg, so we extract and average
    # but standard SQL works better. Let's do it simply by getting the values and averaging in Python if count is small.
    # In a real app with many runs, use SQL-level duration math.
    avg_duration = 0.0
    recent_completed_runs = db.query(WorkflowRun).filter(
        and_(
            WorkflowRun.status == "completed",
            WorkflowRun.ended_at.isnot(None),
            WorkflowRun.started_at >= one_week_ago
        )
    ).all()
    
    if recent_completed_runs:
        durations = [(r.ended_at - r.started_at).total_seconds() for r in recent_completed_runs if r.ended_at and r.started_at]
        if durations:
            avg_duration = sum(durations) / len(durations)
            
    # 4. Active Drift Alert Count
    drift_count = db.query(DriftAlert).filter(DriftAlert.resolved == False).count()
    
    return DashboardSummary(
        total_runs_week=total_runs,
        success_rate=round(success_rate, 1),
        avg_duration=round(avg_duration, 1),
        active_drift_alerts=drift_count
    )

@router.get("/recent-runs", response_model=DashboardRecentRuns)
def get_recent_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get 10 most recent workflow runs across the organization.
    """
    # Join with Workflow to get names
    runs = db.query(WorkflowRun, Workflow).join(
        Workflow, WorkflowRun.workflow_id == Workflow.id
    ).order_by(WorkflowRun.started_at.desc()).limit(10).all()
    
    recent_runs = []
    for run, workflow in runs:
        duration = 0.0
        if run.ended_at and run.started_at:
            duration = (run.ended_at - run.started_at).total_seconds()
            
        recent_runs.append(RecentRun(
            id=run.id,
            workflow_name=workflow.name,
            triggered_by="System", # Placeholder until we have run-triggering tracking
            status=run.status,
            started_at=run.started_at,
            duration=round(duration, 1)
        ))
        
    return DashboardRecentRuns(runs=recent_runs)

@router.get("/drift-alerts", response_model=DashboardDriftAlerts)
def get_drift_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get top active drift alerts.
    """
    alerts = db.query(DriftAlert, Workflow).join(
        Workflow, DriftAlert.workflow_id == Workflow.id
    ).filter(DriftAlert.resolved == False).order_by(DriftAlert.created_at.desc()).all()
    
    result = []
    for alert, workflow in alerts:
        result.append(DashboardDriftAlert(
            id=alert.id,
            workflow_name=workflow.name,
            metric=alert.metric,
            baseline_val=alert.baseline_val,
            current_val=alert.current_val,
            created_at=alert.created_at
        ))
        
    return DashboardDriftAlerts(alerts=result)