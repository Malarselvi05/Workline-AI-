from sqlalchemy import create_engine, text
from app.db.session import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
with engine.connect() as conn:
    with conn.begin():
        print("Clearing database...")
        conn.execute(text("TRUNCATE drift_alerts, audit_logs, run_node_states, workflow_runs, files, workflow_edges, workflow_nodes, conversation_turns, conversations, workflows, users, organisations RESTART IDENTITY CASCADE"))
        print("Database cleared.")