import sys
import os
from sqlalchemy.orm import Session

# Add the project root to dev path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal, engine
from app.models import models

def seed():
    db = SessionLocal()
    try:
        # Create a demo user
        user = models.User(name="Admin User", email="admin@workline.ai", role="admin")
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create the Document Classification workflow
        workflow = models.Workflow(
            name="Reference Document Classification",
            description="Automatically classifies PDFs and stores them by job number.",
            status="active",
            created_by=user.id
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)

        # Add Nodes
        nodes = [
            models.WorkflowNode(
                id="node_1", workflow_id=workflow.id, type="ocr", 
                config_json={"file_type": "PDF"}, position_x=100.0, position_y=100.0
            ),
            models.WorkflowNode(
                id="node_2", workflow_id=workflow.id, type="classify", 
                config_json={"classes": ["Invoice", "PO", "Report"]}, position_x=350.0, position_y=100.0
            ),
            models.WorkflowNode(
                id="node_3", workflow_id=workflow.id, type="store", 
                config_json={"folder_pattern": "Job_{job_number}"}, position_x=600.0, position_y=100.0
            )
        ]
        db.add_all(nodes)

        # Add Edges
        edges = [
            models.WorkflowEdge(id="e1-2", workflow_id=workflow.id, source_node_id="node_1", target_node_id="node_2"),
            models.WorkflowEdge(id="e2-3", workflow_id=workflow.id, source_node_id="node_2", target_node_id="node_3")
        ]
        db.add_all(edges)
        
        db.commit()
        print("Demo workspace seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables first
    models.Base.metadata.create_all(bind=engine)
    seed()
