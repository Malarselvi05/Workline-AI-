from app.models import models
from sqlalchemy.orm import Session
from typing import Optional

def log_action(
    db: Session,
    org_id: int,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    details: Optional[str] = None
):
    """
    Helper function to log an action to the audit_logs table.
    """
    audit_log = models.AuditLog(
        org_id=org_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    )
    db.add(audit_log)
    # We don't commit here, we let the caller commit along with their main transaction
    return audit_log
