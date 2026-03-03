import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))
load_dotenv(os.path.join(os.getcwd(), 'apps', 'api', '.env'))

db_url = os.getenv("DATABASE_URL", "sqlite:///./apps/api/workline.db")
print(f"Connecting to: {db_url}")

engine = create_engine(db_url)

def check():
    with engine.connect() as conn:
        print("\n--- ORGANIZATIONS ---")
        res = conn.execute(text("SELECT id, name FROM organisations"))
        for row in res: print(row)

        print("\n--- USERS ---")
        res = conn.execute(text("SELECT id, email, name, role, org_id FROM users"))
        for row in res: print(row)

        print("\n--- WORKFLOWS ---")
        res = conn.execute(text("SELECT id, name, status, org_id, version FROM workflows ORDER BY id"))
        for row in res: print(row)
            
        print("\n--- NODES (Count per workflow) ---")
        res = conn.execute(text("SELECT workflow_id, COUNT(*) FROM workflow_nodes GROUP BY workflow_id ORDER BY workflow_id"))
        for row in res: print(row)

        print("\n--- EDGES (Count per workflow) ---")
        res = conn.execute(text("SELECT workflow_id, COUNT(*) FROM workflow_edges GROUP BY workflow_id ORDER BY workflow_id"))
        for row in res: print(row)

if __name__ == "__main__":
    try:
        check()
    except Exception as e:
        print(f"Error: {e}")
