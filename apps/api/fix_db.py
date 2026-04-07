import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
    print("Not using Postgres. Skipping fix.")
    exit(0)

try:
    # Parse connection string
    # postgresql://postgres:2124@localhost:5432/workline
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    tables = ["workflow_runs", "run_node_states", "workflows", "workflow_nodes", "workflow_edges"]
    
    for table in tables:
        try:
            print(f"Checking table {table} for org_id...")
            cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS org_id INTEGER;")
            print(f"Success for {table}")
        except Exception as e:
            print(f"Error for {table}: {e}")

    cur.close()
    conn.close()
    print("Database fix complete.")
except Exception as e:
    print(f"Fatal error fixing DB: {e}")
