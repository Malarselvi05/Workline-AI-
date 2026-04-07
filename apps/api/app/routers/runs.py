from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models import models
from app.auth.dependencies import get_current_user, get_current_active_user, require_viewer, require_editor
from app.core.tasks import execute_workflow_task
import logging
from datetime import datetime
import asyncio

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
        
    # Trigger resumption
    try:
        if is_sandbox:
             # Sandbox runs always synchronous for immediate response
             from app.core.tasks import run_workflow_async
             return await run_workflow_async(workflow_id, initial_input, is_sandbox, current_user.org_id)
             
        # For dev simplicity, default to synchronous if not explicitly requested otherwise
        # Or if Celery is likely not available
        logger.info(f"Triggering sync run for workflow {workflow_id}")
        from app.core.tasks import run_workflow_async
        result = await run_workflow_async(workflow_id, initial_input, is_sandbox, current_user.org_id)
        return result

    except Exception as e:
        logger.error(f"Execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
    
    # Sort nodes topologically based on workflow structure
    try:
        workflow = db.query(models.Workflow).get(run.workflow_id)
        if workflow:
            # Build graph
            node_ids = {n.id for n in workflow.nodes}
            adj = {n_id: [] for n_id in node_ids}
            in_degree = {n_id: 0 for n_id in node_ids}
            
            for edge in workflow.edges:
                if edge.source_node_id in adj and edge.target_node_id in in_degree:
                    adj[edge.source_node_id].append(edge.target_node_id)
                    in_degree[edge.target_node_id] += 1
            
            # Kahn's algorithm for topological sort
            queue = [n_id for n_id, d in in_degree.items() if d == 0]
            sorted_node_ids = []
            while queue:
                # Use stable sorting (alphabetical if same level)
                queue.sort()
                u = queue.pop(0)
                sorted_node_ids.append(u)
                for v in adj.get(u, []):
                    in_degree[v] -= 1
                    if in_degree[v] == 0:
                        queue.append(v)
            
            # Map states to sorted order
            state_map = {s.node_id: s for s in node_states}
            ordered_states = []
            for n_id in sorted_node_ids:
                if n_id in state_map:
                    ordered_states.append(state_map[n_id])
                    
            # Add any nodes missing from DAG (orphans)
            remaining_ids = set(state_map.keys()) - set(sorted_node_ids)
            for n_id in sorted(list(remaining_ids)):
                ordered_states.append(state_map[n_id])
                
            node_states = ordered_states
    except Exception as e:
        print(f"[RUNS_DEBUG] Sort Error: {str(e)}")
        # Fallback to original order on failure
        pass

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
    
    if not state or state.status not in ["waiting", "awaiting_review"]:
        raise HTTPException(status_code=400, detail=f"Node is not in a resume-able state (current: {state.status})")
        
    # Mark the node as completed
    state.status = "completed"
    state.output_json = {"approved_by": current_user.id, "approved_at": datetime.utcnow().isoformat()}
    state.ended_at = datetime.utcnow()

    # CRITICAL: Commit the approval to DB BEFORE triggering resumption
    # so the engine sees the node as completed when it reads DB state
    db.commit()
    print(f"[RUN_ROUTER] Approved node {node_id} for run {run_id}. DB committed. Triggering resumption...")
    
    # Update the run status back to running
    run.status = "running"
    db.commit()

    # Always use asyncio.create_task (no Celery worker required in dev)
    from app.core.tasks import run_workflow_async
    asyncio.create_task(
        run_workflow_async(run.workflow_id, None, False, org_id=run.org_id, run_id=run.id, approved_node_id=node_id)
    )
    
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
    
    if not state or state.status not in ["waiting", "awaiting_review"]:
        raise HTTPException(status_code=400, detail=f"Node is not in a resume-able state (current: {state.status})")
        
    # Mark as failed
    state.status = "failed"
    state.error = f"Rejected by user {current_user.id}"
    state.ended_at = datetime.utcnow()
    
    run.status = "failed"
    db.commit()
    
    return {"message": "Node rejected, workflow failed", "run_id": run_id}