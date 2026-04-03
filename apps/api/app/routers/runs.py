from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models import models
from app.auth.dependencies import get_current_user, get_current_active_user, require_viewer, require_editor
from app.core.tasks import execute_workflow_task
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["runs"])

@router.post("/workflows/{workflow_id}/runs")
async def trigger_run(
    workflow_id: int, 
    is_sandbox: bool = False,
    initial_input: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Trigger a new execution of a workflow.
    """
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    try:
        # Trigger Celery task
        task = execute_workflow_task.delay(workflow_id, initial_input, is_sandbox, current_user.org_id)
        return {"task_id": task.id, "status": "queued", "mode": "background"}
    except Exception as e:
        logger.warning(f"Celery not available, running synchronously: {e}")
        # Synchronous fallback for dev environments without Redis/Worker
        from app.core.tasks import run_workflow_async
        result = await run_workflow_async(workflow_id, initial_input, is_sandbox, current_user.org_id)
        return result

@router.get("/workflows/{workflow_id}/runs")
async def list_workflow_runs(
    workflow_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    List all runs for a specific workflow.
    """
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    runs = db.query(models.WorkflowRun).filter(models.WorkflowRun.workflow_id == workflow_id).all()
    return runs

@router.get("/runs/{run_id}")
async def get_run_detail(
    run_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Get detailed status of a run, including all node states.
    """
    run = db.query(models.WorkflowRun).filter(models.WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    # Get node states
    node_states = db.query(models.RunNodeState).filter(models.RunNodeState.run_id == run_id).all()
    
    return {
        "run": run,
        "node_states": node_states
    }

@router.delete("/runs/{run_id}/cancel")
async def cancel_run(
    run_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Cancel an in-progress run.
    """
    run = db.query(models.WorkflowRun).filter(models.WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    if run.status in ["completed", "failed"]:
        return {"message": "Run already finished"}
        
    run.status = "failed"
    # logs might be None initially
    current_logs = run.logs if run.logs else {}
    current_logs["cancellation"] = f"Cancelled by user {current_user.id}"
    run.logs = current_logs
    db.commit()
    
    # Note: In a production environment, we would also revoke the Celery task
    
    return {"message": "Run marked as cancelled"}

@router.post("/runs/{run_id}/nodes/{node_id}/approve")
async def approve_node(
    run_id: int, 
    node_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Approve a waiting node (Human Review).
    Resumes the workflow execution.
    """
    run = db.query(models.WorkflowRun).filter(models.WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    state = db.query(models.RunNodeState).filter(
        models.RunNodeState.run_id == run_id,
        models.RunNodeState.node_id == node_id
    ).first()
    
    if not state or state.status != "waiting":
        raise HTTPException(status_code=400, detail="Node is not in waiting state")
        
    # Mark as completed
    state.status = "completed"
    state.output_json = {"approved_by": current_user.id, "approved_at": datetime.utcnow().isoformat()}
    state.ended_at = datetime.utcnow()
    
    # Reset run status to running to allow it to be picked up
    run.status = "running"
    db.commit()
    
    # Trigger Celery task to resume
    execute_workflow_task.delay(run.workflow_id, None, False)
    
    return {"message": "Node approved, workflow resuming", "run_id": run_id}

@router.post("/runs/{run_id}/nodes/{node_id}/reject")
async def reject_node(
    run_id: int, 
    node_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Reject a waiting node (Human Review).
    Fails the workflow execution.
    """
    run = db.query(models.WorkflowRun).filter(models.WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    state = db.query(models.RunNodeState).filter(
        models.RunNodeState.run_id == run_id,
        models.RunNodeState.node_id == node_id
    ).first()
    
    if not state or state.status != "waiting":
        raise HTTPException(status_code=400, detail="Node is not in waiting state")
        
    # Mark as failed
    state.status = "failed"
    state.error = f"Rejected by user {current_user.id}"
    state.ended_at = datetime.utcnow()
    
    run.status = "failed"
    db.commit()
    
    return {"message": "Node rejected, workflow failed", "run_id": run_id}
