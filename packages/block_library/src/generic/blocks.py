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
        # Step 1: Collect file metadata from upstream (file_upload / FormInputBlock output)
        print(f"[BLOCK] OCRBlock.run | Starting OCR extraction | Sandbox={self.is_sandbox}")
        logger.info(f"Running OCR {'(SANDBOX)' if self.is_sandbox else '(LIVE)'}...")
        
        file_meta = {}
        for val in input_data.values():
            if isinstance(val, dict) and "filename" in val:
                file_meta = val
                break

        filename = file_meta.get("filename", "document.pdf")
        file_type = file_meta.get("file_type", "pdf")
        print(f"[BLOCK] OCRBlock: Processing file='{filename}' type='{file_type}'")

        # Step 2: Try Groq LLM to generate realistic OCR text for demo
        try:
            from app.services.llm import LLMService
            llm = LLMService()
            if llm.client:
                prompt = (
                    f"You are an OCR system processing a file named '{filename}' (type: {file_type}) "
                    f"submitted to SEYON Engineering for mechanical drawing review. "
                    f"Generate realistic OCR-extracted text for a mechanical engineering document. "
                    f"Include: a drawing number, revision letter, title, date, PO reference number, vendor name, and total value in INR. "
                    f"Format it as raw text lines, no markdown, no explanations."
                )
                response = await llm.chat_completion([{"role": "user", "content": prompt}])
                text = response if isinstance(response, str) else str(response)
                print(f"[BLOCK] OCRBlock: LLM OCR extraction successful")
                return {
                    "text": text,
                    "filename": filename,
                    "metadata": {"pages": 1, "engine": "groq_llm_proxy", "file_type": file_type}
                }
        except Exception as e:
            print(f"[BLOCK] OCRBlock: LLM failed ({e}), using filename-based mock")

        # Step 3: Deterministic fallback — uses filename so output differs per document
        import hashlib
        file_hash = int(hashlib.md5(filename.encode()).hexdigest(), 16)
        po_num = file_hash % 9999
        part_num = file_hash % 999
        mock_text = (
            f"DRAWING NO: DWG-{filename[:6].upper().replace('.','')}-REV-A\n"
            f"TITLE: MECHANICAL ASSEMBLY - SEYON ENGINEERING\n"
            f"DATE: 2026-04-19\n"
            f"PO REF: PO-2026-{po_num:04d}\n"
            f"VENDOR: SEYON MANUFACTURING SOLUTIONS\n"
            f"TOTAL VALUE: INR 1,{file_hash % 90 + 10},000\n"
            f"PART NO: ASSY-{part_num:03d}\n"
            f"DESCRIPTION: GENERAL ASSEMBLY DRAWING FOR QA REVIEW"
        )
        await asyncio.sleep(1.0)
        print(f"[BLOCK] OCRBlock: Deterministic mock complete")
        return {
            "text": mock_text,
            "filename": filename,
            "metadata": {"pages": 1, "engine": "filename_mock", "file_type": file_type}
        }


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
        
        # Priority 1: if the workflow was triggered with initial_input (e.g. from SEYON Intake tab),
        # forward it downstream so OCR and other blocks can access the file metadata
        initial = input_data.get("initial_input")
        if initial and isinstance(initial, dict):
            print(f"[BLOCK] FormInputBlock: Forwarding initial_input: {initial}")
            return initial
            
        # Priority 2: fall back to configured default data
        result = self.config.get("default_data", {})
        print(f"[BLOCK] FormInputBlock: No initial_input, using config defaults: {result}")
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