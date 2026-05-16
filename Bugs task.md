# Fix OCR, Scoring & Cross-Tab Data Flow

## Phase 1: Real File Upload + OCR
- [/] Modify Intake page to send file as base64
- [ ] Modify OCRBlock for real OCR (pytesseract + pdfplumber)
- [ ] Update requirements.txt

## Phase 2: Fix PO Extraction
- [ ] Improve POExtractorBlock regex + LLM prompt

## Phase 3: Fix Recommendation Scoring
- [ ] Fix scoreLeader() in Dispatch page

## Phase 4: Cross-Tab Data Flow
- [ ] Dispatch page — use extracted items for scoring
- [ ] Vault page — show PO details in file cards
