import sqlite3
import os

# Resolve the monorepo root
_api_dir = 'd:/Users/Lenova/Desktop/Projects/MiniProject/workline-ai/apps/api'
db_path = os.path.join(_api_dir, 'workline.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

db = sqlite3.connect(db_path)
cursor = db.cursor()

try:
    print("Adding org_id to workflow_runs...")
    cursor.execute("ALTER TABLE workflow_runs ADD COLUMN org_id INTEGER REFERENCES organisations(id)")
except Exception as e:
    print(f"Skip workflow_runs: {e}")

try:
    print("Adding org_id to drift_alerts...")
    cursor.execute("ALTER TABLE drift_alerts ADD COLUMN org_id INTEGER REFERENCES organisations(id)")
except Exception as e:
    print(f"Skip drift_alerts: {e}")

db.commit()
db.close()
print("Done.")