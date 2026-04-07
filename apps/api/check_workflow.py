from app.db.session import SessionLocal
from app.models import models
import json

def check_workflow_edges(workflow_id: int):
    db = SessionLocal()
    w = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not w: return
    print(f"WF: {w.name}")
    nodes = {n.id: n for n in w.nodes}
    for e in w.edges:
        src = nodes.get(e.source_node_id)
        tgt = nodes.get(e.target_node_id)
        src_label = src.config_json.get("label") if (src and src.config_json and isinstance(src.config_json, dict)) else e.source_node_id
        tgt_label = tgt.config_json.get("label") if (tgt and tgt.config_json and isinstance(tgt.config_json, dict)) else e.target_node_id
        print(f"EDGE: {src_label} -> {tgt_label}")
    db.close()

if __name__ == "__main__":
    check_workflow_edges(5)
