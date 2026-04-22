import asyncio
import os
import sys
from dotenv import load_dotenv

# Add project root to path
ROOT_DIR = r"d:\Users\Lenova\Documents\Projects\Mini Project\Workline-AI-"
sys.path.append(ROOT_DIR)
sys.path.append(os.path.join(ROOT_DIR, "apps", "api"))

# Load environment
load_dotenv(os.path.join(ROOT_DIR, "apps", "api", ".env"))

from packages.block_library.src.generic.blocks import OCRBlock
from packages.block_library.src.mechanical.blocks import POExtractorBlock

async def debug_engine_flow():
    print("--- SIMULATING ENGINE FLOW ---")
    
    # Simulate Engine node_outputs state
    node_outputs = {
        "initial_input": {"trigger": {"filename": "test_document.png", "file_type": "png"}}
    }
    
    # 1. Run OCR (simulating engine behavior)
    ocr = OCRBlock({}, is_sandbox=False)
    # The engine passes the entire node_outputs dict to each block
    node_outputs["s_ocr"] = await ocr.run(node_outputs)
    print(f"\n[ENGINE AFTER OCR] node_outputs['s_ocr']:\n{node_outputs['s_ocr']}")
    
    # 2. Run PO Extractor
    extractor = POExtractorBlock({}, is_sandbox=False)
    po_result = await extractor.run(node_outputs)
    
    print(f"\n[ENGINE AFTER EXTRACTOR] po_result:\n{po_result}")

if __name__ == "__main__":
    asyncio.run(debug_engine_flow())
