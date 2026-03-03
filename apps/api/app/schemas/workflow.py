from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class NodeData(BaseModel):
    label: Optional[str] = ""
    config: Optional[Dict[str, Any]] = {}

class NodeSchema(BaseModel):
    id: str
    type: str
    data: Optional[NodeData] = None
    position: Dict[str, float]
    reasoning: Optional[str] = None

class EdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    edge_type: Optional[str] = "default"

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = ""

class WorkflowCreate(WorkflowBase):
    nodes: List[NodeSchema] = []
    edges: List[EdgeSchema] = []
    parent_version_id: Optional[int] = None

class WorkflowResponse(WorkflowBase):
    id: int
    status: str
    version: int
    parent_version_id: Optional[int]
    created_at: datetime
    org_id: Optional[int]

    class Config:
        from_attributes = True

class WorkflowDetailResponse(WorkflowResponse):
    nodes: List[NodeSchema]
    edges: List[EdgeSchema]
