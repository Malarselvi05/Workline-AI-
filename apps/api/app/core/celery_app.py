import os
import sys

# Add the project root to sys.path
# __file__ is apps/api/app/core/celery_app.py
# parent 3 levels up is apps/api
# parent 4 levels up is workspace root (workline-ai)
api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
root_dir = os.path.abspath(os.path.join(api_dir, '..'))
packages_dir = os.path.abspath(os.path.join(root_dir, 'packages'))

if api_dir not in sys.path:
    sys.path.append(api_dir)
if packages_dir not in sys.path:
    sys.path.append(packages_dir)

from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.task_routes = {
    "app.core.tasks.execute_workflow_task": "main-queue",
    "app.core.scheduler.trigger_scheduled_workflow": "main-queue",
}

# Dynamic beat schedules are populated at runtime by app.core.scheduler
celery_app.conf.beat_schedule = {}
celery_app.conf.timezone = "UTC"

celery_app.autodiscover_tasks(["app.core"])

