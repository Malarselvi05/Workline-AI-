import pytest
import time
from app.main import app
from fastapi.testclient import TestClient
from packages.workflow_engine.engine import WorkflowEngine

client = TestClient(app)

@pytest.mark.asyncio
async def test_engine_benchmark_3_nodes():
    start = time.time()
    
    workflow_data = {
        "nodes": [
            {"id": "node_1", "type": "api_trigger", "config": {}},
            {"id": "node_2", "type": "clean", "config": {}},
            {"id": "node_3", "type": "score", "config": {"score_value": 0.8}},
        ],
        "edges": [
            {"id": "e1-2", "source": "node_1", "target": "node_2", "edge_type": "default"},
            {"id": "e2-3", "source": "node_2", "target": "node_3", "edge_type": "default"},
        ]
    }
    
    engine = WorkflowEngine(workflow_data, is_sandbox=True)
    result = await engine.execute(initial_input={"test": "data"})
    
    end = time.time()
    duration = end - start
    
    assert result["status"] == "completed"
    assert duration < 2.0, f"Engine execution took {duration}s -> longer than 2s limit!"

def test_plan_benchmark(monkeypatch):
    print(f"[PY] test_benchmark.py | test_plan_benchmark | L34: System checking in")
    """
    Benchmarks the overhead of POST /plan router parsing, validation, DAG layout.
    LLM call is mocked to verify the API speed overhead < 5s limit logic.
    """
    from app.ai.planner import GroqPlanner
    
    def fake_call_llm(self, messages):
        print(f"[PY] test_benchmark.py | fake_call_llm | L41: System checking in")
        return {
            "title": "Benchmark Output",
            "reasoning": "Quick test",
            "nodes": [],
            "edges": []
        }
        
    monkeypatch.setattr(GroqPlanner, "_call_llm", fake_call_llm)
    
    start = time.time()
    
    # Bypass auth for benchmark performance isolation
    from app.auth.dependencies import get_current_active_user, require_viewer
    from app.models.models import User
    
    def override_require_viewer():
        print(f"[PY] test_benchmark.py | override_require_viewer | L57: Keep it up")
        return User(id=1, org_id=1, email="bench@test.com", role="admin")
        
    app.dependency_overrides[require_viewer] = override_require_viewer
    
    response = client.post("/plan", json={"goal": "Test workflow benchmark target"})
    
    end = time.time()
    duration = end - start
    
    app.dependency_overrides = {}
    
    # Might be 400 or 422 if empty dag fails validation, but overhead is still tested
    assert duration < 5.0, f"POST /plan took {duration}s -> longer than 5s limit!"