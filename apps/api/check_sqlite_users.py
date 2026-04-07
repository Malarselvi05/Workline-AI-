import sqlite3
import os

db_path = "workline.db"
if os.path.exists(db_path):
    print(f"Checking SQLite at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT email, org_id FROM users")
    rows = cursor.fetchall()
    print("Users in SQLite:")
    for row in rows:
        print(f"- {row[0]} (Org ID: {row[1]})")
    conn.close()
else:
    print("workline.db not found.")
