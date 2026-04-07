from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.models import User, DomainPack
from app.auth.dependencies import get_current_user, require_editor
from packages.shared_types.api_schemas import DomainPackResponse

router = APIRouter(prefix="/packs", tags=["Domain Packs"])

KNOWN_PACKS = ["mechanical"]

@router.get("", response_model=List[DomainPackResponse])
def get_packs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    packs = []
    # get installed packs for the org
    installed_records = db.query(DomainPack).filter(
        DomainPack.org_id == current_user.org_id, 
        DomainPack.status == "installed"
    ).all()
    installed_names = {p.name for p in installed_records}

    for pack_name in KNOWN_PACKS:
        status = "installed" if pack_name in installed_names else "available"
        packs.append(DomainPackResponse(name=pack_name, status=status))

    return packs


@router.post("/{name}/install")
def install_pack(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor)
):
    if name not in KNOWN_PACKS:
        raise HTTPException(status_code=404, detail="Pack not found")

    pack = db.query(DomainPack).filter(
        DomainPack.org_id == current_user.org_id, 
        DomainPack.name == name
    ).first()
    
    if pack:
        pack.status = "installed"
    else:
        pack = DomainPack(org_id=current_user.org_id, name=name, status="installed")
        db.add(pack)
    
    db.commit()
    return {"message": f"Pack {name} installed successfully."}


@router.post("/{name}/uninstall")
def uninstall_pack(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor)
):
    if name not in KNOWN_PACKS:
        raise HTTPException(status_code=404, detail="Pack not found")

    pack = db.query(DomainPack).filter(
        DomainPack.org_id == current_user.org_id, 
        DomainPack.name == name
    ).first()
    
    if pack:
        pack.status = "available"
        db.commit()
        
    return {"message": f"Pack {name} uninstalled successfully."}