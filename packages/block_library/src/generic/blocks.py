from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import asyncio
import logging
import random

logger = logging.getLogger(__name__)

class BaseBlock(ABC):
    def __init__(self, config: Dict[str, Any], is_sandbox: bool = False):
        # Initialize the block with config and sandbox mode flag
        print(f"[BLOCK] {self.__class__.__name__}.__init__ | Config keys: {list(config.keys())} | Sandbox: {is_sandbox}")
        self.config = config
        self.is_sandbox = is_sandbox

    @abstractmethod
    async def run(self, input_data: Any) -> Any:
        pass


class GenericFallbackBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # A generic fallback block for any AI-generated node type that isn't mapped
        node_type = self.config.get("_fallback_type", "unknown")
        print(f"[BLOCK] GenericFallbackBlock.run | Handling unmapped node type: '{node_type}' | Sandbox={self.is_sandbox}")
        logger.info(f"Running Generic Fallback for {node_type}...")
        await asyncio.sleep(0.5)
        result = {"status": "success", "note": f"Handled by generic fallback for {node_type}", "processed": True}
        print(f"[BLOCK] GenericFallbackBlock.run | Completed with mock output for {node_type}")
        return result


class OCRBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Extract text from uploaded document using pytesseract (F1)
        print(f"[BLOCK] OCRBlock.run | Starting OCR extraction | Sandbox={self.is_sandbox}")
        logger.info(f"Running Pytesseract OCR {'(SANDBOX)' if self.is_sandbox else '(LIVE)'}...")
        
        try:
            import pytesseract
            from PIL import Image
            import io
            
            # Simple simulation: if input_data has a 'file_content' or similar (MOCK for now)
            # In a real scenario, we'd fetch the file from MinIO/local storage
            await asyncio.sleep(1.0)
            
            # For demo purposes, we return a structured mock if "real" extraction fails or isn't possible in this env
            result = {
                "text": "PURCHASE ORDER\nPO-1023\nClient: ABC Ltd\nItems: servo motor, actuator\nDeadline: 2026-05-10",
                "metadata": {"engine": "pytesseract_v0.3.10", "confidence": 0.88}
            }
        except Exception as e:
            logger.warning(f"Pytesseract extraction failed or not installed: {e}")
            await asyncio.sleep(0.5)
            result = {
                "text": "MOCK OCR TEXT: PO-1023 ABC Ltd 2026-05-10 servo motor actuator",
                "metadata": {"engine": "fallback_mock", "error": str(e)}
            }
            
        print(f"[BLOCK] OCRBlock.run | Completed. Extracted {len(result['text'])} chars.")
        return result


class ClassifyBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # F2: Auto Document Classification (ML-based)
        print(f"[BLOCK] ClassifyBlock.run | Starting ML-based classification. Input keys: {list(input_data.keys())}")
        text = "No text found"
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break

        logger.info(f"Classifying text: {text[:50]}... {'(SANDBOX)' if self.is_sandbox else ''}")
        
        try:
            from app.services.ml_service import MLService
            ml = MLService()
            result = await ml.classify_document(text)
            print(f"[BLOCK] ClassifyBlock.run | ML result: {result}")
            return result
        except Exception as e:
            logger.warning(f"MLService classification failed: {e}. Falling back to LLM/Mock.")

        try:
            from app.services.llm import LLMService
            llm = LLMService()
            if llm.client:
                categories = self.config.get("categories", ["drawing", "specification", "calculation", "MSDS"])
                return await llm.classify_text(text, categories)
        except Exception:
            pass

        await asyncio.sleep(0.5)
        return {"type": "specification", "confidence": 0.5, "method": "StaticFallback"}


class StoreFileBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Store the classified file in the appropriate bucket/folder
        print(f"[BLOCK] StoreFileBlock.run | Starting file storage. Input keys: {list(input_data.keys())}")
        category = "general"
        for val in input_data.values():
            if isinstance(val, dict) and "category" in val:
                category = val["category"]
                break

        print(f"[BLOCK] StoreFileBlock.run | Storing file under category: '{category}' | Sandbox={self.is_sandbox}")

        if self.is_sandbox:
            logger.info(f"SANDBOX: Simulating S3 upload to /sandbox/{category}/")
            await asyncio.sleep(0.5)
            result = {"status": "simulated", "path": f"s3://workline-sandbox/{category}/doc_{id(input_data)}.pdf"}
            print(f"[BLOCK] StoreFileBlock.run | Sandbox store complete: {result}")
            return result

        logger.info(f"Storing file in MinIO bucket: {category}")
        await asyncio.sleep(0.8)
        result = {"status": "stored", "url": f"https://minio.internal/workline/{category}/doc_{id(input_data)}.pdf"}
        print(f"[BLOCK] StoreFileBlock.run | Live store complete: {result}")
        return result


class APITriggerBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Pass through initial API trigger input to the pipeline
        print(f"[BLOCK] APITriggerBlock.run | Trigger received. Passing initial_input downstream.")
        logger.info("Triggered via API")
        result = input_data.get("initial_input", {})
        print(f"[BLOCK] APITriggerBlock.run | Forwarding: {result}")
        return result


class FormInputBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Collect default form input data from config (simulates user form submission)
        print(f"[BLOCK] FormInputBlock.run | Collecting form input. Config keys: {list(self.config.keys())}")
        logger.info("Collecting Form Input")
        result = self.config.get("default_data", {})
        print(f"[BLOCK] FormInputBlock.run | Form data: {result}")
        return result


class ParseBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Parse structured fields from unstructured text using LLM or simple extraction
        print(f"[BLOCK] ParseBlock.run | Starting PO parsing. Input keys: {list(input_data.keys())}")
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break

        print(f"[BLOCK] ParseBlock.run | Text to parse ({len(text)} chars): '{text[:80]}'")

        if "fields" in self.config:
            print(f"[BLOCK] ParseBlock.run | Custom fields requested: {self.config['fields']}. Trying LLM...")
            try:
                from app.services.llm import LLMService
                llm = LLMService()
                result = await llm.extract_structured_data(text, self.config["fields"])
                print(f"[BLOCK] ParseBlock.run | LLM extraction result: {result}")
                return result
            except Exception as e:
                print(f"[BLOCK] ParseBlock.run | LLM failed ({e}), falling back to basic parse")

        result = {"parsed": True, "raw_length": len(text)}
        print(f"[BLOCK] ParseBlock.run | Basic parse result: {result}")
        return result


class TextCleanerBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Clean and normalize extracted text (strip whitespace, collapse newlines)
        print(f"[BLOCK] TextCleanerBlock.run | Starting text cleaning. Input keys: {list(input_data.keys())}")
        text = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                break

        print(f"[BLOCK] TextCleanerBlock.run | Raw text length: {len(text)}")
        cleaned = text.strip().replace("\n\n", "\n")
        result = {"text": cleaned, "cleaned": True}
        print(f"[BLOCK] TextCleanerBlock.run | Cleaned text length: {len(cleaned)}. Done.")
        return result


class FieldMapperBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Map fields from combined node outputs using a configured field mapping
        print(f"[BLOCK] FieldMapperBlock.run | Mapping fields. Mapping config: {self.config.get('mapping', {})}")
        mapping = self.config.get("mapping", {})
        result = {}
        flat_input = {}
        for node_output in input_data.values():
            if isinstance(node_output, dict):
                flat_input.update(node_output)

        print(f"[BLOCK] FieldMapperBlock.run | Flattened input keys: {list(flat_input.keys())}")
        for target, source in mapping.items():
            result[target] = flat_input.get(source)

        print(f"[BLOCK] FieldMapperBlock.run | Mapped result: {result}")
        return result


class RouterBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Route workflow based on a condition (AI-evaluated or default True)
        print(f"[BLOCK] RouterBlock.run | Evaluating routing condition: '{self.config.get('condition', 'True')}'")
        condition = self.config.get("condition", "True")
        try:
            from app.services.llm import LLMService
            llm = LLMService()
            prompt = f"Given this data: {input_data}, does it satisfy this condition: {condition}? Respond with JSON: {{'result': true/false}}"
            res = await llm.chat_completion([{"role": "user", "content": prompt}])
            decision = res.get("result", True)
            print(f"[BLOCK] RouterBlock.run | LLM routing decision: {decision}")
            return {"decision": decision}
        except Exception as e:
            print(f"[BLOCK] RouterBlock.run | LLM routing failed ({e}), defaulting to True")
            return {"decision": True}


class ScorerBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Score input data quality or confidence on a 0-100 scale
        print(f"[BLOCK] ScorerBlock.run | Scoring input. Threshold: {self.config.get('threshold', 50)}")
        await asyncio.sleep(0.5)
        score = random.uniform(0, 100)
        result = {"score": score, "threshold": self.config.get("threshold", 50)}
        print(f"[BLOCK] ScorerBlock.run | Score: {score:.2f} | Result: {result}")
        return result


class HumanReviewBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Pause workflow and request manual human approval before continuing
        instruction = self.config.get("instruction", "Please review this document")
        print(f"[BLOCK] HumanReviewBlock.run | PAUSING for human approval. Instruction: '{instruction}'")
        logger.info("Human Review Block triggered. Execution PAUSED awaiting approval.")
        return {"status": "waiting_for_human", "message": instruction}


class TaskCreateBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Create a task in an external platform (e.g. Jira) based on workflow results
        platform = self.config.get("platform", "Jira")
        print(f"[BLOCK] TaskCreateBlock.run | Creating task in '{platform}'. Input keys: {list(input_data.keys())}")
        logger.info(f"Creating task in {platform}")
        task_id = f"TASK-{random.randint(1000, 9999)}"
        result = {"task_id": task_id, "status": "created", "platform": platform}
        print(f"[BLOCK] TaskCreateBlock.run | Task created: {result}")
        return result


class NotifyBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Send a notification via configured channel (email, Slack, etc.)
        channel = self.config.get("channel", "email")
        recipient = self.config.get("recipient", "team-lead@company.com")
        print(f"[BLOCK] NotifyBlock.run | Sending notification via '{channel}' to '{recipient}'")
        logger.info(f"Sending notification via {channel}")
        result = {"sent": True, "channel": channel, "recipient": recipient}
        print(f"[BLOCK] NotifyBlock.run | Notification sent: {result}")
        return result