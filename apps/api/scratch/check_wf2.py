
import sys, os
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models import models

db = SessionLocal()
wf = db.query(models.Workflow).get(2)
if wf:
    print(f"Workflow 2: {wf.name}, OrgID: {wf.org_id}, CreatedBy: {wf.created_by}")
else:
    print("Workflow 2 not found")
db.close()
