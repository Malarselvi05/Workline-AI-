from ..generic.blocks import BaseBlock
from typing import Any, Dict

class DrawingClassifierBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Mock logic for mechanical drawing classification (e.g., Assembly vs Part)
        print("Classifying mechanical drawing...")
        return {"drawing_type": "Assembly", "components_count": 12}

class POExtractorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Mock logic to extract Purchase Order info from a drawing note or separate doc
        print("Extracting PO information...")
        return {"po_number": "PO-2026-001", "total_value": 50000.0, "vendor": "SteelCorp"}

class DuplicateDrawingDetectorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Mock logic using embeddings to find similar drawings
        print("Searching for duplicate drawings...")
        return {"duplicate_found": False, "similarity_score": 0.12}

class TeamLeaderRecommenderBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Mock logic to recommend a lead based on project type
        print(f"Recommending lead for drawing type: {input_data.get('drawing_type', 'standard')}")
        return {"recommended_leader": "Jane Doe", "department": "Design & Engineering"}
