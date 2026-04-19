from ..generic.blocks import BaseBlock
from typing import Any, Dict, List
import asyncio
import logging
import random
import re

logger = logging.getLogger(__name__)

class DrawingClassifierBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # F2: Auto Document Classification (ML-based)
        print(f"[BLOCK] DrawingClassifierBlock.run | Starting classification. Sandbox={self.is_sandbox}")
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break

        try:
            from app.services.ml_service import MLService
            ml = MLService()
            result = await ml.classify_document(text)
            # Map general types to drawing-specific types if needed
            if result["type"] == "drawing":
                result["drawing_type"] = "Engineering Drawing"
            else:
                result["drawing_type"] = f"Other ({result['type']})"
            return result
        except Exception as e:
            logger.warning(f"ML classification failed: {e}")

        await asyncio.sleep(1.0)
        return {"drawing_type": "Assembly", "confidence": 0.6, "method": "Mock"}

class StoreFileBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # F9: Auto Document Organizer
        print(f"[BLOCK] StoreFileBlock.run | Starting auto-organized storage.")
        category = "general"
        for val in input_data.values():
            if isinstance(val, dict) and "type" in val:
                category = val["type"]
                break
        
        # Determine structured path based on category (F9)
        # Patterns: drawings/, specifications/, calculations/, msds/
        base_folders = {
            "drawing": "drawings",
            "specification": "specifications",
            "calculation": "calculations",
            "msds": "safety_docs"
        }
        folder = base_folders.get(category, "misc")
        path = f"s3://workline-storage/{folder}/doc_{random.randint(100, 999)}.pdf"

        print(f"[BLOCK] StoreFileBlock.run | Organized category '{category}' into folder '{folder}/'")
        
        await asyncio.sleep(0.8)
        return {"status": "stored", "organized_path": path, "category": category}

class POExtractorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # F1: Smart Purchase Order Processing (OCR + NLP/Regex)
        print(f"[BLOCK] POExtractorBlock.run | Starting extraction. Input keys: {list(input_data.keys())}")
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break

        logger.info(f"Extracting PO fields using NLP/Regex...")
        
        # Regex-based extraction (F1 requirement)
        po_match = re.search(r"PO-?(\d+)", text, re.IGNORECASE)
        client_match = re.search(r"Client:\s*([^\n]+)", text, re.IGNORECASE)
        deadline_match = re.search(r"Deadline:\s*([\d-]+)", text, re.IGNORECASE)
        
        # spaCy integration (if available)
        try:
            import spacy
            # Assuming 'en_core_web_sm' is installed as per future_works Phase 4.1
            nlp = spacy.load("en_core_web_sm")
            doc = nlp(text)
            entities = [(ent.text, ent.label_) for ent in doc.ents]
            print(f"[BLOCK] POExtractorBlock.run | spaCy entities found: {entities}")
        except Exception as e:
            logger.warning(f"spaCy NER failed: {e}")

        result = {
            "job_id": f"PO-{po_match.group(1)}" if po_match else "PO-UNKNOWN",
            "client": client_match.group(1).strip() if client_match else "Unknown Client",
            "deadline": deadline_match.group(1) if deadline_match else "2026-12-31",
            "items": ["servo motor", "actuator"], # Mocked items for F1 demo
            "confidence": 0.95 if po_match else 0.4
        }
        
        print(f"[BLOCK] POExtractorBlock.run | Extracted: {result}")
        return result

class DuplicateDrawingDetectorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Detect if current drawing already exists (deduplication)
        print(f"[BLOCK] DuplicateDrawingDetectorBlock.run | Starting duplicate check.")
        await asyncio.sleep(0.8)
        
        # Simulation: 10% chance of duplicate
        is_duplicate = random.random() < 0.1
        similarity = random.uniform(0.95, 0.99) if is_duplicate else random.uniform(0.1, 0.4)
        
        return {
            "is_duplicate": is_duplicate,
            "max_similarity": float(f"{similarity:.3f}"),
            "match_id": f"DWG-{random.randint(1000, 9999)}" if is_duplicate else None
        }

class TaskAllocationBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # F4: Automatic Task Allocation (Rule-based)
        print(f"[BLOCK] TaskAllocationBlock.run | Generating tasks from templates.")
        
        doc_type = "general"
        for val in input_data.values():
            if isinstance(val, dict) and "type" in val:
                doc_type = val["type"]
                break
                
        # Rule-based templates (F4)
        templates = {
            "drawing": ["Initial Review", "Assembly Verification", "Tolerance Check", "BOM Approval"],
            "specification": ["Compliance Verification", "Material Quality Check"],
            "calculation": ["Validation Run", "Second Opinion Review"],
            "msds": ["Safety Protocol Update", "Hazard Labeling"]
        }
        
        tasks = templates.get(doc_type, ["General Document Processing"])
        
        return {
            "allocated_tasks": tasks,
            "count": len(tasks),
            "priority": "MEDIUM" if len(tasks) < 3 else "HIGH"
        }

class TeamLeaderRecommenderBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # F3: Intelligent Engineer Allocation (Recommendation Engine)
        print(f"[BLOCK] TeamLeaderRecommenderBlock.run | Recommending best lead.")
        
        mock_engineers = [
            {"name": "Engineer A", "skills": "CAD Design Mechanical Assembly", "workload_percentage": 85},
            {"name": "Engineer B", "skills": "FEA Stress Analysis Simulation", "workload_percentage": 20},
            {"name": "Engineer C", "skills": "BOM Management Procurement", "workload_percentage": 45}
        ]
        
        task_desc = "Mechanical Assembly and CAD Design for new actuator unit"
        
        try:
            from app.services.ml_service import MLService
            ml = MLService()
            result = await ml.recommend_engineer(task_desc, mock_engineers)
            print(f"[BLOCK] TeamLeaderRecommenderBlock.run | ML recommendation: {result}")
            return result
        except Exception as e:
            logger.error(f"Recommendation failed: {e}")
            
        return {"engineer": "Engineer B", "score": 0.91, "reason": "High skill match (Mock)"}

class DelayPredictorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # F5: Delay Prediction System
        print(f"[BLOCK] DelayPredictorBlock.run | Predicting project risks.")
        
        # Aggregate data from previous nodes
        project_stats = {
            "workload": random.uniform(0.3, 0.9),
            "overtime": random.uniform(0.1, 0.6),
            "scope_changes": random.uniform(0.0, 0.4),
            "experience": random.uniform(0.5, 1.0)
        }
        
        try:
            from app.services.ml_service import MLService
            ml = MLService()
            result = await ml.predict_delay_risk(project_stats)
            print(f"[BLOCK] DelayPredictorBlock.run | Risk output: {result}")
            return result
        except Exception as e:
            logger.error(f"Risk prediction failed: {e}")
            
        return {"delay_risk": 0.3, "status": "LOW", "reason": "Fallback"}