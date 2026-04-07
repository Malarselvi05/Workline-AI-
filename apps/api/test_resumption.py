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

async def test_resumption_logic():
    log_file = open("test_resumption_log.txt", "w")
    def log(msg):
        print(msg)
        log_file.write(str(msg) + "\n")

    db = SessionLocal()
    try:
        # 1. Start a fresh run
        wf = db.query(models.Workflow).order_by(models.Workflow.id.desc()).first()
        log(f"--- STARTING FRESH TEST RUN FOR WORKFLOW {wf.id} ---")
        
        result = await run_workflow_async(wf.id, initial_input={}, is_sandbox=False, org_id=wf.org_id)
        run_id = result.get("run_id")
        log(f"Run started: {run_id}, Status: {result.get('status')}")
        
        if result.get('status') != 'awaiting_review':
            log("Error: Workflow did not reach awaiting_review stage.")
            # return

        # 2. Find the node that is awaiting review
        waiting_node = db.query(models.RunNodeState).filter(
            models.RunNodeState.run_id == run_id,
            models.RunNodeState.status == 'awaiting_review'
        ).first()
        
        if not waiting_node:
            log("Error: No node found in awaiting_review status.")
            # return
            
        log(f"Approving node: {waiting_node.node_id}")
        waiting_node.status = 'completed'
        db.commit()

        # 3. Resume the workflow
        log("\n--- TRIGGERING RESUMPTION ---")
        resume_result = await run_workflow_async(wf.id, initial_input=None, is_sandbox=False, org_id=wf.org_id, run_id=run_id)
        log(f"Resumption finished. Final status: {resume_result.get('status')}")
        
        # 4. Final verification
        final_states = db.query(models.RunNodeState).filter(models.RunNodeState.run_id == run_id).all()
        for s in final_states:
            log(f"Node {s.node_id}: {s.status}")

    finally:
        db.close()
        log_file.close()

if __name__ == "__main__":
    asyncio.run(test_resumption_logic())
