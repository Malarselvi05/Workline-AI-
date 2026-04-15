# WorkLine AI: Future Works Plan

This document maps the current state of WorkLine AI against the 13 required core and advanced features, and outlines the roadmap for the next development phase.

## 🗺️ Feature Mapping & Status

| ID | Feature | Status | Technology (Requested) | Current Impl. |
| :--- | :--- | :--- | :--- | :--- |
| **F1** | Smart PO Processing | 🟡 Partial | pytesseract, spaCy | LLM-based (Groq) |
| **F2** | Doc Classification | 🟡 Partial | Tfidf, RandomForest | LLM-based (Groq) |
| **F3** | Engineer Allocation | 🟡 Partial | Cosine Similarity | Mock (Random) |
| **F4** | Task Allocation | 🟡 Partial | Rule-based templates | Mock (Random) |
| **F5** | Delay Prediction | 🔴 Missing | RandomForest/Logistic | None |
| **F6** | Workflow Execution | 🟢 Ready | UI: running/comp, output | Statuses partially UI-linked |
| **F7** | AI Generator | 🟢 Ready | Restrict blocks, Validate | Groq (Planner.py) |
| **F8** | XAI Dashboard | 🔴 Missing | feature_importances_ | None |
| **F9** | Auto Organizer | 🔴 Missing | move files based on class | None |
| **F10** | Smart Alerts | 🔴 Missing | trigger from delay | None |
| **F11** | Simulation Mode | 🔴 Missing | Synthetic data + Demo btn | None |
| **F12** | Timeline View | 🟡 Partial | DB logs display | Schema exists, UI needs work |
| **F13** | Feedback Learning | 🔴 Missing | AI vs Human mapping | None |

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
- [ ] **Explainable AI Dashboard**: Add a component to visualize `feature_importances_` for delay risk.
- [ ] **Simulation Manager**: Add "Run Demo" button that seeds the DB with synthetic files/runs.
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
