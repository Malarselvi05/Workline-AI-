import asyncio
import json
import redis.asyncio as async_redis
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models import models
from workflow_engine.engine import WorkflowEngine

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

@celery_app.task(name="app.core.tasks.execute_workflow_task")
def execute_workflow_task(workflow_id: int, initial_input: Dict[str, Any] = None, is_sandbox: bool = False, org_id: int = None):
    print(f"[PY] tasks.py | execute_workflow_task | L15: Data processing")
    print(f"[PY] tasks.py | execute_workflow_task | L15: Code alive")
    """
    Celery task to execute a workflow.
    Wraps the async execution in asyncio.run.
    """
    return asyncio.run(run_workflow_async(workflow_id, initial_input, is_sandbox, org_id))

async def run_workflow_async(workflow_id: int, initial_input: Dict[str, Any] = None, is_sandbox: bool = False, org_id: int = None):
    print(f"[PY] tasks.py | run_workflow_async | L23: Data processing")
    db = SessionLocal()
    # Create the run record
    run = models.WorkflowRun(
        workflow_id=workflow_id,
        org_id=org_id,
        status="running",
        started_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    run_id = run.id
    redis_client = await async_redis.from_url(REDIS_URL)

    try:
        # Fetch workflow with nodes and edges
        workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
        if not workflow:
            run.status = "failed"
            run.ended_at = datetime.utcnow()
            run.logs = {"error": "Workflow not found"}
            db.commit()
            return {"status": "error", "message": "Workflow not found"}

        # Prepare node mapping and create initial node states in DB
        nodes_data = []
        completed_node_ids = []
        initial_node_outputs = {}
        
        # Check if we are resuming an existing run
        # For simplicity, we assume if RunNodeState exists and is completed, we skip.
        # But we need to load outputs from them.
        existing_states = db.query(models.RunNodeState).filter(models.RunNodeState.run_id == run_id).all()
        for state in existing_states:
            if state.status == "completed":
                completed_node_ids.append(state.node_id)
                initial_node_outputs[state.node_id] = state.output_json

        for n in workflow.nodes:
            nodes_data.append({"id": n.id, "type": n.type, "config": n.config_json})
            # Create initial node state if not exists
            if not any(s.node_id == n.id for s in existing_states):
                node_state = models.RunNodeState(
                    run_id=run_id,
                    node_id=n.id,
                    status="pending"
                )
                db.add(node_state)
            
        edges_data = []
        for e in workflow.edges:
            edges_data.append({"id": e.id, "source": e.source_node_id, "target": e.target_node_id})

        db.commit()

        async def on_status_change(node_id: str, status: str, output: Any = None, error: str = None):
            print(f"[PY] tasks.py | on_status_change | L80: Logic flowing")
            # Update Node State in DB
            # We use a new session to avoid issues with the main one if multiple tasks run
            with SessionLocal() as status_db:
                state = status_db.query(models.RunNodeState).filter(
                    models.RunNodeState.run_id == run_id,
                    models.RunNodeState.node_id == node_id
                ).first()
                
                if state:
                    state.status = status
                    if status == "running":
                        state.started_at = datetime.utcnow()
                    elif status in ["completed", "failed", "skipped", "waiting"]:
                        state.ended_at = datetime.utcnow()
                        state.output_json = output
                        state.error = error
                    status_db.commit()
            
            # Emit to Redis Pub/Sub for real-time frontend updates
            event = {
                "run_id": run_id,
                "node_id": node_id,
                "status": status,
                "output": output,
                "error": error,
                "timestamp": datetime.utcnow().isoformat()
            }
            await redis_client.publish(f"run_status:{run_id}", json.dumps(event))
            
            # Also publish to a general workspace channel for sidebar notifications
            if workflow.org_id:
                await redis_client.publish(f"workspace_events:{workflow.org_id}", json.dumps({
                    "type": "node_status_update",
                    "data": event,
                    "workflow_id": workflow_id
                }))

        # Initialize and execute the engine
        engine = WorkflowEngine(
            {"nodes": nodes_data, "edges": edges_data},
            on_node_status=on_status_change,
            is_sandbox=is_sandbox,
            completed_node_ids=completed_node_ids,
            initial_node_outputs=initial_node_outputs
        )
        
        results_data = await engine.execute(initial_input)
        results = results_data["outputs"]
        final_status = results_data["status"]
        
        # Determine final status
        if final_status == "awaiting_review":
            run.status = "awaiting_review"
        elif engine.failed_nodes:
            run.status = "failed"
        else:
            run.status = "completed"
            
        run.ended_at = datetime.utcnow()
        run.logs = {"results": results, "engine_status": final_status}
        db.commit()

        # Phase 2: Drift Detection
        if not is_sandbox:
            try:
                from app.services.drift import check_workflow_drift
                await check_workflow_drift(db, workflow_id, org_id)
            except Exception as drift_error:
                print(f"Drift check failed: {drift_error}")
        
        return {"status": run.status, "run_id": run_id, "results": results}
        
    except Exception as e:
        run.status = "failed"
        run.ended_at = datetime.utcnow()
        run.logs = {"exception": str(e)}
        db.commit()
        return {"status": "failed", "error": str(e)}
    finally:
        await redis_client.close()
        db.close()