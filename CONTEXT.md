> **Purpose**: Running state-of-the-codebase document for both human devs and AI assistants.
> **Rule**: Every time you make significant code changes, update the relevant section of this file.
> **Team Plan**: See [`TEAM_PLAN.md`](./TEAM_PLAN.md) for the full phase-by-phase checklist for Member J and Member M.
> **Last Updated**: 2026-02-25 (Shared Setup complete + J1 — Conversation & Planning Backend complete)

---

## 📁 Monorepo Structure

```
Workline-AI/
├── package.json            ✅ Root Turborepo workspace manifest
├── turbo.json              ✅ Turborepo pipeline (build / dev / lint / type-check)
├── CONTEXT.md              ✅ This file
├── TEAM_PLAN.md            ✅ Phase-by-phase task checklist
├── README.md               ✅ Project overview + setup guide
│
├── apps/
│   ├── api/                ✅ Backend (FastAPI) — WITH REAL LLM
│   │   ├── app/
│   │   │   ├── main.py         ✅ API entrypoint (planning + workflows + auth routers)
│   │   │   ├── seed.py         ✅ DB seeder (demo orgs, users, workflows)
│   │   │   ├── ai/
│   │   │   │   └── planner.py  ✅ GroqPlanner (llama-3.3-70b-versatile, real LLM) [J1]
│   │   │   ├── auth/
│   │   │   │   ├── dependencies.py ✅ get_current_user, require_viewer / require_editor / require_admin
│   │   │   │   └── jwt.py          ✅ create_access_token, decode_access_token
│   │   │   ├── core/
│   │   │   │   ├── celery_app.py   ✅ Celery + Redis broker config
│   │   │   │   ├── context.py      ✅ Domain context string for LLM prompt
│   │   │   │   └── tasks.py        ✅ execute_workflow_task (Celery task)
│   │   │   ├── db/
│   │   │   │   └── session.py      ✅ SQLite engine / PostgreSQL-ready, get_db dependency
│   │   │   ├── models/
│   │   │   │   └── models.py       ✅ All SQLAlchemy ORM models [see DB Schema section]
│   │   │   ├── routers/
│   │   │   │   ├── auth.py         ✅ POST /auth/login, /auth/register
│   │   │   │   ├── workflows.py    ✅ Full workflow CRUD + deploy + run + rollback + runs
│   │   │   │   └── planning.py     ✅ POST /plan + GET /conversations/{id} [J1]
│   │   │   ├── schemas/
│   │   │   │   ├── auth.py         ✅ Login / token Pydantic schemas
│   │   │   │   └── workflow.py     ✅ Detailed workflow request/response schemas
│   │   │   └── services/           (empty — planner.py mock deleted in J1)
│   │   ├── alembic/            ✅ Migration system
│   │   │   └── versions/       ✅ 3 migrations applied (initial, password, conversations)
│   │   ├── .env                ✅ Dev env vars (GROQ_API_KEY, DATABASE_URL, REDIS_URL) [J1]
│   │   ├── .env.example        ✅ Template for new devs
│   │   ├── requirements.txt    ✅ Python deps (groq replaces openai) [J1]
│   │   ├── Dockerfile          ✅ API Docker image
│   │   └── workline.db         ✅ SQLite dev database (seeded, all migrations applied)
│   │
│   └── web/                    ✅ Frontend (Next.js 14, App Router)
│       ├── app/
│       │   ├── layout.tsx          ✅ Root layout (Inter font, dark theme globals)
│       │   ├── page.tsx            ✅ Landing / redirect page
│       │   ├── login/page.tsx      ✅ Login stub
│       │   ├── dashboard/page.tsx  ✅ Dashboard (mock stats + workflow list)
│       │   ├── automate/page.tsx   ✅ Canvas + chatbot split-view
│       │   └── workflow/[id]/page.tsx ✅ Workflow detail page
│       ├── components/
│       │   ├── canvas/
│       │   │   ├── BlockPalette.tsx    ✅ Draggable block palette (by category)
│       │   │   ├── Toolbar.tsx         ✅ Canvas toolbar (Save, Deploy, Undo, etc.)
│       │   │   └── nodes/WorkflowNode.tsx ✅ React Flow custom node
│       │   ├── chatbot/
│       │   │   └── ChatPanel.tsx       ✅ AI chat input → calls /plan → loads canvas
│       │   └── workspace/
│       │       └── Sidebar.tsx         ✅ Navigation sidebar
│       ├── lib/
│       │   └── api.ts              ✅ Typed fetch wrappers (all endpoints, auth headers) [Shared Setup]
│       ├── .env.example            ✅ NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL [Shared Setup]
│       ├── next.config.mjs         ✅
│       └── package.json            ✅ web package (npm workspace)
│
├── packages/
│   ├── shared-types/           ✅ NEW — canonical type definitions [Shared Setup]
│   │   ├── block_registry.py   ✅ Pydantic BlockDefinition, 21 blocks, VALID_BLOCK_TYPES
│   │   ├── block_registry.ts   ✅ TypeScript mirror, getBlocksByCategory() helper
│   │   ├── api_schemas.py      ✅ All Pydantic request/response models
│   │   ├── api_schemas.ts      ✅ All TypeScript interfaces
│   │   └── package.json        ✅ @workline/shared-types manifest
│   ├── block_library/          ✅ Block execution implementations (Python)
│   └── workflow_engine/        ✅ Workflow runner + engine.py
│
└── infra/
    └── docker/
        └── docker-compose.yml  ✅ FastAPI + PostgreSQL 16 + Redis 7 + MinIO
```

---

## 🗄️ Database Schema (SQLAlchemy → SQLite / PostgreSQL)

| Table                | Key Columns                                                                               | Notes                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `organisations`      | id, name, plan, created_at                                                                | Multi-tenant root                                        |
| `users`              | id, org_id, name, email, password_hash, role                                              | Roles: admin, editor, viewer                             |
| `workflows`          | id, org_id, name, description, status, version, parent_version_id, created_by, created_at | status: draft/active/archived                            |
| `workflow_nodes`     | id (String), workflow_id, type, config_json, position_x, position_y, reasoning            | id is string e.g. "node_1"                               |
| `workflow_edges`     | id (String), workflow_id, source_node_id, target_node_id, edge_type                       | edge_type: default/condition_true/condition_false        |
| `workflow_runs`      | id, workflow_id, status, started_at, ended_at, logs                                       | status: pending/running/completed/failed/awaiting_review |
| `run_node_states`    | id, run_id, node_id, status, started_at, ended_at, output_json, error                     | Per-node run state                                       |
| `files`              | id, org_id, workflow_id, path, hash, metadata_json                                        | MinIO-backed storage                                     |
| `models`             | id, name, type, version, metrics_json                                                     | Registered ML models                                     |
| `audit_logs`         | id, org_id, user_id, action, entity_type, entity_id, timestamp                            | Audit trail                                              |
| `drift_alerts`       | id, workflow_id, metric, baseline_val, current_val, resolved, created_at                  |                                                          |
| `conversations`      | id, org_id, workflow_id, created_at                                                       | Chat sessions [J1]                                       |
| `conversation_turns` | id, conversation_id, role, content, proposal_json, created_at                             | role: user/assistant [J1]                                |

**Applied Alembic Migrations:**
1. `7c4bff9d1fb8_initial_m1_setup.py`
2. `06e4945f3618_add_user_password.py`
3. `0e785d094cbd_add_conversations_and_conversation_turns.py` [J1]

---

## 🔌 API Endpoints

| Endpoint                                     | File                                     | Status                                   |
| -------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `POST /auth/login`                           | `routers/auth.py`                        | ✅ Done                                   |
| `POST /auth/register`                        | `routers/auth.py`                        | ✅ Done                                   |
| `POST /plan`                                 | `routers/planning.py` + `ai/planner.py`  | ✅ Real Groq llama-3.3-70b-versatile [J1] |
| `GET /conversations/{id}`                    | `routers/planning.py`                    | ✅ Done [J1]                              |
| `GET /workflows`                             | `routers/workflows.py`                   | ✅ Done                                   |
| `POST /workflows`                            | `routers/workflows.py`                   | ✅ Done                                   |
| `GET /workflows/{id}`                        | `routers/workflows.py`                   | ✅ Done                                   |
| `PATCH /workflows/{id}`                      | `routers/workflows.py`                   | ✅ Done                                   |
| `DELETE /workflows/{id}`                     | `routers/workflows.py`                   | ✅ Done                                   |
| `POST /workflows/{id}/deploy`                | `routers/workflows.py`                   | ✅ Done                                   |
| `POST /workflows/{id}/run`                   | `routers/workflows.py` + `core/tasks.py` | ✅ Done (Celery)                          |
| `GET /workflows/{id}/runs`                   | `routers/workflows.py`                   | ✅ Done                                   |
| `POST /workflows/{id}/rollback/{version_id}` | `routers/workflows.py`                   | ✅ Done                                   |
| `WS /ws/status/{workflow_id}`                | `main.py`                                | ✅ Done                                   |

---

## 🖥️ Frontend Components

| Component              | Path                                       | Status                               |
| ---------------------- | ------------------------------------------ | ------------------------------------ |
| Canvas split-view page | `app/automate/page.tsx`                    | ✅ Done                               |
| Workflow detail page   | `app/workflow/[id]/page.tsx`               | ✅ Done                               |
| Dashboard              | `app/dashboard/page.tsx`                   | ✅ Done (mock stats)                  |
| Login stub             | `app/login/page.tsx`                       | ✅ Done                               |
| ChatPanel (chatbot)    | `components/chatbot/ChatPanel.tsx`         | ✅ Done (calls `/plan`)               |
| Sidebar                | `components/workspace/Sidebar.tsx`         | ✅ Done                               |
| BlockPalette           | `components/canvas/BlockPalette.tsx`       | ✅ Done                               |
| Toolbar                | `components/canvas/Toolbar.tsx`            | ✅ Done                               |
| WorkflowNode           | `components/canvas/nodes/WorkflowNode.tsx` | ✅ Done                               |
| API service layer      | `lib/api.ts`                               | ✅ Done (all endpoints, auth headers) |

---

## 🤖 AI Planner (`apps/api/app/ai/planner.py`) [J1 — DONE]

- **Real Groq LLM integration** — `llama-3.3-70b-versatile` (temperature 0.2, JSON mode)
- **4-layer prompt**: system persona + full 21-block registry snapshot + domain context + user goal + last 8 conversation turns
- **DAG validation**: every `type` checked against `BLOCK_REGISTRY`; cycle detection via topological sort (Kahn's)
- **Retry**: if validation fails, retries once with the error message appended as a follow-up message
- **Dagre-style layout**: topological BFS assigns `position_x`/`position_y` (250px x-gap, 160px y-gap)
- **Conversation persistence**: saves `user` and `assistant` `ConversationTurn` (with full `proposal_json`) to DB
- Old `services/planner.py` keyword mock has been **deleted**
- `GROQ_API_KEY` must be set in `.env`

---

## 📦 Shared Types (`packages/shared-types/`) [Shared Setup — DONE]

**block_registry.py / block_registry.ts** — 21 block types across 9 categories:

| Category   | Blocks                                                                                |
| ---------- | ------------------------------------------------------------------------------------- |
| Input      | `file_upload`, `api_trigger`, `form_input`                                            |
| Extract    | `ocr`, `parse`                                                                        |
| Transform  | `clean`, `map_fields`                                                                 |
| Decide     | `router`, `score`                                                                     |
| AI         | `classify`, `recommend`                                                               |
| Human      | `human_review`                                                                        |
| Act        | `store`, `notify`, `create_task`                                                      |
| Output     | `dashboard_out`, `export`                                                             |
| Mechanical | `drawing_classifier`, `po_extractor`, `duplicate_detector`, `team_leader_recommender` |

**api_schemas.py / api_schemas.ts** — Shared request/response types for all endpoints:
- `PlanRequest`, `WorkflowProposal`, `ConversationOut`, `ConversationTurnOut`
- `WorkflowCreateRequest`, `Workflow`, `WorkflowDetail`
- `WorkflowRun`, `RunTriggerResponse`
- `LoginRequest`, `TokenResponse`

---

## ⚠️ What's NOT Done Yet

### 🟠 Backend
- [ ] **Authentication wiring**: JWT login/register exist but RBAC is not enforced on all routes
- [ ] **Workflow versioning**: `version` column exists but no bump/rollback UI logic
- [ ] **Drift alerts**: no monitoring/alerting logic yet
- [ ] **MinIO file storage**: routes exist but actual MinIO calls not wired

### 🟡 Frontend (J2–J4 remaining)
- [ ] **ChatPanel** → needs to call `POST /plan` with real `conversation_id` state
- [ ] **canvasStore** → needs to import block types from `packages/shared-types/block_registry.ts`
- [ ] **Dashboard** → mock data, not wired to real API
- [ ] **WorkflowDetail** → partial, no save-to-DB flow
- [ ] **Human review** → no UI for awaiting_review run state yet

### 🟢 Shared Setup (all done ✅)
- All `packages/shared-types/` files created
- Turborepo root `package.json` + `turbo.json` created
- `apps/web/.env.example` created
- `lib/api.ts` fully updated with auth headers and all endpoints

---

## 🌍 Environment Variables

| Variable              | Purpose                                 | Status                                     |
| --------------------- | --------------------------------------- | ------------------------------------------ |
| `GROQ_API_KEY`        | Real LLM calls in `ai/planner.py`       | **Required** — set in `apps/api/.env` [J1] |
| `DATABASE_URL`        | PostgreSQL URL (SQLite used by default) | Optional                                   |
| `REDIS_URL`           | Redis broker for Celery                 | Defaults to `redis://localhost:6379/0`     |
| `JWT_SECRET_KEY`      | JWT signing secret                      | Required for auth                          |
| `NEXT_PUBLIC_API_URL` | Frontend → Backend URL                  | Defaults to `http://localhost:8000`        |
| `NEXT_PUBLIC_WS_URL`  | Frontend → WebSocket URL                | Defaults to `ws://localhost:8000`          |

---

## 🚀 Running Locally

```bash
# Backend
cd apps/api
pip install -r requirements.txt
alembic upgrade head
python app/seed.py
uvicorn app.main:app --reload
# Swagger: http://localhost:8000/docs

# Frontend
cd apps/web
npm install
npm run dev
# App: http://localhost:3000
```

---

## 💡 AI Model Notes (for future AI assistants reading this file)

- All block `run()` methods in `packages/block_library/` return **hardcoded mock data** — no real ML yet
- `ai/planner.py` uses **Groq `llama-3.3-70b-versatile`** with JSON mode — old keyword mock deleted [J1]
- The planning endpoint is `POST /plan` (not the old `/workflows/plan`)
- `packages/shared-types/block_registry.py` and `block_registry.ts` are the **single source of truth** for all 21 block types; always keep them in sync
- `workline.db` is the live SQLite file — don't commit large data changes to it
- React Flow nodes use **string IDs** (e.g., `"node_1"`) — the DB `WorkflowNode.id` is a String type to match
- Dashboard data is currently **mock** — wire to real API endpoints in Phase 2
- `Conversation` and `ConversationTurn` tables store chatbot history; restored via `GET /conversations/{id}` [J1]
- Branch naming convention: `feature/J-<name>` (Member J) and `feature/M-<name>` (Member M), merged via PR
