import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable, Awaitable

logger = logging.getLogger(__name__)

# Import the registry to get block definitions (for retries, config, etc.)
# We use a try-except here to handle different import paths during development/testing
try:
    from packages.shared_types.block_registry import BLOCK_REGISTRY
except ImportError:
    try:
        from shared_types.block_registry import BLOCK_REGISTRY
    except ImportError:
        BLOCK_REGISTRY = {}

from block_library.src.generic.blocks import (
    OCRBlock, ClassifyBlock, StoreFileBlock,
    APITriggerBlock, FormInputBlock, ParseBlock,
    TextCleanerBlock, FieldMapperBlock, RouterBlock,
    ScorerBlock, HumanReviewBlock, TaskCreateBlock, NotifyBlock
)
from block_library.src.mechanical.blocks import (
    DrawingClassifierBlock, 
    POExtractorBlock, 
    DuplicateDrawingDetectorBlock, 
    TeamLeaderRecommenderBlock
)

class WorkflowEngine:
    BLOCK_IMPLEMENTATIONS = {
        "ocr": OCRBlock,
        "classify": ClassifyBlock,
        "store": StoreFileBlock,
        "api_trigger": APITriggerBlock,
        "form_input": FormInputBlock,
        "parse": ParseBlock,
        "clean": TextCleanerBlock,
        "map_fields": FieldMapperBlock,
        "router": RouterBlock,
        "score": ScorerBlock,
        "human_review": HumanReviewBlock,
        "create_task": TaskCreateBlock,
        "notify": NotifyBlock,
        "drawing_classifier": DrawingClassifierBlock,
        "po_extractor": POExtractorBlock,
        "duplicate_detector": DuplicateDrawingDetectorBlock,
        "team_leader_recommender": TeamLeaderRecommenderBlock
    }

    def __init__(
        self, 
        workflow_data: Dict[str, Any], 
        on_node_status: Optional[Callable[[str, str, Optional[Any], Optional[str]], Awaitable[None]]] = None,
        is_sandbox: bool = False,
        completed_node_ids: Optional[List[str]] = None,
        initial_node_outputs: Optional[Dict[str, Any]] = None
    ):
        self.nodes = workflow_data["nodes"]
        self.edges = workflow_data["edges"]
        self.on_node_status = on_node_status
        self.is_sandbox = is_sandbox
        self.completed_node_ids = set(completed_node_ids or [])
        
        self.node_map = {node["id"]: node for node in self.nodes}
        self.adj = {node["id"]: [] for node in self.nodes}
        self.in_degree = {node["id"]: 0 for node in self.nodes}
        
        for edge in self.edges:
            self.adj[edge["source"]].append(edge["target"])
            self.in_degree[edge["target"]] += 1
            
        self.node_outputs = initial_node_outputs or {}
        self.node_statuses = {node["id"]: "pending" for node in self.nodes}
        
        # Mark previously completed nodes
        for nid in self.completed_node_ids:
            if nid in self.node_statuses:
                self.node_statuses[nid] = "completed"

        self.failed_nodes = set()
        self.skipped_nodes = set()
        self.waiting_nodes = set()

    async def emit_status(self, node_id: str, status: str, output: Any = None, error: str = None):
        if self.on_node_status:
            # We wrap the call to ensure it's awaited if it's a coroutine
            if asyncio.iscoroutinefunction(self.on_node_status):
                await self.on_node_status(node_id, status, output, error)
            else:
                self.on_node_status(node_id, status, output, error)

    async def run_block_with_retry(self, node_id: str, block_class, config: Dict[str, Any], block_def: Any):
        # Default retry config if not in registry
        max_retries = 3
        allow_retry = True
        
        if block_def:
            # block_def might be a Pydantic model or dict
            if hasattr(block_def, 'max_retries'):
                max_retries = block_def.max_retries
                allow_retry = block_def.allow_retry
            elif isinstance(block_def, dict):
                max_retries = block_def.get('max_retries', 3)
                allow_retry = block_def.get('allow_retry', True)
            
        if not allow_retry:
            max_retries = 0
            
        attempt = 0
        last_error = None
        
        while attempt <= max_retries:
            try:
                block = block_class(config, is_sandbox=self.is_sandbox)
                output = await block.run(self.node_outputs)
                return output, None
            except Exception as e:
                attempt += 1
                last_error = str(e)
                logger.warning(f"Node {node_id} attempt {attempt} failed: {last_error}")
                if attempt <= max_retries:
                    wait_time = (2 ** attempt) * 0.1 # Exponential backoff
                    await asyncio.sleep(wait_time)
                else:
                    return None, last_error

    async def process_node(self, node_id: str):
        # Check if already completed from a previous session
        if node_id in self.completed_node_ids:
            logger.info(f"Node {node_id} already completed, skipping execution logic")
            # We don't emit a new status since it's already in DB, 
            # but we could if we wanted the UI to refresh.
            return

        # Check if we should skip due to upstream failure
        # For simplicity in this layer-based gather, we check parents
        parents = [e["source"] for e in self.edges if e["target"] == node_id]
        if any(self.node_statuses.get(p) in ["failed", "skipped"] for p in parents):
            self.node_statuses[node_id] = "skipped"
            self.skipped_nodes.add(node_id)
            await self.emit_status(node_id, "skipped")
            return

        node_data = self.node_map[node_id]
        node_type = node_data["type"]
        block_class = self.BLOCK_IMPLEMENTATIONS.get(node_type)
        block_def = BLOCK_REGISTRY.get(node_type)
        
        self.node_statuses[node_id] = "running"
        await self.emit_status(node_id, "running")
        
        if not block_class:
            error_msg = f"No implementation for block type: {node_type}"
            self.node_statuses[node_id] = "failed"
            self.failed_nodes.add(node_id)
            await self.emit_status(node_id, "failed", error=error_msg)
            return

        output, error = await self.run_block_with_retry(
            node_id, 
            block_class, 
            node_data.get("config", {}), 
            block_def
        )
        
        if error:
            self.node_statuses[node_id] = "failed"
            self.failed_nodes.add(node_id)
            await self.emit_status(node_id, "failed", error=error)
        elif isinstance(output, dict) and output.get("status") == "waiting_for_human":
            self.node_statuses[node_id] = "waiting"
            self.waiting_nodes.add(node_id)
            await self.emit_status(node_id, "waiting", output=output)
        else:
            self.node_statuses[node_id] = "completed"
            self.node_outputs[node_id] = output
            await self.emit_status(node_id, "completed", output=output)

    async def execute(self, initial_input: Any = None):
        self.node_outputs = {"initial_input": initial_input}
        
        # Nodes with in_degree 0
        queue = [node_id for node_id, degree in self.in_degree.items() if degree == 0]
        
        while queue:
            # Parallel execution of nodes in current "wave"
            tasks = [self.process_node(node_id) for node_id in queue]
            await asyncio.gather(*tasks)
            
            # If any node is in 'waiting' state, we stop the execution wave
            # and return current state. The task/worker will need to persist this.
            if self.waiting_nodes:
                logger.info("Engine pausing for human review")
                break

            # Prepare next wave
            next_queue = []
            for node_id in queue:
                # Handle Routing: If it was a router, we only follow the branch that match decision
                outputs = self.node_outputs.get(node_id)
                decision = True
                if isinstance(outputs, dict) and "decision" in outputs:
                    decision = outputs["decision"]

                for neighbor in self.adj[node_id]:
                    # Find edge between node_id and neighbor
                    edge = next((e for e in self.edges if e["source"] == node_id and e["target"] == neighbor), None)
                    
                    should_follow = True
                    if edge and edge.get("edge_type") in ["condition_true", "condition_false"]:
                        edge_type = edge["edge_type"]
                        if edge_type == "condition_true" and not decision:
                            should_follow = False
                        if edge_type == "condition_false" and decision:
                            should_follow = False
                    
                    if not should_follow:
                        # Mark neighbor as skipped
                        if self.node_statuses[neighbor] == "pending":
                            self.node_statuses[neighbor] = "skipped"
                            self.skipped_nodes.add(neighbor)
                            await self.emit_status(neighbor, "skipped")
                        # We still need to decrement in_degree to allow topological progression
                        self.in_degree[neighbor] -= 1
                        if self.in_degree[neighbor] == 0:
                            next_queue.append(neighbor)
                        continue

                    self.in_degree[neighbor] -= 1
                    if self.in_degree[neighbor] == 0:
                        next_queue.append(neighbor)
            
            queue = next_queue
            
        return {
            "outputs": self.node_outputs,
            "status": "waiting" if self.waiting_nodes else ("failed" if self.failed_nodes else "completed")
        }
