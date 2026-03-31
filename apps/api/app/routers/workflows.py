from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.workflow import WorkflowCreate, WorkflowResponse, WorkflowDetailResponse, NodeSchema, EdgeSchema, WorkflowBase
from typing import List, Optional
from app.auth.dependencies import get_current_user, require_viewer, require_editor
from app.db.session import get_db
from app.models import models
from app.services.audit import log_action
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.post("", response_model=WorkflowResponse, dependencies=[require_editor])
async def create_workflow(
    workflow_data: WorkflowCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # Calculate version and handle lineage
    version_num = 1
    if workflow_data.parent_version_id:
        parent = db.query(models.Workflow).filter(models.Workflow.id == workflow_data.parent_version_id).first()
        if parent:
            version_num = (parent.version or 1) + 1

    # Save workflow
    new_workflow = models.Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        status="draft",
        version=version_num,
        parent_version_id=workflow_data.parent_version_id,
        created_by=current_user.id,
        org_id=current_user.org_id
    )
    db.add(new_workflow)
    db.flush() # Get the workflow ID but don't commit yet
    
    # Add nodes
    for node_data in workflow_data.nodes:
        node = models.WorkflowNode(
            id=node_data.id,
            workflow_id=new_workflow.id,
            org_id=current_user.org_id,
            label=node_data.data.label if node_data.data else (node_data.type or "Node"),
            type=node_data.type,
            config_json=node_data.data.config if node_data.data else {},
            position_x=node_data.position["x"],
            position_y=node_data.position["y"],
            reasoning=node_data.reasoning
        )
        db.add(node)
    
    db.flush() # Ensure nodes are flushed before edges reference them

    # Add edges
    for edge_data in workflow_data.edges:
        edge = models.WorkflowEdge(
            id=edge_data.id,
            workflow_id=new_workflow.id,
            org_id=current_user.org_id,
            source_node_id=edge_data.source,
            target_node_id=edge_data.target,
            edge_type=edge_data.edge_type or "default"
        )
        db.add(edge)
        
    log_action(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="WORKFLOW",
        entity_id=new_workflow.id
    )
    
    db.commit()
    db.refresh(new_workflow)
    return new_workflow

@router.get("", response_model=List[WorkflowResponse])
async def list_workflows(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return db.query(models.Workflow).filter(models.Workflow.org_id == current_user.org_id).all()

@router.get("/{workflow_id}", response_model=WorkflowDetailResponse)
async def get_workflow(
    workflow_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.org_id == current_user.org_id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Map nodes
    nodes = []
    for node in workflow.nodes:
        nodes.append({
            "id": node.id,
            "type": node.type,
            "data": {
                "label": node.label,
                "config": node.config_json
            },
            "position": {"x": node.position_x, "y": node.position_y},
            "reasoning": node.reasoning
        })
        
    # Map edges
    edges = []
    for edge in workflow.edges:
        edges.append({
            "id": edge.id,
            "source": edge.source_node_id,
            "target": edge.target_node_id,
            "edge_type": edge.edge_type
        })
        
    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "status": workflow.status,
        "version": workflow.version,
        "parent_version_id": workflow.parent_version_id,
        "created_at": workflow.created_at,
        "org_id": workflow.org_id,
        "nodes": nodes,
        "edges": edges
    }

@router.post("/{workflow_id}/deploy", response_model=WorkflowResponse, dependencies=[require_editor])
async def deploy_workflow(
    workflow_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Archive older active versions of the same "lineage" if we had a unique name index, 
    # but for now let's just archive previous ones with same name in same org
    db.query(models.Workflow).filter(
        models.Workflow.org_id == current_user.org_id,
        models.Workflow.name == workflow.name,
        models.Workflow.status == "active",
        models.Workflow.id != workflow.id
    ).update({"status": "archived"})
    
    workflow.status = "active"
    
    log_action(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        action="DEPLOY",
        entity_type="WORKFLOW",
        entity_id=workflow.id
    )
    
    db.commit()
    db.refresh(workflow)
    return workflow

@router.patch("/{workflow_id}", response_model=WorkflowResponse, dependencies=[require_editor])
async def update_workflow(
    workflow_id: int, 
    workflow_data: WorkflowBase, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.name = workflow_data.name
    workflow.description = workflow_data.description
    
    log_action(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="WORKFLOW",
        entity_id=workflow.id
    )
    
    db.commit()
    db.refresh(workflow)
    return workflow

@router.delete("/{workflow_id}", response_model=WorkflowResponse, dependencies=[require_editor])
async def delete_workflow(
    workflow_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.status = "archived"
    
    log_action(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        action="DELETE",
        entity_type="WORKFLOW",
        entity_id=workflow.id
    )
    
    db.commit()
    db.refresh(workflow)
    return workflow

@router.post("/{workflow_id}/rollback/{version_id}", response_model=WorkflowResponse, dependencies=[require_editor])
async def rollback_workflow(
    workflow_id: int, 
    version_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Get the source workflow (current one)
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Get the target version
    target_version = db.query(models.Workflow).filter(models.Workflow.id == version_id).first()
    if not target_version:
        raise HTTPException(status_code=404, detail="Target version not found")

    # Create a new version
    new_version = models.Workflow(
        name=target_version.name,
        description=target_version.description,
        status="draft",
        version=workflow.version + 1,
        parent_version_id=workflow.id,
        created_by=current_user.id,
        org_id=current_user.org_id
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    
    # Copy nodes from target version
    for node in target_version.nodes:
        new_node = models.WorkflowNode(
            id=node.id,
            workflow_id=new_version.id,
            org_id=current_user.org_id,
            label=node.label,
            type=node.type,
            config_json=node.config_json,
            position_x=node.position_x,
            position_y=node.position_y,
            reasoning=node.reasoning
        )
        db.add(new_node)
        
    db.flush() # Ensure nodes are flushed before edges reference them

    # Copy edges from target version
    for edge in target_version.edges:
        new_edge = models.WorkflowEdge(
            id=edge.id,
            workflow_id=new_version.id,
            org_id=current_user.org_id,
            source_node_id=edge.source_node_id,
            target_node_id=edge.target_node_id,
            edge_type=edge.edge_type
        )
        db.add(new_edge)
        
    log_action(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        action="ROLLBACK",
        entity_type="WORKFLOW",
        entity_id=new_version.id
    )
    
    db.commit()
    db.refresh(new_version)
    return new_version

@router.get("/{workflow_id}/versions", response_model=List[WorkflowResponse])
async def get_workflow_versions(
    workflow_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.org_id == current_user.org_id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    # Find all versions in the same "lineage"
    # For now, simplest is finding all with same name in same org
    # (In a real system we'd follow parent_version_id chain)
    return db.query(models.Workflow).filter(
        models.Workflow.org_id == workflow.org_id,
        models.Workflow.name == workflow.name
    ).order_by(models.Workflow.version.desc(), models.Workflow.created_at.desc()).all()

@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Important: Only editors can run for now
    if current_user.role not in ["admin", "editor"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Import here to avoid circular dependencies
    from app.core.tasks import execute_workflow_task
    
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.org_id == current_user.org_id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    try:
        # Try background task
        task = execute_workflow_task.delay(workflow_id, org_id=current_user.org_id)
        return {"task_id": task.id, "status": "queued", "mode": "background"}
    except Exception as e:
        logger.warning(f"Celery not available, running synchronously: {e}")
        # Synchronous fallback
        result = execute_workflow_task(workflow_id, org_id=current_user.org_id)
        return {"status": "completed", "mode": "synchronous", "result": result}

@router.get("/{workflow_id}/runs")
async def list_workflow_runs(
    workflow_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.org_id == current_user.org_id
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    return db.query(models.WorkflowRun).filter(models.WorkflowRun.workflow_id == workflow_id).all()
