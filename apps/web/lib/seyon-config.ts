/**
 * apps/web/lib/seyon-config.ts
 * SEYON portal constants — update SEYON_WORKFLOW_ID after running:
 *   python apps/api/app/seyon_seed.py
 */

// ── Update this after running seyon_seed.py ──────────────────────────────────
export const SEYON_WORKFLOW_ID = 2;

// Node IDs that match seyon_seed.py
export const SEYON_NODE_IDS = {
  file_upload:   's_file_upload',
  ocr:           's_ocr',
  drawing_cls:   's_drawing_cls',
  po_extract:    's_po_extract',
  dup_detect:    's_dup_detect',
  classify:      's_classify',
  recommender:   's_recommender',
  human_review:  's_human_review',
  notify:        's_notify',
} as const;

// Phase labels for Vault display
export const SEYON_PHASE1_NODES = [
  's_file_upload', 's_ocr', 's_drawing_cls', 's_po_extract', 's_dup_detect', 's_classify'
];
export const SEYON_PHASE2_NODES = [
  's_recommender', 's_human_review', 's_notify'
];

export const NODE_LABELS: Record<string, string> = {
  s_file_upload:  '📄 Document Intake',
  s_ocr:          '🔍 OCR Extraction',
  s_drawing_cls:  '📐 Drawing Classifier',
  s_po_extract:   '📦 PO Extractor',
  s_dup_detect:   '🔎 Duplicate Detector',
  s_classify:     '🏷️ Document Classifier',
  s_recommender:  '🧑‍💼 Team Leader Recommender',
  s_human_review: '✅ Admin Approval',
  s_notify:       '🔔 Notify Team',
};
