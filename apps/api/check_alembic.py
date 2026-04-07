from sqlalchemy import create_engine, text
from app.db.session import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
with engine.connect() as conn:
    try:
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        row = result.fetchone()
        if row:
            print(f"Current version: {row[0]}")
        else:
            print("alembic_version table is empty")
    except Exception as e:
        print(f"Error checking alembic_version: {e}")