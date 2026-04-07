from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import asyncio
import logging
import random

logger = logging.getLogger(__name__)

class BaseBlock(ABC):
    def __init__(self, config: Dict[str, Any], is_sandbox: bool = False):
        print(f"[PY] blocks.py | __init__ | L10: System checking in")
        print(f"[PY] blocks.py | __init__ | L10: Antigravity active")
        self.config = config
        self.is_sandbox = is_sandbox

    @abstractmethod
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L16: Antigravity active")
        pass

class OCRBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L20: System checking in")
        # Mock OCR logic with delay to simulate processing
        logger.info(f"Running OCR {'(SANDBOX)' if self.is_sandbox else ''}...")
        await asyncio.sleep(1.5)
        
        # In a real app, we'd use PaddleOCR or pytesseract here.
        # Fallback to dummy data for M5 demo
        return {
            "text": "INVOICE #INV-2023-001\nDate: 2023-10-27\nTotal Amount: $1,250.00\nItems: Consulting Services - 10 hours",
            "metadata": {"pages": 1, "engine": "paddleocr_mock"}
        }

class ClassifyBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L33: Logic flowing")
        text = "No text found"
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break
                
        logger.info(f"Classifying text: {text[:50]}... {'(SANDBOX)' if self.is_sandbox else ''}")
        
        # Try to use LLMService
        try:
            from app.services.llm import LLMService
            llm = LLMService()
            if llm.client:
                categories = self.config.get("categories", ["Invoice", "Receipt", "Resume", "Contract"])
                result = await llm.classify_text(text, categories)
                return result
        except ImportError:
            logger.warning("LLMService not available, using mock classification")
        
        await asyncio.sleep(1.0)
        return {"category": "Invoice", "confidence": 0.98, "reasoning": "Mocked AI result"}

class StoreFileBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L57: Antigravity active")
        category = "general"
        for val in input_data.values():
            if isinstance(val, dict) and "category" in val:
                category = val["category"]
                break
                
        # Simulate MinIO / Cloud Storage
        if self.is_sandbox:
            logger.info(f"SANDBOX: Simulating S3 upload to /sandbox/{category}/")
            await asyncio.sleep(0.5)
            return {"status": "simulated", "path": f"s3://workline-sandbox/{category}/doc_{id(input_data)}.pdf"}
            
        logger.info(f"Storing file in MinIO bucket: {category}")
        await asyncio.sleep(0.8)
        return {"status": "stored", "url": f"https://minio.internal/workline/{category}/doc_{id(input_data)}.pdf"}

# --- New Input Blocks ---
class APITriggerBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L76: Code alive")
        logger.info("Triggered via API")
        return input_data.get("initial_input", {})

class FormInputBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L81: Data processing")
        logger.info("Collecting Form Input")
        return self.config.get("default_data", {})

# --- New Extract Blocks ---
class ParseBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L87: System checking in")
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break
        
        # Use LLM to parse specific fields if config provided
        if "fields" in self.config:
            try:
                from app.services.llm import LLMService
                llm = LLMService()
                return await llm.extract_structured_data(text, self.config["fields"])
            except:
                pass
        
        return {"parsed": True, "raw_length": len(text)}

# --- New Transform Blocks ---
class TextCleanerBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L107: Data processing")
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break
        
        # basic cleaning
        cleaned = text.strip().replace("\n\n", "\n")
        return {"text": cleaned, "cleaned": True}

class FieldMapperBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L119: Code alive")
        mapping = self.config.get("mapping", {})
        result = {}
        # Flatten input data to a single dict for mapping
        flat_input = {}
        for node_output in input_data.values():
            if isinstance(node_output, dict):
                flat_input.update(node_output)
        
        for target, source in mapping.items():
            result[target] = flat_input.get(source)
        
        return result

# --- New Decide Blocks ---
class RouterBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L135: Code alive")
        condition = self.config.get("condition", "True")
        # In a real app, we'd use a safe eval or a rule engine
        # For now, we return a decision that the engine will use to filter edges
        # We can also use AI to decide
        try:
            from app.services.llm import LLMService
            llm = LLMService()
            prompt = f"Given this data: {input_data}, does it satisfy this condition: {condition}? Respond with JSON: {{'result': true/false}}"
            res = await llm.chat_completion([{"role": "user", "content": prompt}])
            return {"decision": res.get("result", True)}
        except:
            return {"decision": True}

class ScorerBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L150: Logic flowing")
        await asyncio.sleep(0.5)
        score = random.uniform(0, 100)
        return {"score": score, "threshold": self.config.get("threshold", 50)}

# --- New Human Blocks ---
class HumanReviewBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L157: Logic flowing")
        logger.info("Human Review Block triggered. Execution should pause.")
        # This is a special status that the engine must handle
        return {"status": "waiting_for_human", "message": self.config.get("instruction", "Please review this document")}

# --- New Act Blocks ---
class TaskCreateBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L164: Antigravity active")
        logger.info(f"Creating task in {self.config.get('platform', 'Jira')}")
        return {"task_id": f"TASK-{random.randint(1000, 9999)}", "status": "created"}

class NotifyBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        print(f"[PY] blocks.py | run | L169: System checking in")
        channel = self.config.get("channel", "email")
        logger.info(f"Sending notification via {channel}")
        return {"sent": True, "channel": channel}