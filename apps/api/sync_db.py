from app.db.session import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sync_db():
    tables = ["workflows", "workflow_nodes", "workflow_edges", "workflow_runs", "run_node_states", "files", "audit_logs"]
    
    with engine.connect() as conn:
        for table in tables:
            try:
                # Check if column exists (Postgres specific)
                check_sql = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='org_id'")
                res = conn.execute(check_sql).fetchone()
                
                if not res:
                    logger.info(f"Adding org_id to {table}...")
                    # We use a simple ALTER TABLE. For SQLite vs Postgres, syntax might differ.
                    # This script assumes Postgres based on the user error message.
                    alter_sql = text(f"ALTER TABLE {table} ADD COLUMN org_id INTEGER REFERENCES organisations(id)")
                    conn.execute(alter_sql)
                    conn.commit()
                    logger.info(f"✅ Added org_id to {table}")
                else:
                    logger.info(f"Column org_id already exists in {table}")
            except Exception as e:
                logger.error(f"Error updating {table}: {e}")
                # Try a simpler version for SQLite if Postgres fails
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN org_id INTEGER"))
                    conn.commit()
                    logger.info(f"✅ Added org_id to {table} (Simple)")
                except:
                    pass

if __name__ == "__main__":
    sync_db()
