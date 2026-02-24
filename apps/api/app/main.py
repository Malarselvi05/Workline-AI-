import sys
import os

# Get the directory of the current file
current_dir = os.path.dirname(os.path.abspath(__file__))
# MiniProject/workline-ai/apps/api/app -> apps/api
api_dir = os.path.dirname(current_dir)
# MiniProject/workline-ai/apps/api -> workline-ai
workline_ai_dir = os.path.dirname(os.path.dirname(api_dir))
# workline-ai -> packages
packages_dir = os.path.join(workline_ai_dir, 'packages')

# Add paths to sys.path
if api_dir not in sys.path:
    sys.path.append(api_dir)
if packages_dir not in sys.path:
    sys.path.append(packages_dir)

from fastapi import FastAPI, Depends, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uvicorn

from app.db.session import engine, Base, get_db
from app.models import models
from app.services.planner import WorkflowPlanner
from app.core.tasks import execute_workflow_task
import logging

logger = logging.getLogger(__name__)

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="WorkLine AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

planner = WorkflowPlanner()

@app.get("/")
async def root():
    return {"message": "WorkLine AI API is running"}

@app.post("/workflows/plan")
async def plan_workflow(request: Dict[str, Any]):
    message = request.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    plan = await planner.plan_workflow(message)
    return plan

@app.post("/workflows")
async def create_workflow(workflow_data: Dict[str, Any], db: Session = Depends(get_db)):
    # Save workflow, nodes, and edges to DB
    new_workflow = models.Workflow(
        name=workflow_data.get("name", "Untitled Workflow"),
        description=workflow_data.get("description", ""),
        status="draft"
    )
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    
    # Add nodes
    for node_data in workflow_data.get("nodes", []):
        node = models.WorkflowNode(
            id=node_data["id"],
            workflow_id=new_workflow.id,
            type=node_data["type"],
            config_json=node_data.get("data", {}).get("config", {}),
            position_x=node_data["position"]["x"],
            position_y=node_data["position"]["y"]
        )
        db.add(node)
    
    # Add edges
    for edge_data in workflow_data.get("edges", []):
        edge = models.WorkflowEdge(
            id=edge_data["id"],
            workflow_id=new_workflow.id,
            source_node_id=edge_data["source"],
            target_node_id=edge_data["target"]
        )
        db.add(edge)
        
    db.commit()
    return {"id": new_workflow.id, "status": "success"}

@app.get("/workflows")
async def list_workflows(db: Session = Depends(get_db)):
    return db.query(models.Workflow).all()

@app.post("/workflows/{workflow_id}/run")
async def run_workflow(workflow_id: int, db: Session = Depends(get_db)):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    try:
        # Try background task
        task = execute_workflow_task.delay(workflow_id)
        return {"task_id": task.id, "status": "queued", "mode": "background"}
    except Exception as e:
        logger.warning(f"Celery not available, running synchronously: {e}")
        # Synchronous fallback for demo/MVP
        # Passing None for celery_app context
        result = execute_workflow_task(workflow_id)
        return {"status": "completed", "mode": "synchronous", "result": result}

@app.get("/workflows/{workflow_id}/runs")
async def list_workflow_runs(workflow_id: int, db: Session = Depends(get_db)):
    return db.query(models.WorkflowRun).filter(models.WorkflowRun.workflow_id == workflow_id).all()

@app.websocket("/ws/status/{workflow_id}")
async def websocket_endpoint(websocket: WebSocket, workflow_id: int):
    await websocket.accept()
    # Simple mock for status updates
    await websocket.send_json({"status": "connected", "workflow_id": workflow_id})
    while True:
        data = await websocket.receive_text()
        await websocket.send_json({"echo": data})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
