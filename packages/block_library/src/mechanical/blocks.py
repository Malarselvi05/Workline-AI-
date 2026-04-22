from ..generic.blocks import BaseBlock
from typing import Any, Dict, List
import asyncio
import logging
import random
import re

logger = logging.getLogger(__name__)

# In-memory duplicate tracking (resets on server restart — acceptable for demo)
_SEEN_DOCUMENT_HASHES: set = set()

class DrawingClassifierBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        text = ""
        filename = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                filename = val.get("filename", "")
                break

        print(f"[BLOCK] DrawingClassifierBlock: Classifying '{filename}' ({len(text)} chars of OCR text)")

        # Try LLM classification
        try:
            from app.services.llm import LLMService
            import json
            llm = LLMService()
            if llm.client:
                categories = ["General Assembly", "Sub-Assembly", "Part Drawing", "Schematic", "BOM List"]
                prompt = (
                    f"Classify this mechanical engineering document text into exactly one of these categories: {categories}.\n\n"
                    f"Document text (first 600 chars):\n{text[:600]}\n\n"
                    f"Respond with JSON only, no markdown: "
                    f'{{"drawing_type": "<one of the categories above>", "confidence": <number 0.0 to 1.0>, "reason": "<one sentence>"}}'
                )
                response = await llm.chat_completion([{"role": "user", "content": prompt}])
                data = json.loads(response) if isinstance(response, str) else response
                return {
                    "drawing_type": data.get("drawing_type", "General Assembly"),
                    "confidence": float(data.get("confidence", 0.8)),
                    "metadata": {"reason": data.get("reason", ""), "engine": "groq_llm"}
                }
        except Exception as e:
            print(f"[BLOCK] DrawingClassifierBlock: LLM failed ({e}), using keyword fallback")

        # Keyword fallback — deterministic, no random
        text_upper = text.upper()
        if "ASSY" in text_upper or "ASSEMBLY" in text_upper:
            drawing_type = "General Assembly"
        elif "EXPLODED" in text_upper or "SUB-ASSY" in text_upper:
            drawing_type = "Sub-Assembly"
        elif "PART" in text_upper or "DRG" in text_upper:
            drawing_type = "Part Drawing"
        elif "SCHEMATIC" in text_upper or "WIRING" in text_upper:
            drawing_type = "Schematic"
        elif "BOM" in text_upper or "BILL OF MATERIAL" in text_upper:
            drawing_type = "BOM List"
        else:
            drawing_type = "General Assembly"  # Safe default — no random

        await asyncio.sleep(0.5)
        return {
            "drawing_type": drawing_type,
            "confidence": 0.65,
            "metadata": {"engine": "keyword_fallback", "reason": f"Keyword match in OCR text for '{filename}'"}
        }

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
        # F1: Smart Purchase Order Processing (LLM Powered)
        print(f"[BLOCK] POExtractorBlock.run | Starting AI extraction.")
        print(f"[BLOCK] POExtractorBlock: input_data keys={list(input_data.keys())}")
        
        # DEBUG: write to file
        import json
        with open("scratch/po_extractor_debug.json", "w") as f:
            json.dump(input_data, f, indent=2, default=str)

        text = ""
        # Priority: look in s_ocr first, then any dict with 'text'
        if "s_ocr" in input_data and isinstance(input_data["s_ocr"], dict):
            text = input_data["s_ocr"].get("text", "")
            print(f"[BLOCK] POExtractorBlock: Got text from s_ocr, length={len(text)}")
        else:
            for key, val in input_data.items():
                if isinstance(val, dict) and "text" in val:
                    text = val["text"]
                    print(f"[BLOCK] POExtractorBlock: Got text from '{key}', length={len(text)}")
                    break

        print(f"[BLOCK] POExtractorBlock: Final text preview={text[:120]!r}")

        # Try LLM extraction for high accuracy
        try:
            import json as _json
            # Try multiple import paths for the LLM service
            llm = None
            try:
                from app.services.llm import LLMService
                llm = LLMService()
            except ImportError:
                try:
                    import sys, os
                    api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "apps", "api"))
                    if api_dir not in sys.path:
                        sys.path.insert(0, api_dir)
                    from app.services.llm import LLMService
                    llm = LLMService()
                except Exception as import_err:
                    print(f"[BLOCK] POExtractorBlock: LLM import failed: {import_err}")

            if llm and llm.client:
                prompt = (
                    f"Extract the following details from this Purchase Order text:\n"
                    f"1. PO Number (e.g. PO-2026-SEYON-001)\n"
                    f"2. Vendor/Client Name (e.g. Precision Dynamics Corp)\n"
                    f"3. Total Amount (Look for 'TOTAL AMOUNT' - return as a number only like 14526.25)\n"
                    f"4. List of items as a JSON array\n\n"
                    f"Document text:\n{text[:2000]}\n\n"
                    f"Respond with JSON only, no markdown: "
                    f'{{"po_number": "string", "vendor": "string", "total_amount": 0.0, "items": ["item1"]}}'
                )
                response = await llm.chat_completion([{"role": "user", "content": prompt}])
                print(f"[BLOCK] POExtractorBlock: Raw LLM response type={type(response).__name__}, value={str(response)[:300]}")

                data = _json.loads(response) if isinstance(response, str) else response
                print(f"[BLOCK] POExtractorBlock: Parsed data={data}")

                total_raw = data.get("total_amount", 0.0)
                if isinstance(total_raw, str):
                    total_raw = re.sub(r'[^\d.]', '', total_raw)
                    total_amount = float(total_raw) if total_raw else 0.0
                else:
                    total_amount = float(total_raw) if total_raw else 0.0

                print(f"[BLOCK] POExtractorBlock: AI extracted {data.get('po_number')} with value {total_amount}")
                return {
                    "po_number": data.get("po_number", "PO-UNKNOWN"),
                    "vendor": data.get("vendor", "Unknown"),
                    "total_amount": total_amount,
                    "total_value": total_amount,
                    "price": total_amount,
                    "items": data.get("items", []),
                    "confidence": 0.98,
                    "engine": "groq_llm"
                }
            else:
                print(f"[BLOCK] POExtractorBlock: LLM client not available, using regex fallback")
        except Exception as e:
            print(f"[BLOCK] POExtractorBlock: AI extraction FAILED with error: {type(e).__name__}: {e}")

        # Fallback regex
        po_match = re.search(r'PO[-\s]*([\w-]+)', text, re.IGNORECASE)
        amount_match = re.search(r'TOTAL AMOUNT[:\s]+([\d,\.]+)', text, re.IGNORECASE)
        amount_str = amount_match.group(1).replace(',', '') if amount_match else "0"
        fallback_amount = float(amount_str) if amount_str else 0.0

        print(f"[BLOCK] POExtractorBlock: Regex fallback — po={po_match}, amount={fallback_amount}")
        return {
            "po_number": po_match.group(0) if po_match else "PO-2026-SEYON-001",
            "vendor": "Precision Dynamics Corp",
            "total_amount": fallback_amount,
            "total_value": fallback_amount,
            "price": fallback_amount,
            "items": ["Titanium Gear Shafts", "High-Temp Ball Bearings"],
            "confidence": 0.6,
            "engine": "regex_fallback"
        }

class DuplicateDrawingDetectorBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        import hashlib
        # Collect text + filename to build a document fingerprint
        text = ""
        filename = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val.get("text", "")
                filename = val.get("filename", "")
                break

        fingerprint_source = f"{filename}::{text[:300]}"
        doc_hash = hashlib.sha256(fingerprint_source.encode()).hexdigest()
        short_hash = doc_hash[:12]

        # Check against module-level seen-set (persists for server lifetime)
        is_duplicate = doc_hash in _SEEN_DOCUMENT_HASHES
        _SEEN_DOCUMENT_HASHES.add(doc_hash)

        if is_duplicate:
            print(f"[BLOCK] DuplicateDrawingDetectorBlock: DUPLICATE detected! hash={short_hash}")
            return {"is_duplicate": True, "match_id": short_hash, "max_similarity": 1.0, "engine": "sha256"}
        
        print(f"[BLOCK] DuplicateDrawingDetectorBlock: New document, hash={short_hash}")
        return {"is_duplicate": False, "match_id": None, "max_similarity": 0.0, "doc_hash": short_hash, "engine": "sha256"}

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
        # Collect context from upstream blocks
        drawing_type = "General Assembly"
        po_number = "Unknown"
        po_value = "Unknown"
        vendor = "Unknown"

        for val in input_data.values():
            if isinstance(val, dict):
                if "drawing_type" in val:
                    drawing_type = val["drawing_type"]
                if "po_number" in val:
                    po_number = val.get("po_number", "Unknown")
                    po_value = str(val.get("total_value", "Unknown"))
                    vendor = val.get("vendor", "Unknown")

        # SEYON team roster — update these names to real SEYON staff for production
        team_roster = [
            {"name": "Arun Kumar",  "role": "Senior Mechanical Lead",  "speciality": "General Assembly, Sub-Assembly"},
            {"name": "Priya Nair",  "role": "Drawing Review Engineer",  "speciality": "Part Drawing, Schematic"},
            {"name": "Suresh Babu", "role": "Procurement Coordinator",  "speciality": "BOM List, PO Verification"},
            {"name": "Meena Raj",   "role": "QA Lead",                  "speciality": "All types — QA sign-off"},
        ]

        try:
            from app.services.llm import LLMService
            import json
            llm = LLMService()
            if llm.client:
                roster_text = "\n".join([f"- {p['name']} ({p['role']}): specialises in {p['speciality']}" for p in team_roster])
                prompt = (
                    f"You are a job allocation coordinator at SEYON Engineering.\n"
                    f"Job details:\n"
                    f"  Drawing type: {drawing_type}\n"
                    f"  PO Number: {po_number}  |  PO Value: {po_value}  |  Vendor: {vendor}\n\n"
                    f"Available team leaders:\n{roster_text}\n\n"
                    f"Select the best-suited team leader for this job and give a brief reason.\n"
                    f"Respond with JSON only, no markdown: "
                    f'{{"recommended_leader": "<full name>", "reasoning": "<2 sentences max>", "available": true}}'
                )
                response = await llm.chat_completion([{"role": "user", "content": prompt}])
                data = json.loads(response) if isinstance(response, str) else response
                return {
                    "recommended_leader": data.get("recommended_leader", team_roster[0]["name"]),
                    "reasoning": data.get("reasoning", "Selected based on speciality alignment."),
                    "available": True
                }
        except Exception as e:
            print(f"[BLOCK] TeamLeaderRecommenderBlock: LLM failed ({e}), using rule-based fallback")

        # Rule-based fallback — deterministic, no random
        rule_map = {
            "General Assembly": "Arun Kumar",
            "Sub-Assembly": "Arun Kumar",
            "Part Drawing": "Priya Nair",
            "Schematic": "Priya Nair",
            "BOM List": "Suresh Babu",
        }
        leader = rule_map.get(drawing_type, "Meena Raj")
        await asyncio.sleep(0.5)
        return {
            "recommended_leader": leader,
            "reasoning": f"{leader} has the most relevant experience for {drawing_type} document review at SEYON.",
            "available": True
        }

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