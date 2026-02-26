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
