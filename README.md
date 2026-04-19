# ⚡ WorkLine AI — SEYON Operations Portal

**WorkLine AI** is a production-ready, graph-based AI automation platform. It has been purpose-built into the **SEYON Operations Portal** — a vertical SaaS solution that automates SEYON's two-phase document and job management process using real AI processing on a live execution engine.

---

## 🎯 What It Does (SEYON Context)

WorkLine AI is "overfitted" to solve SEYON's specific problem:

| Phase | What the AI automates |
|---|---|
| **Phase 1 — Document Intake** | Collects incoming reference documents → OCR extraction → Drawing classification → PO data extraction → Duplicate detection → Document indexing |
| **Phase 2 — Job Dispatch** | Analyses job scope → Evaluates team leader workload & skills → Recommends best-fit team leader → Admin confirms assignment |

---

## 🖥️ The SEYON Operations Portal (`/seyon`)

The primary interface for end users. Four purpose-built tabs:

| Tab | Purpose |
|---|---|
| **📊 Dashboard** | KPI monitoring — docs processed, success rate, avg time, pending reviews. Live run history table and team workload. |
| **📥 Intake** | Drag & drop a document → triggers the SEYON-Automation DAG → watch each AI node tick off live. |
| **🗂️ Vault** | Windows File Explorer–style view of every run's AI outputs — OCR text, drawing type, PO data, duplicate check. |
| **🧑‍💼 Dispatch** | AI-ranked team leader recommendations with reasoning and workload bars. Admin clicks "Confirm Assignment" to approve. |

**⚡ Ghost Toggle** — A pill button on every tab reveals the underlying React Flow canvas as a full-screen overlay, showing the real AI node graph running live. Demonstrates the "nervous system" behind the clean UI.

---

## 🚀 Core Platform Features

### 1. 🎨 Intelligent Workflow Canvas (Developer Mode)
- **Visual Editor:** React Flow drag-and-drop DAG builder
- **Custom Nodes:** OCR, Drawing Classifier, PO Extractor, Duplicate Detector, Team Leader Recommender, Human Review, and more
- **Auto-Layout + Undo/Redo:** Full graph management tooling

### 2. 🤖 AI Architect (Agentic Chatbot)
- **Natural Language to DAG:** Describe a goal → AI designs the full pipeline
- **Real LLM:** Groq `llama-3.3-70b-versatile` with JSON mode + DAG validation
- **Contextual conversation:** Persistent multi-turn chat tied to each workflow

### 3. 📦 Domain-Specific Block Library
- **Mechanical Pack:** `drawing_classifier`, `po_extractor`, `duplicate_detector`, `team_leader_recommender`
- **Generic Pack:** `ocr`, `classify`, `store`, `human_review`, `notify`, `router`, and more
- **21 block types** across 9 categories

### 4. ⚙️ Robust Execution Engine
- **Topological DAG execution** with wave-based parallel processing
- **Full resumption support** — workflows pause at human review and resume on approval
- **Celery + Redis** for async background tasks, with sync fallback for dev

---

## 🛠️ Technology Stack

| Component         | Technology                                                                |
| ----------------- | ------------------------------------------------------------------------- |
| **Frontend**      | Next.js 14, React Flow, Zustand, Tailwind CSS, Lucide                     |
| **Backend**       | FastAPI (Python 3.11+), SQLAlchemy, Pydantic                              |
| **Database**      | SQLite (default / dev) · PostgreSQL (production-ready)                    |
| **Worker Engine** | Celery, Redis                                                             |
| **AI — Planning** | Groq `llama-3.3-70b-versatile` (JSON mode, multi-turn conversation)       |
| **AI — Blocks**   | OCR, Drawing Classifier, PO Extractor, Duplicate Detector, TL Recommender |

---

## 🏁 Getting Started

### 1. Backend

```powershell
cd apps/api

# Install dependencies (use venv)
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Set your Groq API key in apps/api/.env
# GROQ_API_KEY=gsk_...

# Run migrations
alembic upgrade head

# Seed demo users & orgs
python app/seed.py

# Seed the SEYON workflow (run once — prints the workflow ID)
python app/seyon_seed.py

# Start the API server
uvicorn app.main:app --reload
```
> API: `http://localhost:8000` · Swagger docs: `http://localhost:8000/docs`

### 2. Frontend

```powershell
cd apps/web
npm install
npm run dev
```
> App: `http://localhost:3000`  
> SEYON Portal: `http://localhost:3000/seyon`

### 3. On-Premises Mode (Zero External AI Calls)

```powershell
# Requires Docker Desktop with 16 GB RAM
docker compose -f infra/docker/docker-compose.onprem.yml up -d
```
Full guide: [`docs/runbooks/onprem-setup.md`](./docs/runbooks/onprem-setup.md)

### 4. Celery Beat (for Scheduled Triggers)

```powershell
cd apps/api
celery -A app.core.celery_app.celery_app beat --loglevel=info
```

---

## 🧪 Try It — SEYON Demo Flow

1. Log in → click **SEYON Portal** in the sidebar
2. Go to **Intake** tab → drag a PDF file into the drop zone
3. Click **🚀 Run AI Processing** → watch the 9-node pipeline run live
4. Switch to **Vault** → select the run → see OCR text, drawing type, PO data
5. Switch to **Dispatch** → review the AI's team leader recommendation → click **Confirm Assignment**
6. Toggle **⚡ Show Canvas** on any tab to see the React Flow nervous system

**Or use the Automate tab (developer mode)** and type a natural language goal:
- *"Classify PDFs and store them by job number"*
- *"Analyze mechanical drawings, find duplicates, and recommend a team lead"*
- *"Extract data from invoices, send to supervisor if confidence is low"*

---

## 📁 Project Structure

```text
Workline-AI/
├── apps/
│   ├── web/                    # Next.js 14 Frontend
│   │   ├── app/seyon/          # SEYON Operations Portal (4-tab vertical skin)
│   │   ├── app/automate/       # React Flow canvas (developer mode)
│   │   ├── lib/seyon-config.ts # SEYON workflow ID + node ID constants
│   │   └── lib/api.ts          # Typed API client (incl. SEYON helpers)
│   └── api/                    # FastAPI Backend
│       └── app/
│           ├── seyon_seed.py   # One-time SEYON DAG seeder
│           ├── core/tasks.py   # Workflow engine runner (with resumption)
│           └── routers/        # All API endpoints
├── packages/
│   ├── workflow_engine/        # Topological DAG executor
│   └── block_library/          # AI block implementations
│       ├── generic/            # OCR, classify, store, notify…
│       └── mechanical/         # drawing_classifier, po_extractor, duplicate_detector, team_leader_recommender
└── infra/                      # Docker & deployment configs
```

---

## ✅ Build Status (v0.5.0 — SEYON Pivot)

- [x] Multi-tenant DB (Organisations, Users, Workflows, RBAC)
- [x] Alembic migration system
- [x] Real LLM graph generation — Groq `llama-3.3-70b-versatile` (J1)
- [x] Conversation history — Persistent multi-turn chat (J1)
- [x] Canvas UI — Undo/Redo, diff highlights, auto-layout (J2)
- [x] Chatbot Panel UI — Reasoning accordion, file attach (J3)
- [x] Workflow Save/Deploy/Rollback UI (J4)
- [x] Scheduled Triggers — Cron via Celery beat (J8)
- [x] On-Premises air-gapped mode — Ollama + BGE (J9)
- [x] Domain Pack system — install/uninstall per org (M9)
- [x] CI/CD + Performance benchmarks (M10)
- [x] UI Polish + Accessibility (M11)
- [x] **SEYON Operations Portal** — Dashboard · Intake · Vault · Dispatch · Ghost Toggle
- [x] **SEYON-Automation DAG** — 9-node pipeline seeded (ID=2) and live
- [x] **Workflow Engine Resumption** — human_review pause/resume fully wired
- [ ] MinIO real file storage (simulated via JSON payload for demo)

---

## 🔑 Login Credentials

### Organization 1
| Email | Password | Role |
|---|---|---|
| `malarrajamani24@gmail.com` | `1234` | Admin |
| `memberj@example.com` | `admin123` | Admin |

### Organization 2
| Email | Password | Role |
|---|---|---|
| `admin@workline.ai` | `admin123` | Admin |
| `viewer@workline.ai` | `viewer123` | Viewer (read-only) |
