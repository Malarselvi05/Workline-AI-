from app.db.session import SessionLocal
from app.models import models

def check():
    db = SessionLocal()
    users = db.query(models.User).all()
    print("Registered users:")
    for u in users:
        print(f"- {u.email} (Org ID: {u.org_id})")
    db.close()

if __name__ == "__main__":
    check()
