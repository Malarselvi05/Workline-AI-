import sys
import os

# Resolve the monorepo root
_app_dir   = os.path.dirname(os.path.abspath(__file__))   # …/scripts
_repo_root = os.path.dirname(_app_dir)                     # …/Workline-AI
_api_dir   = os.path.join(_repo_root, 'apps', 'api')       # …/apps/api

sys.path.insert(0, _api_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(_api_dir, '.env'))

from app.db.session import engine, Base
from app.models import models

def reset_database():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables with new schema...")
    Base.metadata.create_all(bind=engine)
    print("Database reset successfully.")

if __name__ == "__main__":
    confirm = input("This will DELETE ALL DATA in your database. Are you sure? (y/n): ")
    if confirm.lower() == 'y':
        reset_database()
    else:
        print("Aborted.")
