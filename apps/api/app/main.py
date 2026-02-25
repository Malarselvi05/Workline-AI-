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

from app.routers import auth, workflows
from app.auth.dependencies import require_viewer, require_editor

app = FastAPI(title="WorkLine AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workflows.router)

planner = WorkflowPlanner()

@app.get("/")
async def root():
    return {"message": "WorkLine AI API is running"}

@app.post("/workflows/plan", dependencies=[require_viewer])
async def plan_workflow(request: Dict[str, Any]):
    message = request.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    plan = await planner.plan_workflow(message)
    return plan

@app.websocket("/ws/status/{workflow_id}")
async def websocket_endpoint(websocket: WebSocket, workflow_id: int):
    # WS auth is tricky, let's leave it for now or implement token in query param
    await websocket.accept()
    # Simple mock for status updates
    await websocket.send_json({"status": "connected", "workflow_id": workflow_id})
    while True:
        data = await websocket.receive_text()
        await websocket.send_json({"echo": data})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
