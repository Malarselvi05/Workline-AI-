import asyncio
import logging
import json
from typing import Dict, Any, List, Optional, Callable, Awaitable

logger = logging.getLogger(__name__)

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
    ScorerBlock, HumanReviewBlock, TaskCreateBlock, NotifyBlock, GenericFallbackBlock
)
from block_library.src.mechanical.blocks import (
    DrawingClassifierBlock, 
    POExtractorBlock, 
    DuplicateDrawingDetectorBlock, 
    TeamLeaderRecommenderBlock,
    DelayPredictorBlock
)

class WorkflowEngine:
    BLOCK_IMPLEMENTATIONS = {
        "ocr": OCRBlock,
        "classify": ClassifyBlock,
        "store": StoreFileBlock,
        "api_trigger": APITriggerBlock,
        "form_input": FormInputBlock,
        "file_upload": FormInputBlock,  # Added this mapping
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
        "team_leader_recommender": TeamLeaderRecommenderBlock,
        "delay_predictor": DelayPredictorBlock,
        
        # --- Common AI-Generated Aliases ---
        "recommend": TeamLeaderRecommenderBlock,
        "match": TeamLeaderRecommenderBlock,
        "analyze": ClassifyBlock,
        "extract": POExtractorBlock,
        "filter": RouterBlock,
        "review": HumanReviewBlock,
        "approve": HumanReviewBlock,
        "email": NotifyBlock,
        "sms": NotifyBlock,
        "alert": NotifyBlock,
        "save": StoreFileBlock,
        "upload": StoreFileBlock,
        "read": OCRBlock,
        "format": TextCleanerBlock,
        "validate": RouterBlock,
        "delay_prediction": DelayPredictorBlock,
        "risk": DelayPredictorBlock
    }

    def __init__(
        self, 
        workflow_data: Dict[str, Any], 
        on_node_status: Optional[Callable[[str, str, Optional[Any], Optional[str]], Awaitable[None]]] = None,
        is_sandbox: bool = False,
        completed_node_ids: Optional[List[str]] = None,
        initial_node_outputs: Optional[Dict[str, Any]] = None
    ):
        print(f"[PATHFINDER] Engine Init: {len(workflow_data['nodes'])} nodes, {len(workflow_data['edges'])} edges")
        self.nodes = workflow_data["nodes"]
        self.edges = workflow_data["edges"]
        self.on_node_status = on_node_status
        self.is_sandbox = is_sandbox
        self.completed_node_ids = set(completed_node_ids or [])
        
        self.node_map = {node["id"]: node for node in self.nodes}
        self.adj = {node["id"]: [] for node in self.nodes}
        self.in_degree = {node["id"]: 0 for node in self.nodes}
        
        for edge in self.edges:
            source, target = edge["source"], edge["target"]
            if source in self.adj:
                self.adj[source].append(target)
            if target in self.in_degree:
                self.in_degree[target] += 1
            print(f"[PATHFINDER] Adjacency: {source} -> {target}")
            
        print(f"[PATHFINDER] In-Degrees: {json.dumps(self.in_degree, indent=2)}")
        self.node_outputs = initial_node_outputs or {}
        self.node_statuses = {node["id"]: "pending" for node in self.nodes}
        
        for nid in self.completed_node_ids:
            if nid in self.node_statuses:
                self.node_statuses[nid] = "completed"

        self.failed_nodes = set()
        self.skipped_nodes = set()
        self.waiting_nodes = set()

        # CRITICAL RESUMPTION FIX:
        # Pre-reduce in_degree for all already-completed nodes.
        # Without this, their downstream neighbors never reach in_degree=0
        # and are never added to the execution queue, causing the engine to stall.
        for nid in self.completed_node_ids:
            for neighbor in self.adj.get(nid, []):
                if neighbor in self.in_degree:
                    self.in_degree[neighbor] -= 1
                    print(f"[ENGINE_RESUME] Pre-reduced in_degree for {neighbor} (parent {nid} already completed). New degree: {self.in_degree[neighbor]}")

    async def emit_status(self, node_id: str, status: str, output: Any = None, error: str = None):
        print(f"[ENGINE_EVENT] Node {node_id} -> {status}")
        if self.on_node_status:
            try:
                if asyncio.iscoroutinefunction(self.on_node_status):
                    await self.on_node_status(node_id, status, output, error)
                else:
                    self.on_node_status(node_id, status, output, error)
            except Exception as e:
                print(f"[PATHFINDER] Status Callback Error: {str(e)}")

    async def process_node(self, node_id: str):
        if node_id in self.completed_node_ids:
            print(f"[ENGINE_NODE] Node {node_id}: SKIP (Already completed)")
            return

        parents = [e["source"] for e in self.edges if e["target"] == node_id]
        if any(self.node_statuses.get(p) in ["failed", "skipped"] for p in parents):
            print(f"[PATHFINDER] Propagation: Skipping {node_id} due to upstream failure")
            self.node_statuses[node_id] = "skipped"
            self.skipped_nodes.add(node_id)
            await self.emit_status(node_id, "skipped")
            return

        node_data = self.node_map.get(node_id)
        if not node_data:
            print(f"[PATHFINDER] ERROR: Node {node_id} data missing from map")
            return

        node_type = node_data["type"]
        block_class = self.BLOCK_IMPLEMENTATIONS.get(node_type)
        print(f"[PATHFINDER] Run: Node={node_id}, Type={node_type}")
        
        self.node_statuses[node_id] = "running"
        await self.emit_status(node_id, "running")
        
        if not block_class:
            print(f"[PATHFINDER] WARNING: No mapped class for {node_type}. Falling back to GenericFallbackBlock.")
            block_class = GenericFallbackBlock
            if "config" not in node_data or not isinstance(node_data["config"], dict):
                node_data["config"] = {}
            node_data["config"]["_fallback_type"] = node_type

        try:
            block = block_class(node_data.get("config", {}), is_sandbox=self.is_sandbox)
            output = await block.run(self.node_outputs)
            
            if isinstance(output, dict) and output.get("status") == "waiting_for_human":
                print(f"[PATHFINDER] PAUSE: Node {node_id} requires human approval")
                self.node_statuses[node_id] = "awaiting_review"
                self.waiting_nodes.add(node_id)
                # Corrected: use node_data.get('config') instead of self.config
                instruction = node_data.get("config", {}).get("instruction", "Please review this document")
                await self.emit_status(node_id, "awaiting_review", output={"status": "waiting_for_human", "message": instruction})
            else:
                print(f"[PATHFINDER] DONE: Node {node_id} finished")
                self.node_statuses[node_id] = "completed"
                self.node_outputs[node_id] = output
                await self.emit_status(node_id, "completed", output=output)
        except Exception as e:
            print(f"[PATHFINDER] FAIL: Node {node_id} error: {str(e)}")
            self.node_statuses[node_id] = "failed"
            self.failed_nodes.add(node_id)
            await self.emit_status(node_id, "failed", error=str(e))

    async def execute(self, initial_input: Any = None):
        print(f"\n{'='*60}")
        print(f"[ENGINE] Execution starting. Total nodes={len(self.nodes)}, edges={len(self.edges)}")
        print(f"[ENGINE] Already completed nodes: {list(self.completed_node_ids)}")
        print(f"[ENGINE] Current in_degrees: { {k: v for k,v in self.in_degree.items()} }")
        
        # Initialize node_outputs with initial_input, preserving existing outputs from resumption
        self.node_outputs["initial_input"] = initial_input
        queue = [node_id for node_id, degree in self.in_degree.items() if degree == 0]
        print(f"[ENGINE] Initial queue (degree=0 nodes): {queue}")
        
        wave_idx = 0
        while queue:
            wave_idx += 1
            print(f"\n[ENGINE_WAVE] === WAVE {wave_idx} === Processing: {queue}")
            tasks = [self.process_node(node_id) for node_id in queue]
            await asyncio.gather(*tasks)
            
            if self.waiting_nodes:
                print(f"[ENGINE_WAVE] Wave {wave_idx}: PAUSED — waiting for human approval on: {list(self.waiting_nodes)}")
                break

            next_queue = []
            for node_id in queue:
                outputs = self.node_outputs.get(node_id)
                decision = True
                if isinstance(outputs, dict) and "decision" in outputs:
                    decision = outputs["decision"]

                neighbors = self.adj.get(node_id, [])
                print(f"[ENGINE_PROPAGATE] Node {node_id} -> neighbors: {neighbors} (decision={decision})")

                for neighbor in neighbors:
                    edge = next((e for e in self.edges if e["source"] == node_id and e["target"] == neighbor), None)
                    should_follow = True
                    if edge and edge.get("edge_type") in ["condition_true", "condition_false"]:
                        if edge["edge_type"] == "condition_true" and not decision:
                            should_follow = False
                        if edge["edge_type"] == "condition_false" and decision:
                            should_follow = False

                    if not should_follow:
                        if self.node_statuses.get(neighbor) == "pending":
                            print(f"[ENGINE_PROPAGATE] Skipping {neighbor} (condition not met)")
                            self.node_statuses[neighbor] = "skipped"
                            self.skipped_nodes.add(neighbor)
                            await self.emit_status(neighbor, "skipped")

                    self.in_degree[neighbor] -= 1
                    print(f"[ENGINE_PROPAGATE] {neighbor}: in_degree reduced to {self.in_degree[neighbor]}")
                    if self.in_degree[neighbor] == 0:
                        if neighbor not in self.completed_node_ids and neighbor not in self.skipped_nodes:
                            print(f"[ENGINE_PROPAGATE] {neighbor}: Ready! Adding to next wave.")
                            next_queue.append(neighbor)

            print(f"[ENGINE_WAVE] Wave {wave_idx} complete. Next wave queue: {next_queue}")
            queue = next_queue

        final_status = "awaiting_review" if self.waiting_nodes else ("failed" if self.failed_nodes else "completed")
        print(f"\n[ENGINE] === EXECUTION COMPLETE === Status: {final_status}")
        print(f"[ENGINE] Completed: {list(self.completed_node_ids)} | Failed: {list(self.failed_nodes)} | Skipped: {list(self.skipped_nodes)}")
        print(f"{'='*60}\n")
        return {
            "outputs": self.node_outputs,
            "status": final_status
        }