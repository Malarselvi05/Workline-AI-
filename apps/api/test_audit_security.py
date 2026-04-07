from app.db.session import SessionLocal
from app.models import models
from sqlalchemy import text

def test_audit_logs():
    db = SessionLocal()
    try:
        # 1. Check existing logs
        print("--- Existing Audit Logs ---")
        logs = db.query(models.AuditLog).all()
        if not logs:
            print("No logs found yet. Creating a test log...")
            # Find an org to link to
            org = db.query(models.Organisation).first()
            if not org:
                print("Error: No Organisation found to create a log.")
                return
            
            test_log = models.AuditLog(
                org_id=org.id,
                user_id=1, # Admin
                action="TEST_ACTION",
                entity_type="workflow",
                entity_id=1,
                details="Manual test log entry"
            )
            db.add(test_log)
            db.commit()
            db.refresh(test_log)
            print(f"Created Test Log ID: {test_log.id}")
        else:
            for l in logs:
                print(f"Log ID {l.id} | Action: {l.action} | Time: {l.timestamp}")

        # 2. ATTEMPT TO DELETE (The Core Test)
        print("\n--- Testing DELETE Protection (Feature 3) ---")
        log_to_delete = db.query(models.AuditLog).first()
        if log_to_delete:
            try:
                db.delete(log_to_delete)
                db.commit()
                print("❌ PROTECTION FAILED: The log was deleted.")
            except Exception as e:
                db.rollback()
                print(f"✅ PROTECTION ACTIVE: The delete was REJECTED with error:\n   '{str(e)}'")
        
        # 3. ATTEMPT TO UPDATE (The Core Test)
        print("\n--- Testing UPDATE Protection (Feature 3) ---")
        log_to_update = db.query(models.AuditLog).first()
        if log_to_update:
            try:
                log_to_update.action = "TAMPERED_ACTION"
                db.commit()
                print("❌ PROTECTION FAILED: The log was updated.")
            except Exception as e:
                db.rollback()
                print(f"✅ PROTECTION ACTIVE: The update was REJECTED with error:\n   '{str(e)}'")

    finally:
        db.close()

if __name__ == "__main__":
    test_audit_logs()
