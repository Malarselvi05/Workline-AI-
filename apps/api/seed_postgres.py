from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.models import models
from app.auth.jwt import get_password_hash

def seed():
    db = SessionLocal()
    try:
        # 1. Create Default Org
        org = db.query(models.Organisation).filter(models.Organisation.name == "Default Org").first()
        if not org:
            org = models.Organisation(name="Default Org", plan="enterprise")
            db.add(org)
            db.commit()
            db.refresh(org)
            print(f"Created Organisation: {org.name}")
        
        # 2. Create Admin User
        user = db.query(models.User).filter(models.User.email == "admin@example.com").first()
        if not user:
            user = models.User(
                name="Admin User",
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                role="admin",
                org_id=org.id
            )
            db.add(user)
            db.commit()
            print(f"Created User: {user.email} / password: admin123")
        else:
            print(f"User {user.email} already exists.")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed()
