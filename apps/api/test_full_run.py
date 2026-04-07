import asyncio
import json
import os
import sys
import traceback

# Setup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, "packages"))

from app.db.session import SessionLocal
from app.models import models
from app.core.tasks import run_workflow_async

async def test_full_execution():
    log_file = open("test_execution_log.txt", "w")
    def log(msg):
        print(msg)
        log_file.write(str(msg) + "\n")

    db = SessionLocal()
    try:
        # Get latest workflow
        wf = db.query(models.Workflow).order_by(models.Workflow.id.desc()).first()
        if not wf:
            log("No workflow found.")
            return

        log(f"--- STARTING TEST FOR WORKFLOW {wf.id}: {wf.name} ---")
        log(f"Nodes: {[n.id for n in wf.nodes]}")
        
        # We'll run it synchronously using our real task function
        try:
            result = await run_workflow_async(wf.id, initial_input={}, is_sandbox=False, org_id=wf.org_id)
            log("\n--- Execution Finished ---")
            log(f"Final Status: {result.get('status')}")
            log(f"Results: {json.dumps(result.get('results'), indent=2)}")
        except Exception as e:
            log(f"\n--- FATAL ERROR IN run_workflow_async ---")
            log(traceback.format_exc())
            return
        
        # Check DB state
        run_id = result.get("run_id")
        if run_id:
            run = db.query(models.WorkflowRun).get(run_id)
            log(f"Run {run_id} Overall Status: {run.status}")
            states = db.query(models.RunNodeState).filter(models.RunNodeState.run_id == run_id).all()
            if not states:
                log("No node states found in DB for this run!")
            for s in states:
                log(f"Node {s.node_id}: {s.status} (Output: {s.output_json})")
    finally:
        db.close()
        log_file.close()

if __name__ == "__main__":
    asyncio.run(test_full_execution())
