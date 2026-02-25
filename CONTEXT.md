# WorkLine AI — Project Context & Status
> **Purpose**: This file is the single source of truth for team collaboration and AI model context.
> **Rule**: Every time you make significant code changes, update the relevant section of this file.
> **Team Plan**: See [`TEAM_PLAN.md`](./TEAM_PLAN.md) for the full phase-by-phase checklist for Member J (Frontend) and Member M (Backend).
> **Claude Prompt**: `TEAM_PLAN.md` is built from the Claude Prompt v2.0 (full spec). Use that spec as the authoritative product reference.
> **Last Updated**: 2026-02-25

---

## 🎯 Project Goal

**WorkLine AI** is a no-code, graph-based AI workflow automation platform. Non-technical users describe a business process in plain English → an agentic chatbot converts it into an executable DAG (Directed Acyclic Graph) → users can test, deploy, and monitor the automation visually on a canvas.

Think: **n8n + GPT-powered workflow designer**, designed for document intake, classification, task routing, approvals, and monitoring across multiple domains.

---

## 🏗️ Monorepo Structure

```
Workline-AI/
├── apps/
│   ├── api/                    ✅ Backend (FastAPI) — EXISTS & PARTIAL
│   │   ├── app/
│   │   │   ├── main.py         ✅ API routes (CRUD + run + WebSocket)
│   │   │   ├── seed.py         ✅ DB seeder (demo workflows)
│   │   │   ├── core/
│   │   │   │   ├── celery_app.py ✅ Celery + Redis config
│   │   │   │   └── tasks.py    ✅ execute_workflow_task (Celery task)
│   │   │   ├── db/
│   │   │   │   └── session.py  ✅ SQLite engine / PostgreSQL-ready
│   │   │   ├── models/
│   │   │   │   └── models.py   ✅ All DB tables defined
│   │   │   └── services/
│   │   │       └── planner.py  ⚠️ AI planner (keyword MOCK — not real LLM)
│   │   ├── .env                ✅ Env vars (OPENAI_API_KEY, etc.)
│   │   ├── .env.example        ✅ Template for new devs
│   │   ├── Dockerfile          ✅ API Docker image
│   │   ├── requirements.txt    ✅ Python deps
│   │   └── workline.db         ✅ SQLite dev database (seeded)
│   │
│   └── web/                    ✅ Frontend (Next.js 14) — IMPLEMENTED
│       ├── app/
│       │   ├── layout.tsx       ✅ Root layout (sidebar + main)
│       │   ├── page.tsx         ✅ Redirect to /dashboard
│       │   ├── globals.css      ✅ Dark-mode design system
│       │   ├── dashboard/page.tsx ✅ KPI cards + runs table + drift alerts
│       │   ├── automate/page.tsx ✅ Canvas + block palette + chatbot
│       │   ├── workflow/[id]/page.tsx ✅ Detail page (Runs/Results/Logs/Settings)
│       │   └── login/page.tsx   ✅ Login stub (no real auth)
│       ├── components/
│       │   ├── workspace/Sidebar.tsx ✅ Collapsible sidebar + workflow tabs
│       │   ├── canvas/
│       │   │   ├── nodes/WorkflowNode.tsx ✅ Custom React Flow node
│       │   │   ├── BlockPalette.tsx ✅ Searchable block palette (drag-to-drop)
│       │   │   └── Toolbar.tsx  ✅ Validate/Simulate/Save/Deploy toolbar
│       │   └── chatbot/ChatPanel.tsx ✅ AI chat panel with Apply to Canvas
│       ├── stores/
│       │   ├── workspaceStore.ts ✅ Workflow list + sidebar state
│       │   ├── canvasStore.ts   ✅ React Flow state + block registry (20 block types)
│       │   └── chatStore.ts     ✅ Chat messages + planner API
│       └── lib/api.ts           ✅ Typed API service layer
│
├── packages/
│   ├── workflow_engine/        ✅ DAG execution engine
│   │   └── engine.py          ✅ Topological sort + async block execution
│   └── block_library/         ✅ Block stubs (all MOCK — no real AI)
│       └── src/
│           ├── generic/
│           │   └── blocks.py  ⚠️ OCRBlock, ClassifyBlock, StoreFileBlock (mocked)
│           └── mechanical/
│               └── blocks.py  ⚠️ DrawingClassifier, POExtractor, DuplicateDetector, TeamLeaderRecommender (mocked)
│
└── infra/
    └── docker/                ⚠️ Dockerfile for API exists; compose & k8s missing
```

---

## ✅ What Has Been Implemented

### Backend (FastAPI — `apps/api`)

| Feature                                                                                           | File                                   | Status                                  |
| ------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------- |
| FastAPI app bootstrap + CORS                                                                      | `main.py`                              | ✅ Done                                  |
| `POST /workflows/plan` → AI planner                                                               | `main.py` + `planner.py`               | ✅ Route done, ⚠️ planner is keyword mock |
| `POST /workflows` → save to DB                                                                    | `main.py`                              | ✅ Done                                  |
| `GET /workflows` → list all                                                                       | `main.py`                              | ✅ Done                                  |
| `POST /workflows/{id}/run` → execute                                                              | `main.py` + `tasks.py`                 | ✅ Done                                  |
| `GET /workflows/{id}/runs` → run history                                                          | `main.py`                              | ✅ Done                                  |
| `WebSocket /ws/status/{id}` → live status                                                         | `main.py`                              | ⚠️ Stub (echo only)                      |
| Celery task for async workflow execution                                                          | `core/tasks.py` + `core/celery_app.py` | ✅ Done                                  |
| Sync fallback if Celery/Redis not running                                                         | `main.py`                              | ✅ Done                                  |
| DB Models: User, Workflow, WorkflowNode, WorkflowEdge, WorkflowRun, File, ModelMetadata, AuditLog, Organisation, RunNodeState, DriftAlert | `models/models.py` | ✅ All updated for M1 |
| SQLite dev database                                                                               | `db/session.py` + `workline.db`        | ✅ Done                                  |
| DB Seeder with demo workflow, organisations and reasoning                                         | `seed.py`                              | ✅ Done, handles multi-tenancy           |
| Docker-Compose stack (API, Postgres, Redis, MinIO)                                                | `infra/docker/docker-compose.yml`      | ✅ Done                                  |
| Alembic Migration System                                                                          | `alembic/`, `alembic.ini`              | ✅ Done                                  |
| SQLAlchemy Multi-tenancy listener                                                                 | `db/session.py`                        | ✅ Done                                  |
| JWT Auth (Login/Refresh/Logout)                                                                   | `auth/jwt.py` + `routers/auth.py`      | ✅ Done                                  |
| RBAC Dependencies (Admin/Editor/Viewer)                                                           | `auth/dependencies.py`                 | ✅ Done                                  |
| Next.js Auth Middleware + Interceptors                                                            | `middleware.ts` + `lib/api.ts`         | ✅ Done                                  |
| UI Login Page + Auth State                                                                        | `app/login/` + `store/useAuthStore.ts` | ✅ Done                                  |

### Workflow Engine (`packages/workflow_engine`)

| Feature                                 | File        | Status |
| --------------------------------------- | ----------- | ------ |
| DAG topological sort (Kahn's algorithm) | `engine.py` | ✅ Done |
| Async `execute()` runner                | `engine.py` | ✅ Done |
| Block registry (type → class map)       | `engine.py` | ✅ Done |

### Block Library (`packages/block_library`)

| Block                           | Pack       | Status                               |
| ------------------------------- | ---------- | ------------------------------------ |
| `OCRBlock`                      | Generic    | ⚠️ Mock (prints, returns static text) |
| `ClassifyBlock`                 | Generic    | ⚠️ Mock (hardcoded "Invoice" + 0.95)  |
| `StoreFileBlock`                | Generic    | ⚠️ Mock (hardcoded path)              |
| `DrawingClassifierBlock`        | Mechanical | ⚠️ Mock                               |
| `POExtractorBlock`              | Mechanical | ⚠️ Mock                               |
| `DuplicateDrawingDetectorBlock` | Mechanical | ⚠️ Mock                               |
| `TeamLeaderRecommenderBlock`    | Mechanical | ⚠️ Mock                               |

### Frontend (Next.js 14 — `apps/web`)

| Feature                                                     | File(s)                                 | Status                  |
| ----------------------------------------------------------- | --------------------------------------- | ----------------------- |
| App shell + sidebar with workflow tabs                      | `layout.tsx`, `Sidebar.tsx`             | ✅ Done                  |
| Dashboard: KPI cards, runs table, drift alerts              | `dashboard/page.tsx`                    | ✅ Done (mock data)      |
| Canvas: React Flow + custom nodes + drag-drop               | `automate/page.tsx`, `WorkflowNode.tsx` | ✅ Done                  |
| Block palette: searchable, category-grouped, drag-to-canvas | `BlockPalette.tsx`                      | ✅ Done (20 block types) |
| Toolbar: validate, simulate, save, deploy                   | `Toolbar.tsx`                           | ✅ Done                  |
| Chatbot panel: message thread + Apply to Canvas             | `ChatPanel.tsx`                         | ✅ Done                  |
| Workflow detail page: Runs/Results/Logs/Settings tabs       | `workflow/[id]/page.tsx`                | ✅ Done                  |
| Login stub                                                  | `login/page.tsx`                        | ✅ Done (no real auth)   |
| Zustand stores (workspace, canvas, chat)                    | `stores/*.ts`                           | ✅ Done                  |
| API service layer (typed fetch wrappers)                    | `lib/api.ts`                            | ✅ Done                  |
| Design system: dark mode, glass cards, animations           | `globals.css`, `tailwind.config.ts`     | ✅ Done                  |

### AI Planner (`apps/api/app/services/planner.py`)

- Architecture is **keyword-matching mock** (not a real LLM call)
- Returns hardcoded node/edge JSON for 6 fixed scenarios (`classify+pdf`, `mechanical/drawing`, `approval/human/confidence`, `notify/api/form`, `resume/hiring`, `support/complaint/ticket`)
- Fallback: returns empty nodes and a "I'm not sure" message
- `OPENAI_API_KEY` is loaded but **never used** currently

---

## ❌ What Is NOT Yet Implemented

### 🟢 Frontend — MVP DONE (`apps/web/`)

All core frontend pages, components, and stores have been implemented. Remaining items:
- [ ] WebSocket client for live run status updates (currently using REST polling)
- [ ] Real-time collaborative editing
- [ ] Mobile canvas editing graceful degradation

### 🟠 Backend — Missing or Incomplete

- [ ] **Real LLM integration in `planner.py`**: Replace keyword mocks with actual GPT-4o / gpt-4.1 calls using the system prompt that describes the block library and requests JSON DAG output
- [ ] **Authentication & RBAC**: JWT-based auth endpoints (`/auth/login`, `/auth/register`), role enforcement (admin, analyst, viewer). `python-jose` and `passlib` are already in requirements but not wired in
- [ ] **Workflow versioning**: `version` column exists on `Workflow` model but no version bump or rollback logic
- [ ] **Drift alerts**: No monitoring/alerting logic for workflow performance degradation
- [ ] **WebSocket real status**: Currently the WebSocket handler is an echo stub — needs to broadcast actual task progress from Celery to frontend
- [ ] **File upload endpoint**: No `POST /files` route; `File` model exists in DB
- [ ] **Audit log writes**: `AuditLog` model defined but nothing writes to it
- [ ] `WorkflowRun` record creation/update: `tasks.py` has a `# ...` comment but doesn't actually persist run start/end/status to DB
- [ ] Alembic migrations setup (listed in requirements, but no `/alembic` folder or `alembic.ini`); currently using `create_all()` directly

### 🟡 Block Library — Real AI Integration

- [ ] **`OCRBlock`**: Integrate Tesseract / PaddleOCR for real OCR
- [ ] **`ClassifyBlock`**: Integrate `facebook/bart-large-mnli` (zero-shot) or `distilbert` via HuggingFace Inference API
- [ ] **`DuplicateDrawingDetectorBlock`**: Integrate `BAAI/bge-large-en-v1.5` or `text-embedding-3-large` for real cosine similarity
- [ ] **`TeamLeaderRecommenderBlock`**: Integrate XGBoost / Gradient Boosting model
- [ ] **`StoreFileBlock`**: Integrate real filesystem / S3-compatible storage
- [ ] **`HumanReviewBlock`**: New block — pause execution, send notification, wait for human approval via API callback
- [ ] **Additional blocks not yet in registry**:
  - `FormInputBlock`, `APITriggerBlock` (Input pack)
  - `ParseBlock`, `CleanBlock`, `MapFieldsBlock` (Transform pack)
  - `RouterBlock`, `ScoreBlock` (Decide pack)
  - `RecommendBlock` (AI pack)
  - `CreateTaskBlock`, `NotifyBlock` (Act pack)
  - `DashboardOutputBlock`, `ExportBlock` (Output pack)
  - HR Pack: `ResumeFilterBlock`, `CandidateMatchBlock`

### 🟡 Infra

- [ ] `docker-compose.yml` for running API + Redis + PostgreSQL together
- [ ] Kubernetes manifests (k8s folder mentioned in original design but doesn't exist)
- [ ] Dockerfile for the frontend
- [ ] CI/CD pipeline (GitHub Actions)

---

## 🔑 Environment Variables

Located at `apps/api/.env` (use `.env.example` as the template):

| Variable         | Purpose                                 | Status                                 |
| ---------------- | --------------------------------------- | -------------------------------------- |
| `OPENAI_API_KEY` | For real LLM calls in `planner.py`      | Set but unused                         |
| `DATABASE_URL`   | PostgreSQL URL (SQLite used by default) | Optional                               |
| `REDIS_URL`      | Redis broker for Celery                 | Defaults to `redis://localhost:6379/0` |

---

## 🚀 How to Run Locally (Current State)

### Backend

```powershell
cd d:\MiniProject\Workline-AI\apps\api

# Install deps
pip install -r requirements.txt

# Seed demo data (safe to run multiple times)
python app/seed.py

# Start API
uvicorn app.main:app --reload
# → Running at http://localhost:8000
# → Swagger docs at http://localhost:8000/docs
```

### Frontend
```powershell
cd d:\MiniProject\Workline-AI\apps\web
npm install
npm run dev
# → Running at http://localhost:3000
# → Dashboard at http://localhost:3000/dashboard
# → Canvas at http://localhost:3000/automate
```

### Background Worker (optional, needs Redis)
```powershell
cd d:\MiniProject\Workline-AI\apps\api
celery -A app.core.celery_app.celery_app worker --loglevel=info
```

---

## 🗄️ Database Schema (Implemented)

All tables created via `models.Base.metadata.create_all()` on startup:

| Table            | Key Columns                                            | Notes                                      |
| ---------------- | ------------------------------------------------------ | ------------------------------------------ |
| `organisations`  | id, name, plan, created_at                             | ✅ New Table (Multi-tenancy root)          |
| `users`          | id, org_id, name, email, role, created_at              | ✅ FK to organisations added               |
| `workflows`      | id, org_id, name, description, status, version, parent_version_id, created_by | ✅ Multi-tenancy + Versioning added |
| `workflow_nodes` | id (str), workflow_id, type, config_json, position_x/y, reasoning | ✅ reasoning column added             |
| `workflow_edges` | id (str), workflow_id, source_node_id, target_node_id, edge_type | ✅ edge_type added                  |
| `workflow_runs`  | id, workflow_id, status, started_at, ended_at, logs    | ✅ awaiting_review status added            |
| `run_node_states`| id, run_id, node_id, status, started_at, ended_at, output_json, error | ✅ New Table (detailed run tracking) |
| `files`          | id, org_id, workflow_id, path, hash, metadata_json     | ✅ FK to organisations added               |
| `models`         | id, name, type, version, metrics_json                  | AI model registry                          |
| `audit_logs`     | id, org_id, user_id, action, entity_type, entity_id, timestamp | ✅ FK back to orgs + append-only logic |
| `drift_alerts`   | id, workflow_id, metric, baseline_val, current_val, resolved | ✅ New Table (Drift monitoring)       |

---

## 📌 Next Steps — See TEAM_PLAN.md

> Detailed per-member, per-phase checklists are in **[TEAM_PLAN.md](./TEAM_PLAN.md)**.

**Phase 1 priorities (both members working in parallel):**

| Member J (Frontend)                               | Member M (Backend)                                       |
| ------------------------------------------------- | -------------------------------------------------------- |
| Scaffold Next.js 14 in `apps/web/`                | Restructure `apps/api/` to spec layout + Alembic         |
| App shell: sidebar, layout, routing               | Auth: JWT endpoints + RBAC dependencies                  |
| Canvas: React Flow + custom node types            | Real LLM planner via LiteLLM (replace keyword mock)      |
| Chatbot panel: message thread + proposal renderer | Upgrade workflow engine: parallel exec + retry + sandbox |
| Dashboard: KPI cards + run table                  | Real WebSocket: Redis pub/sub → per-node status stream   |
| Auth UI: login + token refresh interceptor        | `docker-compose.yml` for full local stack                |

**Integration point**: After Phase 1 tasks complete, run the Integration Checkpoint in `TEAM_PLAN.md`.

---

## 🤝 Team Contribution Areas

Both members are full-stack. Work is split **by feature/module**, not by layer (UI vs backend).
Each member owns a feature end-to-end: its DB schema, API routes, services, AND frontend UI.

| Phase       | **Member J**                                                                 | **Member M**                                                                                     |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Phase 1** | Canvas + Chatbot (LLM planner, React Flow UI, chatbot panel, save/deploy UI) | Foundation + Auth + Engine (Alembic, RBAC, workflow CRUD, DAG engine, block library, WebSockets) |
| **Phase 2** | Dashboard + Run Monitoring (drift detection, KPI cards, run timeline UI)     | Human Review + Versioning + ML Blocks (XGBoost, embedding, rollback, diff view)                  |
| **Phase 3** | Scheduled Triggers + On-Prem ( Celery beat, docker-compose.onprem.yml)       | Domain Packs + CI/CD + UI Polish (pack installer, GitHub Actions, accessibility)                 |

> See **[TEAM_PLAN.md](./TEAM_PLAN.md)** for the full per-phase checklist per member.


---

## 💡 AI Model Notes (for future AI assistants reading this file)

- All block `run()` methods return **hardcoded mock data** — they do not call any real ML model
- The `planner.py` service matches keywords, not intent — the OpenAI API call is scaffolded but commented out
- The frontend is **implemented** with Next.js 14, React Flow, Zustand, and Tailwind CSS
- The backend API is fully functional via Swagger at `http://localhost:8000/docs`
- `workline.db` is the live SQLite file; don't commit large changes to it
- React Flow nodes use **string IDs** (e.g., `"node_1"`) — the DB `WorkflowNode.id` is a String type to match this
- The canvas store includes a registry of **20 block types** across 7 categories
- Dashboard data is currently **mock** — wire to real API endpoints in Phase 2
