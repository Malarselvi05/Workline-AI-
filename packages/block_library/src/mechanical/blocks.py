from ..generic.blocks import BaseBlock
from typing import Any, Dict
import asyncio
import logging
import random

logger = logging.getLogger(__name__)

class DrawingClassifierBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        logger.info(f"Classifying mechanical drawing {'(SANDBOX)' if self.is_sandbox else ''}...")
        await asyncio.sleep(2.0)
        
        # Real logic would use a ResNet or Vision Transformer
        types = ["General Assembly", "Sub-Assembly", "Part Drawing", "Schematic", "BOM List"]
        drawing_type = random.choice(types)
        
        return {
            "drawing_type": drawing_type, 
            "confidence": 0.92,
            "metadata": {"format": "A3", "engine": "vision_mock_v1"}
        }

class POExtractorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        text = ""
        # Look for text from OCR node
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break
        
        logger.info(f"Extracting PO information from text length {len(text)} {'(SANDBOX)' if self.is_sandbox else ''}...")
        
        # Try to use LLMService for extraction
        try:
            from app.services.llm import LLMService
            llm = LLMService()
            if llm.client:
                schema = {
                    "po_number": "string",
                    "total_value": "number",
                    "vendor": "string",
                    "currency": "string"
                }
                result = await llm.extract_structured_data(text, schema)
                return result
        except Exception as e:
            logger.warning(f"LLM extraction failed: {e}")

        await asyncio.sleep(1.5)
        return {"po_number": "PO-2023-882", "total_value": 12500.0, "vendor": "Global Parts Ltd", "currency": "USD"}

class DuplicateDrawingDetectorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        logger.info(f"Searching for duplicate drawings using embedding similarity {'(SANDBOX)' if self.is_sandbox else ''}...")
        await asyncio.sleep(1.2)
        
        # In real implementation, this would query a Vector DB like Chroma or Pinecone
        similarity = random.uniform(0.05, 0.4)
        is_duplicate = similarity > 0.85
        
        return {
            "is_duplicate": is_duplicate, 
            "max_similarity": round(similarity, 4),
            "match_id": "DWG-9921" if is_duplicate else None
        }

class TeamLeaderRecommenderBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        drawing_type = "Standard"
        for val in input_data.values():
            if isinstance(val, dict) and "drawing_type" in val:
                drawing_type = val["drawing_type"]
                break
                
        logger.info(f"Recommending lead for drawing type: {drawing_type} {'(SANDBOX)' if self.is_sandbox else ''}...")
        await asyncio.sleep(1.0)
        
        # Mocking an XGBoost recommendation
        experts = {
            "General Assembly": "Jane Smith (Lead Architect)",
            "Part Drawing": "John Doe (Production Lead)",
            "Schematic": "Robert Brown (Electrical Head)",
            "BOM List": "Alice White (Procurement)"
        }
        
        leader = experts.get(drawing_type, "Senior Engineer")
        return {
            "recommended_leader": leader,
            "reasoning": f"Based on historical expertise in {drawing_type} management.",
            "available": True
        }
