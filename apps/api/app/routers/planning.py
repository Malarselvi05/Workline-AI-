"""
routers/planning.py — J1 Conversation & Planning Backend

Endpoints:
  POST /plan              — run the Groq LLM planner, return a WorkflowProposal
  GET  /conversations/{id} — return full conversation history (for page-reload restore)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from app.db.session import get_db
from app.models import models
from app.ai.planner import GroqPlanner
from app.auth.dependencies import get_current_active_user, require_viewer

import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["planning"])

# ---------------------------------------------------------------------------
# Request / Response schemas (inline — no shared-types package yet)
# ---------------------------------------------------------------------------

class PlanRequest(BaseModel):
    goal: str
    conversation_id: Optional[int] = None


class ConversationTurnOut(BaseModel):
    id: int
    role: str
    content: str
    proposal_json: Optional[Dict[str, Any]] = None
    created_at: Any

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    org_id: Optional[int] = None
    workflow_id: Optional[int] = None
    created_at: Any
    turns: List[ConversationTurnOut] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# POST /plan
# ---------------------------------------------------------------------------

@router.post("/plan", dependencies=[Depends(require_viewer)])
async def plan_workflow(
    request: PlanRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Convert a natural-language goal into a WorkflowProposal via Groq LLM.
    If `conversation_id` is supplied, the 8-turn history is included for context.
    """
    try:
        planner = GroqPlanner()
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )

    try:
        proposal = await planner.plan(
            goal=request.goal,
            db=db,
            conversation_id=request.conversation_id,
            org_id=current_user.org_id,
        )
    except RuntimeError as e:
        logger.error(f"Planner error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    return proposal


# ---------------------------------------------------------------------------
# GET /conversations/{id}
# ---------------------------------------------------------------------------

@router.get("/conversations/{conversation_id}", response_model=ConversationOut, dependencies=[Depends(require_viewer)])
async def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """Return a full conversation with all its turns (for chatbot restore on page reload)."""
    convo = (
        db.query(models.Conversation)
        .filter(models.Conversation.id == conversation_id)
        .first()
    )
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo