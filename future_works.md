# WorkLine AI: Future Works Plan

This document maps the current state of WorkLine AI against the 13 required core and advanced features, and outlines the roadmap for the next development phase.

## 🗺️ Feature Mapping & Status

| ID | Feature | Status | Technology (Requested) | Current Impl. |
| :--- | :--- | :--- | :--- | :--- |
| ID | Feature | Status | Tab (SEYON Portal) | Real AI Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **F1** | Smart PO Processing | 🟢 Done | **Intake** | Regex + spaCy NER (Mechanical Block) |
| **F2** | Doc Classification | 🟢 Done | **Intake** | RandomForest (MLService) |
| **F3** | Engineer Allocation | 🟢 Done | **Dispatch** | Cosine Similarity (MLService) |
| **F4** | Task Allocation | 🟢 Done | **Dispatch** | Rule-based templates (Block Library) |
| **F5** | Delay Prediction | 🟢 Done | **Dashboard** | RandomForest Risk Model |
| **F6** | Workflow Execution | 🟢 Ready | **Ghost Mode** | WebSocket + Real-time Canvas |
| **F7** | AI Generator | 🟢 Done | **Ghost Mode** | Registry-Aware Planner + Chat |
| **F8** | XAI Dashboard | 🟢 Done | **Dashboard** | Recharts XAI Chart Component |
| **F9** | Auto Organizer | 🟢 Done | **Vault** | Structured S3 Pattern (StoreBlock) |
| **F10** | Smart Alerts | 🟡 Partial | **Dashboard** | Backend Ready, UI Toast Next |
| **F11** | Simulation Mode | 🟢 Done | **Dashboard** | "Run Simulation" SEYON Scenarios |
| **F12** | Timeline View | 🟢 Done | **Dashboard** | Timeline Component (Run Logs) |
| **F13** | Feedback Learning | 🔴 Missing | **Dispatch** | Human-in-the-loop override |
| **F14** | Bending Simulation | 🟡 In Progress | **Bending** | Physics-based bending estimation |
| **F15** | Production Queue | 🟡 In Progress | **Bending** | Real-time machine status tracking |

---

## 🚀 Phase 4 Roadmap: The "Real ML" Milestone

### Phase 4.1: Foundation & Dependencies
- [ ] Update `requirements.txt` with `scikit-learn`, `spacy`, `pytesseract`, `pdf2image`, `pandas`, `numpy`.
- [ ] Initialize spaCy `en_core_web_sm` model.
- [ ] Setup synthetic data generator for Simulation Mode (F11).

### Phase 4.2: Real Block Implementation
- [ ] **PO Extractor**: Replace LLM logic with Regex + spaCy NER. Integrate `pytesseract` for raw OCR text extraction.
- [ ] **Doc Classifier**: Implement TF-IDF vectorizer + RandomForest classifier. Train on a synthetic corpus of "drawing", "spec", "calculation", "MSDS".
- [ ] **Allocation Engine**: Implement `cosine_similarity` for engineer recommendations based on task vectors.
- [ ] **Delay Predictor**: New service/block using a pre-trained (on synthetic data) RandomForest model.

### Phase 4.3: Advanced UI & Simulation
- [x] **Explainable AI Dashboard**: Add a component to visualize `feature_importances_` for delay risk.
- [x] **Bending Dashboard**: Implement real-time telemetry visualization for shop floor machines.
- [ ] **Machine Telemetry**: Connect Bending tab to `workspaceStore` for real-time progress updates.
- [x] **Simulation Manager**: Add "Run Demo" button that seeds the DB with synthetic files/runs.
- [ ] **Timeline View**: Build the `Timeline` component to display `RunNodeState` logs.
- [ ] **Smart Alerts**: Integrate toast notifications/sidebar badges triggered by the Delay Prediction output.

### Phase 4.4: Hardening & Feedback
- [ ] **Planner Upgrade**: Add pre-validation logic to `planner.py` to check block compatibility.
- [ ] **Feedback Loop**: Add a "Correct AI" button in the recommendation panel to store human overrides (F13).

---

## 🛠️ Updated Tech Stack (ML Expansion)

- **OCR**: `pytesseract` + `pdf2image` + `poppler-utils`.
- **NLP**: `spaCy` (NER/Entity extraction).
- **ML**: `scikit-learn` (RandomForest, TF-IDF, Cosine Similarity).
- **Data**: `pandas` & `numpy` for feature engineering.
- **Viz**: `matplotlib`/`seaborn` for XAI charts (backend-to-image).
