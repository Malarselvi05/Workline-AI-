from ..generic.blocks import BaseBlock
from typing import Any, Dict
import asyncio
import logging
import random

logger = logging.getLogger(__name__)

class DrawingClassifierBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L10: Logic flowing")
        # Detect if we have text from OCR
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"].upper()
                break
        
        logger.info(f"Classifying mechanical drawing {'(SANDBOX)' if self.is_sandbox else ''}...")
        await asyncio.sleep(2.0)
        
        # Heuristic-based classification (simulating a vision-to-text-to-label flow)
        if "ASSY" in text or "ASSEMBLY" in text:
            drawing_type = "General Assembly"
        elif "EXPLODED" in text:
            drawing_type = "Sub-Assembly"
        elif "DRG" in text or "PART" in text:
            drawing_type = "Part Drawing"
        elif "SCHEMATIC" in text or "WIRING" in text:
            drawing_type = "Schematic"
        else:
            # Fallback to random if no keywords
            types = ["General Assembly", "Sub-Assembly", "Part Drawing", "Schematic", "BOM List"]
            drawing_type = random.choice(types)
        
        return {
            "drawing_type": drawing_type, 
            "confidence": 0.92 if text else 0.45,
            "metadata": {"format": "A3", "engine": "vision_mock_v1", "keywords_found": bool(text)}
        }

class POExtractorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L42: Keep it up")
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
        print(f"[PY] blocks.py | run | L72: System checking in")
        logger.info(f"Generating embeddings for current drawing {'(SANDBOX)' if self.is_sandbox else ''}...")
        await asyncio.sleep(1.0)
        
        # In real implementation, this would use a Siamese Network or CLIP model
        # We'll simulate a vector comparison
        import numpy as np
        embedding = np.random.rand(128) # 128-dim embedding
        
        # Similarity with a mock "registry" of historical drawings
        logger.info("Comparing against Vector Database...")
        await asyncio.sleep(0.5)
        
        max_similarity = random.uniform(0.05, 0.45) # Usually no duplicate
        
        # Chance to find a duplicate for demo purposes
        is_duplicate = random.random() < 0.15 # 15% chance
        if is_duplicate:
            max_similarity = random.uniform(0.91, 0.99)
        
        return {
            "is_duplicate": is_duplicate, 
            "max_similarity": round(float(max_similarity), 4),
            "match_id": f"DWG-{random.randint(1000, 9999)}" if is_duplicate else None,
            "engine": "siamese_cnn_v4"
        }

class TeamLeaderRecommenderBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L100: System checking in")
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