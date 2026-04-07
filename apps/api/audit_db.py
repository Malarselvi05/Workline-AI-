from app.db.session import SessionLocal
from app.models import models
import sqlite3
import os

def audit():
    print("--- POSTGRES DB ---")
    try:
        db = SessionLocal()
        wfs = db.query(models.Workflow).all()
        for w in wfs:
            print(f"Workflow: {w.name} (Org: {w.org_id})")
        users = db.query(models.User).all()
        for u in users:
            print(f"User: {u.email} (Org: {u.org_id})")
        db.close()
    except Exception as e:
        print(f"Postgres Audit Error: {e}")

    print("\n--- SQLITE DB ---")
    db_path = "workline.db"
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT name, org_id FROM workflows")
            rows = cursor.fetchall()
            for row in rows:
                print(f"Workflow: {row[0]} (Org: {row[1]})")
            cursor.execute("SELECT email, org_id FROM users")
            rows = cursor.fetchall()
            for row in rows:
                print(f"User: {row[0]} (Org: {row[1]})")
        except Exception as e:
            print(f"SQLite Audit Error: {e}")
        conn.close()

if __name__ == "__main__":
    audit()
