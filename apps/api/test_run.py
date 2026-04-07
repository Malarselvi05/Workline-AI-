import asyncio
import os
import sys
from dotenv import load_dotenv

# Set up paths
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
sys.path.append(current_dir)
sys.path.append(os.path.join(root_dir, "packages"))
load_dotenv(os.path.join(current_dir, ".env"))

from app.core.tasks import run_workflow_async

async def test():
    # Pass a specific workflow id that exists, usually 1 or whatever we find. Let's try 8.
    print("Testing run_workflow_async(8)")
    try:
        result = await run_workflow_async(8, None, False, 1)
        print("RESULT:")
        print(result)
    except Exception as e:
        print("EXCEPTION FATAL:")
        print(str(e))

if __name__ == "__main__":
    asyncio.run(test())
