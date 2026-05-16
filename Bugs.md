# Fix OCR Extraction, Recommendation Scoring & Cross-Tab Data Flow

## Root Cause Analysis

After tracing every file in the pipeline (Intake → OCR → PO Extractor → Dispatch → Vault → Bending), I've identified the **exact root causes** of all three issues:

---

### 🔴 Bug 1: OCR shows "extracted: None" and value = 0

**Root Cause: The actual file is NEVER uploaded to the backend.** The Intake page only sends the filename metadata — not the file content.

```
Frontend (intake/page.tsx L71-77):
  body: JSON.stringify({
      initial_input: {
          filename: file.name,        ← only the name
          file_type: file.name.split('.').pop(),
          uploaded_at: new Date().toISOString()
      }
  })
```

The OCR block (`generic/blocks.py` L33-150) then:
1. Checks if filename matches `test_document.png` or `test_document_2.png` → returns hardcoded mock text
2. For ANY other filename → asks the **LLM to fabricate fake OCR text** from the filename alone
3. Falls back to a hash-based deterministic mock

**The system has no real OCR at all** — no Tesseract, no Cloud Vision, no image processing library. It never sees the actual file bytes.

Since your purchase order filename doesn't match the hardcoded test filenames, the LLM generates generic engineering text (not your actual PO content), so the PO Extractor regex `TOTAL AMOUNT[\s]+[\d,.]+` finds nothing → returns `0.0`.

---

### 🔴 Bug 2: Dispatch shows score "42" for both employees

**Root Cause: The scoring formula has a hard floor of 0.42 (42%).**

```typescript
// dispatch/page.tsx L41
return Math.min(0.99, Math.max(0.10, 0.42 + skillScore * 0.45 - workloadPenalty + aiBoost));
//                                    ^^^^
//                                    BASE = 42% always
```

When a document type comes through as `"General"` or `"Purchase Order"` (from the fake classification), the skill matching logic splits it into words and checks if any employee skill contains those words:

- Your intern's skills: e.g. `["poster design"]` — word "poster" doesn't match "general" or "purchase" or "order"
- Your Design Leader's skills: e.g. `["poster design"]` — same, no match

**Result:** `skillScore = 0` for both → both get `0.42 + 0 - 0 + 0 = 0.42` → displayed as **42%**.

The scoring also checks the document `type` field (from classification), NOT the actual extracted items like "Brochure Design", "Web Design", "Ad Design" — those are never used for matching.

---

### 🔴 Bug 3: Data doesn't flow across tabs

**Root Cause: Each tab reads different parts of `run.logs.results`, but the keys don't align properly.**

| Tab | Reads From | Current Problem |
|-----|-----------|-----------------|
| **Intake** | `s_po_extract.total_amount`, `s_classify.category` | Shows "None" because fake OCR → bad extraction |
| **Dispatch** | `s_classify.type` for scoring, `s_po_extract.total_amount` for value | Uses generic classification type, not extracted items |
| **Vault** | `s_ocr.filename`, `s_classify.type` | Only filename & generic type — no PO details |
| **Bending** | Hardcoded `MOCK_JOBS` array | Completely static — reads NO live data at all |

The extracted line items (`items: ["Brochure Design", "Web Design", "Ad Design"]`) are stored in `s_po_extract.items` but **never used by Dispatch or Vault**.

---

## How OCR Currently Works (Answering Your Question)

> [!IMPORTANT]
> **The current system does NOT use any real OCR library.** There is no Tesseract, no pytesseract, no Google Cloud Vision. The "OCR" is 100% fake — it either returns hardcoded text or asks the LLM to generate plausible text based on the filename.

| Step | What Happens | Library Used |
|------|-------------|--------------|
| File Upload | Only filename sent — file bytes discarded | None |
| OCR Block | Returns mock text or LLM-generated text | Groq LLM (fabricates text) |
| PO Extraction | Tries Groq LLM on fake text, falls back to regex | Groq LLM / Python regex |
| Classification | TF-IDF + RandomForest on fake text | scikit-learn |
| Recommendation | Hardcoded team roster OR Groq LLM | Groq LLM / rule-based |

---

## Proposed Changes

### Phase 1: Enable Real File Upload + OCR

#### [MODIFY] [page.tsx](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/web/app/intake/page.tsx)
- Read the uploaded file as **base64** using `FileReader.readAsDataURL()`
- Include the base64 content in the `initial_input` payload sent to the backend
- This makes the actual file bytes available to the OCR block

#### [MODIFY] [blocks.py](file:///d:/MiniProject/Workline_AI/Workline-AI-/packages/block_library/src/generic/blocks.py) — OCRBlock
- Add **real OCR** using `pytesseract` + `Pillow` (for images) and `PyPDF2`/`pdfplumber` (for PDFs)
- Decode the base64 file content received from the frontend
- Fall back to the LLM-based extraction if pytesseract is not installed
- Keep the existing mock paths as a final fallback

#### [MODIFY] [requirements.txt](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/api/requirements.txt)
- Add `pytesseract`, `Pillow`, and `pdfplumber` as dependencies

---

### Phase 2: Fix PO Extraction to Use Real Text

#### [MODIFY] [blocks.py](file:///d:/MiniProject/Workline_AI/Workline-AI-/packages/block_library/src/mechanical/blocks.py) — POExtractorBlock
- Improve the LLM prompt to handle design service purchase orders (not just mechanical parts)
- Improve the regex fallback to also match `TOTAL:` (not just `TOTAL AMOUNT:`)
- Parse individual line items with prices from the text
- Return structured items with prices: `[{name: "Brochure Design", qty: 1, rate: 50, amount: 10}]`

---

### Phase 3: Fix Recommendation Scoring

#### [MODIFY] [page.tsx](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/web/app/dispatch/page.tsx)
- Fix `scoreLeader()` to match against **extracted item descriptions** (not just document type)
- Also match against the employee **role** field (e.g. "Design Leader" matches "design" items)
- Lower the base score from 0.42 to 0.15 so there's meaningful differentiation
- Weight: `0.15 (base) + 0.55 (skill match) + 0.20 (role match) - workload penalty + AI boost`
- Pass extracted items from `s_po_extract.items` into the scoring context

---

### Phase 4: Flow Data Across All Tabs

#### [MODIFY] [page.tsx](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/web/app/dispatch/page.tsx)
- Include `items` from `s_po_extract` in `SelectedJob` so scoring can use them
- Display extracted items in the job card

#### [MODIFY] [page.tsx](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/web/app/vault/page.tsx)
- Show PO value and item count from `s_po_extract` in file cards
- Use extracted PO number as file identifier when available

#### [MODIFY] [page.tsx](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/web/app/bending/page.tsx)
- Replace `MOCK_JOBS` with live data from workflow runs
- Map PO number, items, and assigned leader from run results into the job list

---

## Open Questions

> [!IMPORTANT]
> **Tesseract Installation**: Real OCR requires Tesseract OCR installed on your system. Do you have Tesseract installed? If not, we can:
> - **Option A**: Install Tesseract (best accuracy for images)
> - **Option B**: Use Groq's vision model (llama-3.2-90b-vision) to extract text from the base64 image directly — no Tesseract needed but requires Groq API
> - **Option C**: Use `pdfplumber` for PDFs only (pure Python, no system dependencies) + LLM for images

> [!WARNING]  
> **File size limits**: Base64 encoding increases file size by ~33%. For a 10MB file, that's ~13MB in the JSON payload. Should we cap at a certain size, or switch to multipart form upload for large files?

> [!IMPORTANT]
> **Bending page**: Currently 100% static mock data. Should I make it fully live (reading from workflow runs), or is that a lower priority and we should focus on Intake → Dispatch → Vault first?

---

## Verification Plan

### Automated Tests
1. Upload the sample purchase order image → verify OCR extracts "Brochure Design", "Web Design", "Ad Design"
2. Verify PO Extractor returns `total_amount: 44.00` and 3 line items
3. Verify Dispatch scoring differentiates between intern (low score) and Design Leader (high score)
4. Verify Vault shows the PO details and correct document type

### Manual Verification
1. Upload the sample PO image in Intake → confirm extraction results
2. Navigate to Dispatch → click "Recommend Employee" → confirm Design Leader scores higher
3. Navigate to Vault → confirm file appears with correct PO details
