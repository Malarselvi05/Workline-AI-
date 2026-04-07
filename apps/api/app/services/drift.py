import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional

from app.models.models import WorkflowRun, RunNodeState, DriftAlert, Workflow
from app.routers.ws import manager

def calculate_kl_divergence(p, q):
    print(f"[PY] drift.py | calculate_kl_divergence | L10: Logic flowing")
    """
    Very simple KL divergence between two probability distributions.
    In real life, p and q would be embedding distributions or classification label frequencies.
    """
    p = np.asarray(p, dtype=float)
    q = np.asarray(q, dtype=float)
    # Add small epsilon to avoid division by zero
    p += 1e-10
    q += 1e-10
    return np.sum(p * np.log(p / q))

async def check_workflow_drift(db: Session, workflow_id: int, org_id: int):
    """
    Simulated drift detection logic.
    Check if the last 50 runs are significantly different from the baseline (first 100).
    """
    # 1. Check if we have enough runs for a baseline
    total_runs = db.query(WorkflowRun).filter(
        WorkflowRun.workflow_id == workflow_id,
        WorkflowRun.status == "completed"
    ).count()
    
    if total_runs < 150:
        return # Not enough data
        
    # 2. Get baseline (first 100 runs) success/fail distribution or embedding stats
    # For MVP purposes, we'll simulate a drift check based on success rate drop
    recent_runs = db.query(WorkflowRun).filter(
        WorkflowRun.workflow_id == workflow_id,
        WorkflowRun.status.in_(["completed", "failed"])
    ).order_by(WorkflowRun.started_at.desc()).limit(50).all()
    
    recent_success_rate = len([r for r in recent_runs if r.status == "completed"]) / len(recent_runs)
    
    # baseline mock (assume 95%)
    baseline_rate = 0.95 
    
    if recent_success_rate < (baseline_rate - 0.10): # 10% drop
        # Drift detected!
        alert = DriftAlert(
            workflow_id=workflow_id,
            org_id=org_id,
            metric="accuracy",
            baseline_val=baseline_rate,
            current_val=recent_success_rate,
            resolved=False
        )
        db.add(alert)
        db.commit()
        
        # Notify via WebSocket
        await manager.broadcast_to_org(org_id, {
            "type": "drift_alert_fired",
            "workflow_id": workflow_id,
            "metric": "accuracy",
            "current_val": recent_success_rate
        })
        
        return True
    
    return False