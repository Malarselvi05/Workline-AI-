import json
import base64
import io
import sys
import os
from PIL import Image
import pytesseract

if sys.platform == "win32":
    tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path

try:
    with open("apps/api/scratch/po_extractor_debug.json", "r") as f:
        data = json.load(f)
    
    b64 = data["initial_input"]["initial_input"]["file_content_base64"]
    file_bytes = base64.b64decode(b64)
    img = Image.open(io.BytesIO(file_bytes))
    
    text = pytesseract.image_to_string(img)
    print("=== EXTRACTED TEXT ===")
    print(text)
    print("=== END ===")
except Exception as e:
    import traceback
    print("ERROR:")
    traceback.print_exc()
