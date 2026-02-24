import asyncio
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class Node(BaseModel):
    id: str
    type: str
    config: Dict[str, Any]

class Edge(BaseModel):
    id: str
    source: str
    target: str

class Workflow(BaseModel):
    id: str
    nodes: List[Node]
    edges: List[Edge]

from block_library.src.generic.blocks import OCRBlock, ClassifyBlock, StoreFileBlock
from block_library.src.mechanical.blocks import (
    DrawingClassifierBlock, 
    POExtractorBlock, 
    DuplicateDrawingDetectorBlock, 
    TeamLeaderRecommenderBlock
)

class WorkflowEngine:
    BLOCK_REGISTRY = {
        "ocr": OCRBlock,
        "classify": ClassifyBlock,
        "store": StoreFileBlock,
        "drawing_classifier": DrawingClassifierBlock,
        "po_extractor": POExtractorBlock,
        "duplicate_detector": DuplicateDrawingDetectorBlock,
        "team_leader_recommender": TeamLeaderRecommenderBlock
    }

    def __init__(self, workflow_data: Dict[str, Any]):
        self.nodes = workflow_data["nodes"]
        self.edges = workflow_data["edges"]
        self.node_map = {node["id"]: node for node in self.nodes}
        self.adj = {node["id"]: [] for node in self.nodes}
        self.in_degree = {node["id"]: 0 for node in self.nodes}
        
        for edge in self.edges:
            self.adj[edge["source"]].append(edge["target"])
            self.in_degree[edge["target"]] += 1
            
    async def execute(self, initial_input: Any = None):
        queue = [node_id for node_id, degree in self.in_degree.items() if degree == 0]
        results = {"initial_input": initial_input}
        node_outputs = {}
        
        while queue:
            current_id = queue.pop(0)
            node_data = self.node_map[current_id]
            node_type = node_data["type"]
            
            block_class = self.BLOCK_REGISTRY.get(node_type)
            if block_class:
                block = block_class(node_data.get("config", {}))
                # Pass the results of parent nodes as input
                # For simplicity, we pass all results so far
                output = await block.run(node_outputs)
                node_outputs[current_id] = output
                print(f"Executed {node_type} (node {current_id}): {output}")
            else:
                print(f"No block implementation for type: {node_type}")
                node_outputs[current_id] = {"status": "skipped"}
            
            for neighbor in self.adj[current_id]:
                self.in_degree[neighbor] -= 1
                if self.in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        return node_outputs
