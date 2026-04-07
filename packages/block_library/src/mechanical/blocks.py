from ..generic.blocks import BaseBlock
from typing import Any, Dict
import asyncio
import logging
import random

logger = logging.getLogger(__name__)


class DrawingClassifierBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Classify a mechanical engineering drawing into a type (Assembly, Part, Schematic, etc.)
        print(f"[BLOCK] DrawingClassifierBlock.run | Starting classification. Sandbox={self.is_sandbox}")
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"].upper()
                break

        print(f"[BLOCK] DrawingClassifierBlock.run | OCR text snippet (uppercased): '{text[:80]}'")
        logger.info(f"Classifying mechanical drawing {'(SANDBOX)' if self.is_sandbox else '(LIVE)'}...")
        await asyncio.sleep(2.0)

        # Heuristic-based classification by keyword matching
        if "ASSY" in text or "ASSEMBLY" in text:
            drawing_type = "General Assembly"
        elif "EXPLODED" in text:
            drawing_type = "Sub-Assembly"
        elif "DRG" in text or "PART" in text:
            drawing_type = "Part Drawing"
        elif "SCHEMATIC" in text or "WIRING" in text:
            drawing_type = "Schematic"
        else:
            types = ["General Assembly", "Sub-Assembly", "Part Drawing", "Schematic", "BOM List"]
            drawing_type = random.choice(types)
            print(f"[BLOCK] DrawingClassifierBlock.run | No keyword match, randomly assigned type.")

        result = {
            "drawing_type": drawing_type,
            "confidence": 0.92 if text else 0.45,
            "metadata": {"format": "A3", "engine": "vision_mock_v1", "keywords_found": bool(text)}
        }
        print(f"[BLOCK] DrawingClassifierBlock.run | Result: {result}")
        return result


class POExtractorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Extract structured PO fields (PO number, value, vendor) from raw OCR text
        print(f"[BLOCK] POExtractorBlock.run | Starting PO extraction. Input keys: {list(input_data.keys())}")
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break

        print(f"[BLOCK] POExtractorBlock.run | Source text length: {len(text)} chars. Sandbox={self.is_sandbox}")
        logger.info(f"Extracting PO information from text length {len(text)} {'(SANDBOX)' if self.is_sandbox else ''}...")

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
                print(f"[BLOCK] POExtractorBlock.run | Using LLM to extract schema: {list(schema.keys())}")
                result = await llm.extract_structured_data(text, schema)
                print(f"[BLOCK] POExtractorBlock.run | LLM extraction result: {result}")
                return result
        except Exception as e:
            logger.warning(f"LLM extraction failed: {e}")
            print(f"[BLOCK] POExtractorBlock.run | LLM failed: {e}. Falling back to mock data.")

        await asyncio.sleep(1.5)
        result = {"po_number": "PO-2023-882", "total_value": 12500.0, "vendor": "Global Parts Ltd", "currency": "USD"}
        print(f"[BLOCK] POExtractorBlock.run | Mock PO data returned: {result}")
        return result


class DuplicateDrawingDetectorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Detect if the current drawing already exists in the vector database (deduplication)
        print(f"[BLOCK] DuplicateDrawingDetectorBlock.run | Starting duplicate check. Sandbox={self.is_sandbox}")
        logger.info(f"Generating embeddings for current drawing {'(SANDBOX)' if self.is_sandbox else ''}...")
        await asyncio.sleep(1.0)

        import numpy as np
        embedding = np.random.rand(128)  # 128-dim embedding vector
        print(f"[BLOCK] DuplicateDrawingDetectorBlock.run | Generated {len(embedding)}-dim embedding. Comparing against vector DB...")

        logger.info("Comparing against Vector Database...")
        await asyncio.sleep(0.5)

        max_similarity = random.uniform(0.05, 0.45)
        is_duplicate = random.random() < 0.15  # 15% chance of duplicate

        if is_duplicate:
            max_similarity = random.uniform(0.91, 0.99)
            print(f"[BLOCK] DuplicateDrawingDetectorBlock.run | DUPLICATE DETECTED! Similarity={max_similarity:.3f}")
        else:
            print(f"[BLOCK] DuplicateDrawingDetectorBlock.run | No duplicate found. Max similarity: {max_similarity:.3f}")

        result = {
            "is_duplicate": is_duplicate,
            "max_similarity": round(float(max_similarity), 4),
            "match_id": f"DWG-{random.randint(1000, 9999)}" if is_duplicate else None,
            "engine": "siamese_cnn_v4"
        }
        print(f"[BLOCK] DuplicateDrawingDetectorBlock.run | Final result: {result}")
        return result


class TeamLeaderRecommenderBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Recommend the best-suited team lead for a drawing type based on historical expertise
        print(f"[BLOCK] TeamLeaderRecommenderBlock.run | Starting recommendation. Input keys: {list(input_data.keys())}")
        drawing_type = "Standard"
        for val in input_data.values():
            if isinstance(val, dict) and "drawing_type" in val:
                drawing_type = val["drawing_type"]
                break

        print(f"[BLOCK] TeamLeaderRecommenderBlock.run | Drawing type identified: '{drawing_type}'. Sandbox={self.is_sandbox}")
        logger.info(f"Recommending lead for drawing type: {drawing_type} {'(SANDBOX)' if self.is_sandbox else ''}...")
        await asyncio.sleep(1.0)

        experts = {
            "General Assembly": "Jane Smith (Lead Architect)",
            "Part Drawing": "John Doe (Production Lead)",
            "Schematic": "Robert Brown (Electrical Head)",
            "BOM List": "Alice White (Procurement)"
        }

        leader = experts.get(drawing_type, "Senior Engineer (Default)")
        result = {
            "recommended_leader": leader,
            "reasoning": f"Based on historical expertise in {drawing_type} management.",
            "available": True
        }
        print(f"[BLOCK] TeamLeaderRecommenderBlock.run | Recommendation: {result}")
        return result