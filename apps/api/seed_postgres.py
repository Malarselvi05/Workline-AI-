from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.models import models
from app.auth.jwt import get_password_hash

def get_or_create_org(db: Session, name: str):
    org = db.query(models.Organisation).filter(models.Organisation.name == name).first()
    if not org:
        org = models.Organisation(name=name, plan="enterprise")
        db.add(org)
        db.commit()
        db.refresh(org)
        print(f"Created Organisation: {org.name}")
    return org

def get_or_create_user(db: Session, email: str, password: str, role: str, org_id: int):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            name=email.split("@")[0],
            email=email,
            password_hash=get_password_hash(password),
            role=role,
            org_id=org_id
        )
        db.add(user)
        db.commit()
        print(f"Created User: {user.email} [{role}] / password: {password}")
    else:
        print(f"User {user.email} already exists.")
    return user

def seed():
    db = SessionLocal()
    try:
        # 1. Organization 1 setup
        org1 = get_or_create_org(db, "Organization 1")
        get_or_create_user(db, "malarrajamani24@gmail.com", "1234", "admin", org1.id)
        get_or_create_user(db, "memberj@example.com", "admin123", "admin", org1.id)
        
        # 2. Organization 2 setup
        org2 = get_or_create_org(db, "Organization 2")
        get_or_create_user(db, "admin@workline.ai", "admin123", "admin", org2.id)
        get_or_create_user(db, "viewer@workline.ai", "viewer123", "viewer", org2.id)
        
    finally:
        db.close()

if __name__ == "__main__":
    seed()
