from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseBlock(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @abstractmethod
    async def run(self, input_data: Any) -> Any:
        pass

class OCRBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Mock OCR logic
        print("Running OCR...")
        return {"text": "Extracted text from document"}

class ClassifyBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Mock Classification
        print(f"Classifying text: {input_data.get('text', 'No text found')}")
        return {"category": "Invoice", "confidence": 0.95}

class StoreFileBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        # Mock Storage
        print(f"Storing file in category: {input_data.get('category', 'unknown')}")
        return {"status": "stored", "path": "/storage/invoices/doc_1.pdf"}
