import pytest
from app.db.session import SessionLocal
from app.models.models import AuditLog, Organisation
from sqlalchemy.exc import DatabaseError, OperationalError, InternalError

def test_audit_logs_append_only():
    db = SessionLocal()
    try:
        # Find or create a dummy org
        org = db.query(Organisation).first()
        if not org:
            org = Organisation(name="Test Org")
            db.add(org)
            db.commit()
            db.refresh(org)

        # INSERT should succeed
        new_log = AuditLog(org_id=org.id, user_id=None, action="test_action", entity_type="test", entity_id=1)
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        assert new_log.id is not None
        
        # UPDATE should fail
        log_to_update = db.query(AuditLog).filter_by(id=new_log.id).first()
        log_to_update.action = "hacked_action"
        try:
            db.commit()
            pytest.fail("UPDATE on audit_logs should have been rejected!")
        except Exception as e:
            # We expect a DatabaseError because of the TRIGGER
            db.rollback()
            msg = str(e).lower()
            assert "append-only" in msg or "abort" in msg or "exception" in msg or "failed" in msg
            
    finally:
        db.close()
