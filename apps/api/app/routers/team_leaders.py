"""
apps/api/app/routers/team_leaders.py
Full CRUD for the TeamLeader skill database.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.models import TeamLeader
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/team-leaders", tags=["Team Leaders"])


# ── DB dependency ─────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TeamLeaderCreate(BaseModel):
    name: str
    role: Optional[str] = None
    skills: List[str] = []
    workload_pct: int = 0


class TeamLeaderUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    skills: Optional[List[str]] = None
    workload_pct: Optional[int] = None
    is_active: Optional[bool] = None


class TeamLeaderOut(BaseModel):
    id: int
    org_id: Optional[int]
    name: str
    role: Optional[str]
    skills: List[str]
    workload_pct: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[TeamLeaderOut])
def list_team_leaders(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return all active team leaders for the current org."""
    leaders = (
        db.query(TeamLeader)
        .filter(
            TeamLeader.org_id == current_user.org_id,
            TeamLeader.is_active == True,  # noqa: E712
        )
        .order_by(TeamLeader.created_at.asc())
        .all()
    )
    return leaders


@router.post("", response_model=TeamLeaderOut, status_code=status.HTTP_201_CREATED)
def create_team_leader(
    data: TeamLeaderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new team leader entry."""
    leader = TeamLeader(
        org_id=current_user.org_id,
        name=data.name,
        role=data.role,
        skills=data.skills,
        workload_pct=data.workload_pct,
    )
    db.add(leader)
    db.commit()
    db.refresh(leader)
    return leader


@router.patch("/{leader_id}", response_model=TeamLeaderOut)
def update_team_leader(
    leader_id: int,
    data: TeamLeaderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update name, role, skills, or workload of a team leader."""
    leader = (
        db.query(TeamLeader)
        .filter(TeamLeader.id == leader_id, TeamLeader.org_id == current_user.org_id)
        .first()
    )
    if not leader:
        raise HTTPException(status_code=404, detail="Team leader not found")

    if data.name is not None:
        leader.name = data.name
    if data.role is not None:
        leader.role = data.role
    if data.skills is not None:
        leader.skills = data.skills
    if data.workload_pct is not None:
        leader.workload_pct = data.workload_pct
    if data.is_active is not None:
        leader.is_active = data.is_active

    db.commit()
    db.refresh(leader)
    return leader


@router.delete("/{leader_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_leader(
    leader_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Hard-delete a team leader (soft-delete via is_active=False is handled by PATCH)."""
    leader = (
        db.query(TeamLeader)
        .filter(TeamLeader.id == leader_id, TeamLeader.org_id == current_user.org_id)
        .first()
    )
    if not leader:
        raise HTTPException(status_code=404, detail="Team leader not found")

    db.delete(leader)
    db.commit()
