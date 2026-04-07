import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
    print("Not using Postgres. Skipping fix.")
    exit(0)

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Backfill org_id from workflow_runs to run_node_states
    print("Backfilling org_id to run_node_states from workflow_runs...")
    cur.execute("""
        UPDATE run_node_states 
        SET org_id = workflow_runs.org_id
        FROM workflow_runs
        WHERE run_node_states.run_id = workflow_runs.id
        AND run_node_states.org_id IS NULL;
    """)
    print(f"Updated {cur.rowcount} rows in run_node_states.")

    cur.close()
    conn.close()
    print("Backfill complete.")
except Exception as e:
    print(f"Fatal error backfilling DB: {e}")
