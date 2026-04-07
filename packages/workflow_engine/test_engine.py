import asyncio
import sys
import os

# Set up paths to import from packages and api
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from workline_ai.packages.workflow_engine.engine import WorkflowEngine

async def test_engine():
    print(f"[PY] test_engine.py | test_engine | L10: Keep it up")
    workflow_data = {
        "nodes": [
            {"id": "n1", "type": "ocr", "config": {}},
            {"id": "n2", "type": "classify", "config": {}},
            {"id": "n3", "type": "store", "config": {}}
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2"},
            {"id": "e2", "source": "n2", "target": "n3"}
        ]
    }
    
    engine = WorkflowEngine(workflow_data)
    print("Starting execution...")
    results = await engine.execute(initial_input={"file": "demo.pdf"})
    print("\nFinal Results:")
    for node_id, output in results.items():
        print(f"Node {node_id}: {output}")

if __name__ == "__main__":
    asyncio.run(test_engine())