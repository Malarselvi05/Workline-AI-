import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Path hack
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
sys.path.append(os.path.join(root_dir, "apps/api"))

from app.models import models
from app.db.session import SessionLocal

def audit_run(run_id):
    db = SessionLocal()
    try:
        run = db.query(models.WorkflowRun).get(run_id)
        if not run:
            print(f"Run {run_id} not found.")
            return
        
        print(f"--- Run #{run_id} Audit ---")
        print(f"Workflow ID: {run.workflow_id}")
        print(f"Status: {run.status}")
        print(f"Org ID: {run.org_id}")
        
        wf = db.query(models.Workflow).get(run.workflow_id)
        print(f"Workflow Name: {wf.name if wf else 'NULL'}")
        print(f"Workflow Node Count: {len(wf.nodes) if wf else 0}")
        
        states = db.query(models.RunNodeState).filter(models.RunNodeState.run_id == run_id).all()
        print(f"RunNodeState Count: {len(states)}")
        for s in states:
            print(f"  - Node: {s.node_id}, Status: {s.status}")
            
    finally:
        db.close()

if __name__ == "__main__":
    audit_run(19)
