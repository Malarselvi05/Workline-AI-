import asyncio
import json
import redis.asyncio as async_redis
import os
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models import models

# Pathfinder: Ensure the engine and block library are in the search path
# This allows the API to find shared packages in the monorepo
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../../.."))
packages_dir = os.path.join(root_dir, "packages")
if packages_dir not in sys.path:
    sys.path.append(packages_dir)

api_dir = os.path.join(root_dir, "apps", "api")
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

try:
    from workflow_engine.engine import WorkflowEngine
except ImportError:
    # Fallback for different execution contexts
    try:
        from packages.workflow_engine.engine import WorkflowEngine
    except ImportError:
        print("[WORKFLOW_DEBUG] CRITICAL: Could not import WorkflowEngine. Check PYTHONPATH.")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

@celery_app.task(name="app.core.tasks.execute_workflow_task")
def execute_workflow_task(workflow_id: int, initial_input: Dict[str, Any] = None, is_sandbox: bool = False, org_id: int = None, run_id: int = None):
    print(f"[WORKFLOW_DEBUG] CELERY: Received task for workflow {workflow_id}")
    return asyncio.run(run_workflow_async(workflow_id, initial_input, is_sandbox, org_id, run_id))

async def run_workflow_async(workflow_id: int, initial_input: Dict[str, Any] = None, is_sandbox: bool = False, org_id: int = None, run_id: int = None, approved_node_id: str = None):
    if org_id:
        from app.core import context
        context.set_org_id(org_id)
    print(f"[TASK_WORKER] ASYNC_START: WorkflowID={workflow_id}, RunID={run_id}, OrgID={org_id}, ApprovedID={approved_node_id}")
    db = None
    redis_client = None
    try:
        db = SessionLocal()
        print(f"[WORKFLOW_DEBUG] DB_CONNECTED: SessionLocal initialized successfully")
        
        if run_id:
            print(f"[WORKFLOW_DEBUG] RESUMING: Fetching existing run {run_id}")
            run = db.query(models.WorkflowRun).get(run_id)
            if not run:
                print(f"[WORKFLOW_DEBUG] ERROR: Run {run_id} not found")
                return {"status": "error", "message": f"Run {run_id} not found"}
            run.status = "running"
        else:
            print(f"[WORKFLOW_DEBUG] NEW_RUN: Creating new run for workflow {workflow_id}")
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
        print(f"[WORKFLOW_DEBUG] RUN_ID_CONFIRMED: RunID={run_id}")

        # Optional Redis connection
        try:
            print(f"[WORKFLOW_DEBUG] REDIS_CONNECTING: Attempting to connect to {REDIS_URL}")
            redis_client = await async_redis.from_url(REDIS_URL)
            await asyncio.wait_for(redis_client.ping(), timeout=1.0)
            print(f"[WORKFLOW_DEBUG] REDIS_CONNECTED: Success")
        except Exception as re:
            print(f"[WORKFLOW_DEBUG] REDIS_ERROR: Connection failed (live updates disabled): {str(re)}")
            redis_client = None

        # Fetch workflow
        print(f"[WORKFLOW_DEBUG] FETCHING_GRAPH: Getting workflow structure for {workflow_id}")
        workflow = db.query(models.Workflow).get(workflow_id)
        if not workflow:
            print(f"[WORKFLOW_DEBUG] ERROR: Workflow Structure {workflow_id} not found")
            run.status = "failed"
            run.ended_at = datetime.utcnow()
            db.commit()
            return {"status": "error", "message": "Workflow not found"}

        # Prepare node data
        nodes_data = []
        completed_node_ids = []
        initial_node_outputs = {}
        
        print(f"[WORKFLOW_DEBUG] GRAPH_BUILD: Processing {len(workflow.nodes)} nodes and {len(workflow.edges)} edges")
        existing_states = db.query(models.RunNodeState).filter(models.RunNodeState.run_id == run_id).all()
        for state in existing_states:
            if state.status == "completed":
                completed_node_ids.append(state.node_id)
        # Ensure the specifically approved node is in the completed set, even if DB hasn't updated yet due to a race
        if approved_node_id and approved_node_id not in completed_node_ids:
            completed_node_ids.append(approved_node_id)
            print(f"[TASK_WORKER] Manually added {approved_node_id} to completed set for resumption")
        
        print(f"[TASK_WORKER] Completed Node IDs: {completed_node_ids}")

        for n in workflow.nodes:
            print(f"[WORKFLOW_DEBUG] NODE_INIT: ID={n.id}, Type={n.type}")
            nodes_data.append({"id": n.id, "type": n.type, "config": n.config_json})
            if not any(s.node_id == n.id for s in existing_states):
                node_state = models.RunNodeState(run_id=run_id, node_id=n.id, status="pending", org_id=org_id)
                db.add(node_state)
            
        edges_data = []
        for e in workflow.edges:
            print(f"[WORKFLOW_DEBUG] EDGE_INIT: {e.source_node_id} -> {e.target_node_id}")
            edges_data.append({"id": e.id, "source": e.source_node_id, "target": e.target_node_id})
            
        db.commit()
        print(f"[WORKFLOW_DEBUG] EXECUTION_READY: Passing graph to engine")

        async def on_status_change(node_id: str, status: str, output: Any = None, error: str = None):
            print(f"[WORKFLOW_DEBUG] ENGINE_EVENT: Node={node_id} changed to {status}")
            status_db = SessionLocal()
            try:
                state = status_db.query(models.RunNodeState).filter(
                    models.RunNodeState.run_id == run_id,
                    models.RunNodeState.node_id == node_id
                ).first()
                if state:
                    state.status = status
                    state.org_id = org_id # Ensure org_id is always carried over
                    if status == "running":
                        state.started_at = datetime.utcnow()
                    elif status in ["completed", "failed", "skipped", "waiting", "awaiting_review"]:
                        state.ended_at = datetime.utcnow()
                        state.output_json = output
                        state.error = error
                    status_db.commit()
            finally:
                status_db.close()
            
            if redis_client:
                try:
                    event = {"run_id": run_id, "node_id": node_id, "status": status, "output": output, "error": error}
                    await redis_client.publish(f"run_status:{run_id}", json.dumps(event))
                except Exception:
                    pass

        # Execute
        engine = WorkflowEngine(
            {"nodes": nodes_data, "edges": edges_data},
            on_node_status=on_status_change,
            is_sandbox=is_sandbox,
            completed_node_ids=completed_node_ids,
            initial_node_outputs=initial_node_outputs
        )
        
        print(f"[WORKFLOW_DEBUG] ENGINE_START: Beginning topological execution")
        print(f"[TASK_WORKER] Launching Engine.execute() for RunID={run_id}")
        results_data = await engine.execute(initial_input)
        print(f"[TASK_WORKER] Engine.execute() finished for RunID={run_id}, FinalStatus={results_data.get('status')}")
        results = results_data["outputs"]
        final_status = results_data["status"]
        print(f"[WORKFLOW_DEBUG] ENGINE_COMPLETE: FinalStatus={final_status}")
        
        if final_status == "awaiting_review":
            run.status = "awaiting_review"
        elif engine.failed_nodes:
            run.status = "failed"
        else:
            run.status = "completed"
            
        run.ended_at = datetime.utcnow()
        run.logs = {"results": results, "engine_status": final_status}
        db.commit()
        print(f"[WORKFLOW_DEBUG] DB_FINALIZED: Run {run_id} record closed as {run.status}")

        # Drift Detection
        if not is_sandbox:
            try:
                print(f"[WORKFLOW_DEBUG] DRIFT_CHECK: Starting")
                from app.services.drift import check_workflow_drift
                await check_workflow_drift(db, workflow_id, org_id)
                print(f"[WORKFLOW_DEBUG] DRIFT_CHECK: Finished")
            except Exception as de:
                print(f"[WORKFLOW_DEBUG] DRIFT_ERROR: {str(de)}")
        
        return {"status": run.status, "run_id": run_id, "results": results}
        
    except Exception as e:
        print(f"[WORKFLOW_DEBUG] TASK_FATAL_ERROR: {str(e)}")
        if db:
            try:
                run.status = "failed"
                run.ended_at = datetime.utcnow()
                run.logs = {"exception": str(e)}
                db.commit()
            except Exception:
                pass
        return {"status": "failed", "error": str(e)}
    finally:
        print(f"[WORKFLOW_DEBUG] CLEANUP: Closing connections")
        if redis_client:
            await redis_client.close()
        if db:
            db.close()