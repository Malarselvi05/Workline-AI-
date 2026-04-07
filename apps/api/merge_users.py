from app.db.session import SessionLocal
from app.models import models

def merge():
    db = SessionLocal()
    try:
        # 1. Target user (The one who created the workflow)
        target_email = "malarrajjamani24@gmail.com"
        target_user = db.query(models.User).filter(models.User.email == target_email).first()
        
        if not target_user:
            print(f"Error: User {target_email} not found in DB.")
            return
            
        target_org_id = target_user.org_id
        print(f"User {target_email} is in Organisation ID: {target_org_id}")
        
        # 2. Users to move into the same Org
        users_to_move = ["memberj@example.com", "admin@example.com"]
        
        for email in users_to_move:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                user.org_id = target_org_id
                print(f"Moved {email} to Org ID: {target_org_id}")
            else:
                print(f"User {email} not found, skipping.")
                
        db.commit()
        print("Success: All users are now in the same organization.")
        
    finally:
        db.close()

if __name__ == "__main__":
    merge()
