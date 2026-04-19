"""
seyon_seed.py — Seeds the SEYON static workflow into the DB.
Run once: python app/seyon_seed.py
It will print the workflow_id — copy it to apps/web/lib/seyon-config.ts
"""
import sys, os

# --- Path setup ---
_app_dir   = os.path.dirname(os.path.abspath(__file__))
_api_dir   = os.path.dirname(_app_dir)
_repo_root = os.path.dirname(os.path.dirname(_api_dir))
_packages_dir = os.path.join(_repo_root, 'packages')
for _p in (_repo_root, _packages_dir, _api_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from dotenv import load_dotenv
load_dotenv()

from app.db.session import SessionLocal, engine, Base
from app.models import models
from datetime import datetime

Base.metadata.create_all(bind=engine)

SEYON_WORKFLOW_NAME = "SEYON-Automation"

NODES = [
    {"id": "s_file_upload",   "type": "file_upload",             "label": "📄 Document Intake",        "x": 100,  "y": 300},
    {"id": "s_ocr",           "type": "ocr",                     "label": "🔍 OCR Extraction",          "x": 350,  "y": 300},
    {"id": "s_drawing_cls",   "type": "drawing_classifier",      "label": "📐 Drawing Classifier",      "x": 600,  "y": 200},
    {"id": "s_po_extract",    "type": "po_extractor",            "label": "📦 PO Extractor",            "x": 600,  "y": 400},
    {"id": "s_dup_detect",    "type": "duplicate_detector",      "label": "🔎 Duplicate Detector",      "x": 850,  "y": 300},
    {"id": "s_classify",      "type": "classify",                "label": "🏷️ Document Classifier",     "x": 1100, "y": 300},
    {"id": "s_recommender",   "type": "team_leader_recommender", "label": "🧑‍💼 Team Leader Recommender", "x": 1350, "y": 300},
    {"id": "s_human_review",  "type": "human_review",            "label": "✅ Admin Approval",           "x": 1600, "y": 300},
    {"id": "s_notify",        "type": "notify",                  "label": "🔔 Notify Team",             "x": 1850, "y": 300},
]

EDGES = [
    {"id": "e1", "source": "s_file_upload",  "target": "s_ocr"},
    {"id": "e2", "source": "s_ocr",          "target": "s_drawing_cls"},
    {"id": "e3", "source": "s_ocr",          "target": "s_po_extract"},
    {"id": "e4", "source": "s_drawing_cls",  "target": "s_dup_detect"},
    {"id": "e5", "source": "s_po_extract",   "target": "s_dup_detect"},
    {"id": "e6", "source": "s_dup_detect",   "target": "s_classify"},
    {"id": "e7", "source": "s_classify",     "target": "s_recommender"},
    {"id": "e8", "source": "s_recommender",  "target": "s_human_review"},
    {"id": "e9", "source": "s_human_review", "target": "s_notify"},
]

def seed():
    db = SessionLocal()
    try:
        # Check if already exists
        existing = db.query(models.Workflow).filter(
            models.Workflow.name == SEYON_WORKFLOW_NAME
        ).first()
        if existing:
            print(f"[SEYON SEED] Workflow already exists with ID={existing.id}")
            print(f"\n✅ Update seyon-config.ts: SEYON_WORKFLOW_ID = {existing.id}")
            print(f"   HUMAN_REVIEW_NODE_ID = 's_human_review'")
            return existing.id

        # Find first org/user for seeding
        org = db.query(models.Organisation).first()
        user = db.query(models.User).filter(models.User.role == "admin").first()
        if not org or not user:
            print("[SEYON SEED] ERROR: No org/admin user found. Run the main seed.py first.")
            return None

        # Create workflow
        wf = models.Workflow(
            name=SEYON_WORKFLOW_NAME,
            description="SEYON Phase 1 & 2 — Document classification and team leader allocation pipeline.",
            status="active",
            version=1,
            created_by=user.id,
            org_id=org.id,
        )
        db.add(wf)
        db.flush()

        # Add nodes
        for n in NODES:
            node = models.WorkflowNode(
                id=n["id"],
                workflow_id=wf.id,
                org_id=org.id,
                label=n["label"],
                type=n["type"],
                config_json={"instruction": "Admin approval required for team assignment"} if n["type"] == "human_review" else {},
                position_x=n["x"],
                position_y=n["y"],
            )
            db.add(node)
        db.flush()

        # Add edges
        for e in EDGES:
            edge = models.WorkflowEdge(
                id=e["id"],
                workflow_id=wf.id,
                org_id=org.id,
                source_node_id=e["source"],
                target_node_id=e["target"],
                edge_type="default",
            )
            db.add(edge)

        db.commit()
        db.refresh(wf)
        print(f"[SEYON SEED] ✅ Created SEYON workflow with ID={wf.id}")
        print(f"\n🎯 Update apps/web/lib/seyon-config.ts:")
        print(f"   export const SEYON_WORKFLOW_ID = {wf.id};")
        print(f"   export const HUMAN_REVIEW_NODE_ID = 's_human_review';")
        return wf.id
    except Exception as e:
        db.rollback()
        print(f"[SEYON SEED] ERROR: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
