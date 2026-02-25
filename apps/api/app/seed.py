import sys
import os
from sqlalchemy.orm import Session

# Add the project root to dev path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal, engine
from app.models import models
from app.auth.jwt import get_password_hash

def seed():
    db = SessionLocal()
    try:
        # Get or create the default organisation
        org_name = "Default Org"
        org = db.query(models.Organisation).filter(models.Organisation.name == org_name).first()
        if not org:
            org = models.Organisation(name=org_name, plan="enterprise")
            db.add(org)
            db.commit()
            db.refresh(org)
            print(f"Created organisation: {org_name}")
        else:
            print(f"Organisation {org_name} already exists.")

        # Get or create the demo user
        user = db.query(models.User).filter(models.User.email == "admin@workline.ai").first()
        if not user:
            user = models.User(
                name="Admin User", 
                email="admin@workline.ai", 
                role="admin", 
                org_id=org.id,
                password_hash=get_password_hash("admin123")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("Created admin user.")
        else:
            if user.password_hash is None:
                user.password_hash = get_password_hash("admin123")
                db.add(user)
                db.commit()
                print("Updated admin user with password.")
            if user.org_id is None:
                user.org_id = org.id
                db.add(user)
                db.commit()
                print("Updated admin user with org_id.")
            print("Admin user already exists.")

        # Get or create the Document Classification workflow
        workflow = db.query(models.Workflow).filter(
            models.Workflow.name == "Reference Document Classification",
            models.Workflow.org_id == org.id
        ).first()

        if not workflow:
            workflow = models.Workflow(
                name="Reference Document Classification",
                description="Automatically classifies PDFs and stores them by job number.",
                status="active",
                created_by=user.id,
                org_id=org.id
            )
            db.add(workflow)
            db.commit()
            db.refresh(workflow)

            # Add Nodes
            nodes = [
                models.WorkflowNode(
                    id="node_1", workflow_id=workflow.id, type="ocr",
                    config_json={"file_type": "PDF"}, position_x=100.0, position_y=100.0,
                    reasoning="OCR is the first step to read text from uploaded PDF documents."
                ),
                models.WorkflowNode(
                    id="node_2", workflow_id=workflow.id, type="classify",
                    config_json={"classes": ["Invoice", "PO", "Report"]}, position_x=350.0, position_y=100.0,
                    reasoning="AI classification categorizes the document type for downstream routing."
                ),
                models.WorkflowNode(
                    id="node_3", workflow_id=workflow.id, type="store",
                    config_json={"folder_pattern": "Job_{job_number}"}, position_x=600.0, position_y=100.0,
                    reasoning="Storing the file in a structured way ensures easy retrieval later."
                )
            ]
            db.add_all(nodes)

            # Add Edges
            edges = [
                models.WorkflowEdge(id="e1-2", workflow_id=workflow.id, source_node_id="node_1", target_node_id="node_2", edge_type="default"),
                models.WorkflowEdge(id="e2-3", workflow_id=workflow.id, source_node_id="node_2", target_node_id="node_3", edge_type="default")
            ]
            db.add_all(edges)

            db.commit()
            print("Demo workflow seeded successfully!")
        else:
            print("Workflow already exists.")
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables first
    models.Base.metadata.create_all(bind=engine)
    seed()
