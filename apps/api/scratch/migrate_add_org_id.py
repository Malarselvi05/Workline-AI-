"""
Quick migration: add missing org_id column to run_node_states table.
"""
import os
import sys
import sqlite3

# Find the database
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "workline.db")
DB_PATH = os.path.abspath(DB_PATH)

print(f"[MIGRATION] Targeting database: {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check existing columns
cursor.execute("PRAGMA table_info(run_node_states)")
columns = [row[1] for row in cursor.fetchall()]
print(f"[MIGRATION] Existing columns: {columns}")

# Add org_id if missing
if "org_id" not in columns:
    print("[MIGRATION] Adding org_id column to run_node_states...")
    cursor.execute("ALTER TABLE run_node_states ADD COLUMN org_id INTEGER")
    conn.commit()
    print("[MIGRATION] SUCCESS: org_id column added!")
else:
    print("[MIGRATION] org_id column already exists, no action needed.")

conn.close()
print("[MIGRATION] Done.")
