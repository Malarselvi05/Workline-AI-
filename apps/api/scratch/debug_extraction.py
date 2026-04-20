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

async def test_extraction():
    print("--- TESTING SEYON EXTRACTION ---")
    
    # 1. Test OCR
    ocr = OCRBlock({}, is_sandbox=True)
    ocr_result = await ocr.run({"trigger": {"filename": "test_document.png", "file_type": "png"}})
    print(f"\n[OCR TEXT]:\n{ocr_result['text']}")
    
    # 2. Test PO Extraction
    extractor = POExtractorBlock({}, is_sandbox=True)
    # We pass the OCR text into the extractor
    po_result = await extractor.run({"ocr": ocr_result})
    
    print(f"\n[EXTRACTED DATA]:")
    print(f"PO Number: {po_result.get('po_number')}")
    print(f"Vendor:    {po_result.get('vendor')}")
    print(f"Total:     {po_result.get('total_amount')}")
    print(f"Items:     {po_result.get('items')}")
    print(f"Engine:    {po_result.get('engine')}")

if __name__ == "__main__":
    asyncio.run(test_extraction())
