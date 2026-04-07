"""
packages/shared-types/api_schemas.py
Shared Pydantic request/response models for every WorkLine AI endpoint.
Both the API routers and any test clients should import from here.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


# ── Block schemas ──────────────────────────────────────────────────────────

class NodePosition(BaseModel):
    x: float
    y: float


class NodeData(BaseModel):
    label: str
    config: Dict[str, Any] = {}
    reasoning: Optional[str] = None


class NodeSchema(BaseModel):
    id: str
    type: str
    position: NodePosition
    data: NodeData
    reasoning: Optional[str] = None


class EdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    edge_type: str = "default"   # default | condition_true | condition_false


# ── Planning ───────────────────────────────────────────────────────────────

class PlanRequest(BaseModel):
    goal: str
    conversation_id: Optional[int] = None


class WorkflowProposal(BaseModel):
    title: str
    reasoning: str
    nodes: List[NodeSchema]
    edges: List[EdgeSchema]
    conversation_id: int


class ConversationTurnOut(BaseModel):
    id: int
    role: str                            # "user" | "assistant"
    content: str
    proposal_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationOut(BaseModel):
    id: int
    org_id: Optional[int] = None
    workflow_id: Optional[int] = None
    created_at: datetime
    turns: List[ConversationTurnOut] = []

    model_config = ConfigDict(from_attributes=True)


# ── Workflows ──────────────────────────────────────────────────────────────

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None


class WorkflowCreate(WorkflowBase):
    nodes: List[NodeSchema] = []
    edges: List[EdgeSchema] = []


class WorkflowResponse(WorkflowBase):
    id: int
    org_id: Optional[int] = None
    status: str
    version: int
    parent_version_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkflowDetailResponse(WorkflowResponse):
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []


# ── Auth ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Runs ───────────────────────────────────────────────────────────────────

class WorkflowRunResponse(BaseModel):
    id: int
    workflow_id: int
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    logs: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)
# ── Domain Packs ──────────────────────────────────────────────────────────

class DomainPackResponse(BaseModel):
    name: str # mechanical, etc
    status: str # installed | available


# ── Dashboard ─────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_runs_week: int
    success_rate: float
    avg_duration: float
    active_drift_alerts: int


class RecentRun(BaseModel):
    id: int
    workflow_name: str
    triggered_by: str
    status: str
    started_at: datetime
    duration: float


class DashboardRecentRuns(BaseModel):
    runs: List[RecentRun]


class DashboardDriftAlert(BaseModel):
    id: int
    workflow_name: str
    metric: str
    baseline_val: float
    current_val: float
    created_at: datetime


class DashboardDriftAlerts(BaseModel):
    alerts: List[DashboardDriftAlert]
