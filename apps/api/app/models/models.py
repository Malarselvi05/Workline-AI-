from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from app.db.session import Base

class Organisation(Base):
    __tablename__ = "organisations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    plan = Column(String, default="basic")
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    role = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    name = Column(String)
    description = Column(Text)
    status = Column(String, default="draft")  # draft, active, archived
    version = Column(Integer, default=1)
    parent_version_id = Column(Integer, ForeignKey("workflows.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    nodes = relationship("WorkflowNode", back_populates="workflow", cascade="all, delete-orphan")
    edges = relationship("WorkflowEdge", back_populates="workflow", cascade="all, delete-orphan")

class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"
    id = Column(String, primary_key=True)  # React Flow used string IDs
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    type = Column(String)
    config_json = Column(JSON)
    position_x = Column(Float)
    position_y = Column(Float)
    reasoning = Column(Text, nullable=True)
    
    workflow = relationship("Workflow", back_populates="nodes")

class WorkflowEdge(Base):
    __tablename__ = "workflow_edges"
    id = Column(String, primary_key=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    source_node_id = Column(String, ForeignKey("workflow_nodes.id"))
    target_node_id = Column(String, ForeignKey("workflow_nodes.id"))
    edge_type = Column(String, default="default")  # default, condition_true, condition_false
    
    workflow = relationship("Workflow", back_populates="edges")

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    status = Column(String)  # pending, running, completed, failed, awaiting_review
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    logs = Column(JSON)

class RunNodeState(Base):
    __tablename__ = "run_node_states"
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("workflow_runs.id"))
    node_id = Column(String)
    status = Column(String)  # pending, running, completed, failed, skipped
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    output_json = Column(JSON)
    error = Column(Text)

class File(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    path = Column(String)
    hash = Column(String)
    metadata_json = Column(JSON)

class ModelMetadata(Base):
    __tablename__ = "models"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    type = Column(String)
    version = Column(String)
    metrics_json = Column(JSON)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    entity_type = Column(String)
    entity_id = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)

class DriftAlert(Base):
    __tablename__ = "drift_alerts"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    metric = Column(String)
    baseline_val = Column(Float)
    current_val = Column(Float)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
