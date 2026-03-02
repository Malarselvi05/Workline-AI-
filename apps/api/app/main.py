import sys
import os

# Resolve the monorepo root: apps/api/app -> apps/api -> apps -> Workline-AI/
_app_dir   = os.path.dirname(os.path.abspath(__file__))   # …/apps/api/app
_api_dir   = os.path.dirname(_app_dir)                     # …/apps/api
_repo_root = os.path.dirname(os.path.dirname(_api_dir))   # …/Workline-AI
_packages_dir = os.path.join(_repo_root, 'packages')       # …/Workline-AI/packages

# sys.path priority:
#   1. repo root  → enables: from packages.shared_types.block_registry import ...
#   2. packages/  → enables: from workflow_engine.engine import WorkflowEngine
#                             from block_library.src.generic.blocks import ...
#   3. api dir    → enables: from app.routers.xxx import ...
for _p in (_repo_root, _packages_dir, _api_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.db.session import engine, Base
from app.models import models  # noqa: F401 — ensures all models are registered
import logging

logger = logging.getLogger(__name__)

from app.routers import auth, workflows, planning, blocks, runs, ws

app = FastAPI(
    title="WorkLine AI API",
    description="No-code, graph-based AI workflow automation platform.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all tables on startup (Alembic handles migrations; create_all is a safety net)
Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(workflows.router)
app.include_router(planning.router)
app.include_router(blocks.router)
app.include_router(runs.router)
app.include_router(ws.router)


@app.get("/")
async def root():
    return {"message": "WorkLine AI API is running", "version": "0.2.0", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
