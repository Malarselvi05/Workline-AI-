import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Resolve paths
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../..")) # Go to apps/api
sys.path.append(current_dir) # Add apps/api/app or apps/api?
sys.path.append(root_dir)

from app.models import models
from app.db.session import SessionLocal

def audit_latest_run():
    db = SessionLocal()
    try:
        # Get latest run
        run = db.query(models.WorkflowRun).order_by(models.WorkflowRun.id.desc()).first()
        if not run:
            print("No runs found.")
            return

        print(f"--- Latest Run Audit: ID {run.id} ---")
        print(f"Run Total Status: {run.status}")
        
        # Get node states
        states = db.query(models.RunNodeState).filter(models.RunNodeState.run_id == run.id).all()
        print(f"Found {len(states)} node states:")
        for s in states:
            print(f"- Node: {s.node_id}, Status: {s.status}, Error: {s.error}")
            if s.output_json:
                print(f"  Output: {s.output_json}")
        
    finally:
        db.close()

if __name__ == "__main__":
    audit_latest_run()
