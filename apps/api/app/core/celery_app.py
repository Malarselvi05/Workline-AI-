import os
import sys

# Add the project root to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
packages_dir = os.path.abspath(os.path.join(root_dir, 'workline-ai', 'packages'))

if root_dir not in sys.path:
    sys.path.append(root_dir)
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
    "app.core.tasks.execute_workflow_task": "main-queue"
}

celery_app.autodiscover_tasks(["app.core"])
