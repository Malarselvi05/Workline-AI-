from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from packages.shared_types.block_registry import BLOCK_REGISTRY, BlockDefinition, BlockCategory
from app.auth.dependencies import require_viewer

router = APIRouter(prefix="/blocks", tags=["blocks"])

@router.get("", response_model=List[BlockDefinition], dependencies=[Depends(require_viewer)])
async def list_blocks(pack: Optional[str] = None):
    print(f"[PY] blocks.py | list_blocks | L9: Data processing")
    """
    List all available blocks.
    Optional filter by pack (e.g., ?pack=mechanical).
    """
    blocks = list(BLOCK_REGISTRY.values())
    
    if pack == "mechanical":
        blocks = [b for b in blocks if b.category == BlockCategory.MECHANICAL]
    elif pack == "core":
        blocks = [b for b in blocks if b.category != BlockCategory.MECHANICAL]
        
    return blocks

@router.get("/{block_type}", response_model=BlockDefinition, dependencies=[Depends(require_viewer)])
async def get_block(block_type: str):
    print(f"[PY] blocks.py | get_block | L24: Keep it up")
    """
    Get detailed definition for a specific block type.
    """
    if block_type not in BLOCK_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Block type '{block_type}' not found")
        
    return BLOCK_REGISTRY[block_type]