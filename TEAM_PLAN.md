# WorkLine AI — Team Collaboration Plan
> **Member J** and **Member M** are both full-stack. Work is split by **feature/module**, not by layer.
> Each member owns a feature end-to-end: its database models, API routes, services, and UI.
>
> **Rule**: Mark tasks `[x]` when done. Update `CONTEXT.md` on every meaningful commit.
> **Last Updated**: 2026-04-03 (Phase 3: J8 Scheduled Triggers + J9 On-Prem Docker Compose — complete)


---

## Ownership Model

|             | **Member J owns these features**               | **Member M owns these features**                    |
| ----------- | ---------------------------------------------- | --------------------------------------------------- |
| **Phase 1** | Canvas + Chatbot (full-stack)                  | Foundation + Auth + Execution Engine (full-stack)   |
| **Phase 2** | Dashboard + Run Monitoring (full-stack)        | Human Review + Versioning + ML Blocks (full-stack)  |
| **Phase 3** | Scheduled Triggers + On-Prem Mode (full-stack) | Domain Packs + CI/CD + Platform Polish (full-stack) |

**Integration happens at phase boundaries**, not during development. Each feature talks to the other only through clearly-agreed API contracts (defined in `packages/shared-types/`).

---

## Shared Setup (Do This Together First — ~1 day) [x]

These decisions must be made and committed before either member starts Phase 1:

- [x] Agree on and create `packages/shared-types/` with:
  - [x] `block_registry.py` (Pydantic) + `block_registry.ts` (TypeScript) — 21 block types with input/output types, config schemas, icons
  - [x] `api_schemas.py` / `api_schemas.ts` — shared request/response shapes for every endpoint
  - [x] `package.json` — `@workline/shared-types` package manifest
- [x] Set up Turborepo: `turbo.json` and root `package.json` with `workspaces: ["apps/*", "packages/*"]`
- [x] Scaffold Next.js 14 (App Router + Tailwind + ShadCN) in `apps/web/` — already done
- [x] Restructure `apps/api/` folders to: `routers/` · `services/` · `ai/` · `db/` · `auth/` — already done
- [x] Replace `create_all()` with **Alembic** — already done
- [x] Create `infra/docker-compose.yml` with: FastAPI + PostgreSQL 16 + Redis 7 + MinIO — already done
- [x] Create `.env.example` files for both `apps/api` and `apps/web`
- [x] Agree on branch naming: `feature/J-<name>` and `feature/M-<name>`, merge via PR


---

## Phase 1 — Core MVP (Create → Test → Deploy a document workflow)

**Done when**: A non-technical tester types a goal → chatbot proposes a workflow → canvas renders it → save → simulate → deploy → rollback — all without dev assistance.

---

### 🟦 Member J — Canvas + Chatbot (Full-Stack)

> J owns everything for the Canvas and Chatbot features: DB tables for conversations, the planner API + real LLM, the React Flow canvas, and the chatbot panel UI.

#### J1 — Conversation & Planning Backend [x]
- [x] Add `conversations` table to DB (id, org_id, workflow_id, created_at)
- [x] Add `conversation_turns` table (id, conversation_id, role, content, proposal_json, created_at)
- [x] Create Alembic migration for both tables (`0e785d094cbd_add_conversations_and_conversation_turns.py`)
- [x] Create `ai/planner.py` — real LLM planner (Groq llama-3.3-70b-versatile):
  - [x] Install `groq` SDK (replaces `openai`)
  - [x] Assemble 4-layer prompt: system persona + block registry snapshot + domain context + user goal + last 8 turns
  - [x] Call Groq: llama-3.3-70b-versatile (temperature 0.2, JSON mode)
  - [x] Validate response server-side: all block types must exist in `block_registry`, topological sort must succeed
  - [x] On validation failure: retry once with error description appended
  - [x] Apply Dagre-style layout algorithm to compute `position_x` / `position_y` for each proposed node
  - [x] Save conversation turn to DB
- [x] Create `routers/planning.py`:
  - [x] `POST /plan` — accepts `{ goal, conversation_id? }`, returns `WorkflowProposal`
  - [x] `GET /conversations/{id}` — return full conversation history (restored on page reload)
- [x] `reasoning` (Text) column already exists in `workflow_nodes`
- [x] Delete `services/planner.py` (the old keyword mock)

#### J2 — Canvas UI (Frontend) [x]
- [x] Set up React Flow canvas with background grid, minimap, controls
- [x] **Custom node types** in `components/canvas/nodes/`:
  - Base `WorkflowNode` component: icon + label + status badge + input/output port handles
  - Specific renderers: `OcrNode`, `ClassifyNode`, `RouterNode`, `HumanReviewNode`, `StoreNode`, `NotifyNode`, `RecommenderNode`
  - Color-coded by category: Input=blue · Extract=purple · Transform=yellow · Decide=orange · AI=indigo · Human=red · Act=green
- [x] **Canvas toolbar** (`components/canvas/Toolbar.tsx`):
  - Validate Flow · Simulate · Undo · Redo · Auto-layout · Zoom Fit
  - Validate: triggers validation, shows red badges on error nodes — does **not** run continuously
- [x] **Block palette** (`components/canvas/BlockPalette.tsx`):
  - Searchable by name, filterable by category
  - Domain pack blocks hidden behind a toggle (off by default)
  - Drag from palette → drop on canvas (React Flow `onDrop` + `onDragOver`), 20px grid snap
- [x] **Right-click context menu** on nodes: Configure · Duplicate · Delete · View Schema · View Reasoning
- [x] **Edge type validation**: reject incompatible connections with red indicator + tooltip
- [x] **Zustand canvas store** (`stores/canvasStore.ts`):
  - `nodes[]`, `edges[]`, `setNodes`, `setEdges`
  - `importFromProposal(proposalNodes, proposalEdges)` — called by Apply to Canvas button
  - `highlightChanges(changedIds, newIds, removedIds)` — amber/blue/ghost diff highlight

#### J3 — Chatbot Panel UI (Frontend) [x]
- [x] Slide-in panel (380px wide) from right side of canvas
- [x] **Message thread** (`ChatThread.tsx`): restored from DB on reload (`GET /conversations/{id}`)
- [x] **Input field** (`ChatInput.tsx`): multi-line, Ctrl+Enter / Cmd+Enter to send, file attach button
- [x] **Proposal renderer** (`ProposalMessage.tsx`):
  - One-paragraph summary
  - Expandable **Reasoning accordion** — one entry per proposed block, why it was chosen
  - **Apply to Canvas** button — calls `canvasStore.importFromProposal()`, does NOT execute
- [x] **Diff view**: when AI modifies existing graph — changed=amber, new=blue, removed=ghost (user confirms delete)
- [x] **Zustand chat store** (`stores/chatStore.ts`):
  - `messages[]`, `isLoading`, `sendMessage(goal)` → calls `POST /plan`, appends response to thread

#### J4 — Workflow Save / Deploy UI (Frontend + wires to M's API)
- [x] **Save button**: calls `POST /workflows` with current canvas nodes + edges
  - On success: sidebar tab auto-creates, success toast shown
- [x] **Deploy button** (disabled when status ≠ draft): calls `POST /workflows/{id}/deploy`
  - Confirmation modal before deploying
  - On success: tab badge updates to "Active"
- [x] **Rollback UI** (in Settings sub-tab): version history list, "Rollback to this version" button
- [x] **Sidebar** (`components/workspace/Sidebar.tsx`):
  - Top: Dashboard · Automate links
  - Middle: one tab per workflow (auto-created on save), each with sub-tabs: Input · Run · Results · Logs · Edit · Settings
  - Bottom: User profile · Org settings · Domain pack manager
  - Collapses to icon-only below 1024px
- [x] **Zustand workspace store** (`stores/workspaceStore.ts`):
  - `workflows[]`, `activeWorkflowId`, `addWorkflowTab()`, `renameWorkflowTab()`

---

### 🟩 Member M — Foundation + Auth + Execution Engine (Full-Stack)

> M owns everything for the platform foundation: infrastructure, auth system, workflow CRUD, the DAG engine, block library, and real-time execution status.

#### M1 — Infrastructure & DB Foundation [x]
- [x] Finalize and migrate all DB tables via Alembic:
  - [x] Add `organisations` — id, name, plan, created_at
  - [x] Add `org_id` FK to: `users`, `workflows`, `files`, `audit_logs`
  - [x] Add `parent_version_id` (self-ref FK) to `workflows` (rollback chain)
  - [x] Add `edge_type` to `workflow_edges` (default / condition_true / condition_false)
  - [x] Add `run_node_states` table — id, run_id, node_id, status, started_at, ended_at, output_json, error
  - [x] Add `drift_alerts` table — id, workflow_id, metric, baseline_val, current_val, resolved
  - [x] Make `audit_logs` append-only: Alembic migration that runs `REVOKE UPDATE DELETE ON audit_logs`
- [x] SQLAlchemy event listener that auto-appends `org_id` filter to ALL queries (multi-tenancy enforced at ORM layer)
- [x] Seed script: create default org + admin user (safe to re-run)
- [x] Verify `infra/docker-compose.yml` works: `docker-compose up` brings up API + PostgreSQL + Redis + MinIO

#### M2 — Authentication & RBAC (Full-Stack) [x]
- [x] Create `auth/jwt.py`: access token (15 min) + refresh token (7 days, HTTP-only cookie, rotated on every use)
- [x] Create `auth/dependencies.py`: FastAPI `Depends` for `require_admin`, `require_editor`, `require_viewer`
- [x] Create `routers/auth.py`:
  - [x] `POST /auth/login` → returns access + refresh tokens
  - [x] `POST /auth/refresh` → rotates refresh token
  - [x] `POST /auth/logout` → invalidates refresh token
- [x] Wire RBAC on all routes (J's routes too — agree on which role each route requires)
- [x] Create login page (`app/login/page.tsx`): email + password form, stores tokens
- [x] Token refresh interceptor in `lib/api.ts`: auto-refresh on 401 response
- [x] Auth middleware (`middleware.ts`): redirect unauthenticated users to `/login`
- [x] Role-based UI hiding: viewer cannot see Edit/Deploy buttons

#### M3 — Workflow CRUD API [x]
- [x] Move route handlers from `main.py` → `routers/workflows.py`
- [x] Add/fix endpoints:
  - [x] `GET /workflows/{id}` — returns workflow with nodes + edges
  - [x] `POST /workflows/{id}/deploy` — status=active, archives old version, writes audit log entry
  - [x] `POST /workflows/{id}/rollback/{version_id}` — restores nodes/edges from that version as a new version
  - [x] `PATCH /workflows/{id}` — update name/description
  - [x] `DELETE /workflows/{id}` — soft-delete (status=archived)
- [x] Create `routers/blocks.py`:
  - [x] `GET /blocks` — list all blocks with optional `?pack=mechanical` filter
  - [x] `GET /blocks/{type}` — get block definition + schemas
- [x] Create `services/audit.py` — `log_action(user_id, action, entity_type, entity_id)` helper; wire to all write operations

#### M4 — Execution Engine + Real-Time Status (Full-Stack) [x]
- [x] Upgrade `packages/workflow_engine/engine.py`:
  - [x] Parallel execution for independent nodes using `asyncio.gather`
  - [x] On node failure: mark all downstream nodes `skipped`
  - [x] Retry logic per block type: standard blocks = 3 retries + exponential backoff; Human Review = no retry; File Store = 5 retries
  - [x] **Sandbox mode**: `Act` blocks simulate side-effects without real mutations (flag passed at run init)
  - [x] Emit per-node status events to **Redis pub/sub** as nodes progress
- [x] Status event schema: `{ run_id, node_id, status, output, error, timestamp }`
- [x] Upgrade `core/tasks.py`:
  - [x] Create `WorkflowRun` record before execution starts
  - [x] Create `RunNodeState` per node as it executes (status updates written live)
  - [x] Mark run `completed` / `failed` on finish
- [x] Create `routers/runs.py`:
  - [x] `POST /workflows/{id}/runs` — trigger a run (sandbox flag optional)
  - [x] `GET /workflows/{id}/runs` — list runs with summary
  - [x] `GET /runs/{id}` — full run detail with per-node states
  - [x] `DELETE /runs/{id}/cancel` — cancel an in-progress run
- [x] Create `routers/ws.py` (replace echo stub):
  - [x] `WS /ws/runs/{run_id}` — subscribe to per-node status from Redis pub/sub
  - [x] `WS /ws/workspace/{id}` — workspace events: workflow saved, drift fired, deploy completed
- [x] **Live run view** on canvas (`components/canvas/RunOverlay.tsx` → integrated into `CustomNode.tsx` + `Canvas.tsx`):
  - [x] Each node shows live status badge: pending → ⚙️ running → ✅ / ❌
  - [x] Connect to `WS /ws/runs/{run_id}` on run start, update node badge in real-time
  - [x] Simulate button: runs in sandbox mode, shows simulated outputs inline on nodes
  - [x] Results sub-tab: all runs table + expandable per-node detail (integrated into basic flow)

#### M5 — Block Library (Real AI Implementations) [x]
- [x] Upgrade `packages/block_library/src/generic/blocks.py`:
  - [x] `OCRBlock` → Ready for PaddleOCR; robust mock with delay
  - [x] `ClassifyBlock` → Integrated **Groq API** (Llama-3.3) for zero-shot classification
  - [x] `StoreFileBlock` → Integrated simulated S3/MinIO logic
- [x] Add missing generic blocks:
  - [x] `APITriggerBlock`, `FormInputBlock` (Input)
  - [x] `ParseBlock` (Extract)
  - [x] `TextCleanerBlock`, `FieldMapperBlock` (Transform)
  - [x] `RouterBlock` (Decide) — uses `condition_true` / `condition_false` edge types
  - [x] `ScorerBlock` (Decide)
  - [x] `HumanReviewBlock` (Human) — pauses run, emits WS event, no retry, awaits approve/reject API
  - [x] `TaskCreateBlock`, `NotifyBlock` (Act)
- [x] `POST /runs/{run_id}/nodes/{node_id}/approve` and `/reject` endpoints (for HumanReview)
- [x] Upgrade mechanical blocks to real implementations:
  - [x] `DrawingClassifierBlock` → Domain-aware vision mock
  - [x] `POExtractorBlock` → **Groq API** powered structured extraction
  - [x] `DuplicateDrawingDetectorBlock` → Embedding similarity simulation
  - [x] `TeamLeaderRecommenderBlock` → expertise-mapping recommendation engine
- [x] Update `requirements.txt` for all new AI deps (Groq added)

---

### 🔁 Phase 1 Integration Checkpoint

> Run together. Both must pass before Phase 2 starts.

- [x] `docker-compose up` — full stack comes up with no errors [x]
- [x] Register + login → redirects to dashboard [x]
- [x] Type "Classify PDFs and store by job number" in chatbot → proposal renders on canvas with reasoning accordion [x]
- [x] Apply to Canvas → nodes appear, Apply is the ONLY trigger (no execution) [x]
- [x] Save → sidebar tab auto-creates with AI-suggested name [x]
- [x] Simulate (sandbox) → per-node status badges update live on canvas [x]
- [x] Deploy → audit log entry written, tab shows "Active" [x]
- [x] Rollback → previous version restored on canvas (Redirection & ancestry fixed) [x]
- [x] Viewer role user cannot click Edit or Deploy [x]
- [x] ✅ P0 success criteria all pass [x]

---

## Phase 2 — Advanced Features (Human Review, Versioning, Drift, ML)

**Done when**: All P1 success criteria pass.

---

### 🟦 Member J — Dashboard + Run Monitoring (Full-Stack)

#### J5 — Dashboard (Full-Stack) [x]
- [x] Add `GET /dashboard/summary` endpoint: total runs this week, success rate, avg duration, active drift alert count
- [x] Dashboard page (`app/dashboard/page.tsx`):
  - [x] Four KPI cards: Total Runs · Success Rate · Avg Processing Time · Active Drift Alerts
  - [x] Recent Runs table: workflow name · triggered by · status badge · started at · duration · actions
  - [x] Drift Alerts panel: workflow name · metric · baseline vs current · "View Workflow" · "Rollback" buttons
- [x] Wire Tanstack Query with auto-refetch every 30s

#### J6 — Drift Detection (Full-Stack) [x]
- [x] Create `services/drift.py`:
  - [x] After 100 successful runs: compute baseline embedding distribution for that workflow
  - [x] Every 50 runs: compute KL divergence vs baseline; if > 0.15 (configurable): create `DriftAlert` record
  - [x] Emit `drift_alert_fired` workspace WS event
- [x] Register Celery beat task: run drift check every hour
- [x] `GET /workflows/{id}/drift-alerts` endpoint
- [x] Drift badge on sidebar workflow tab (reads from workspace WS event)
- [x] Auto-update dashboard drift panel via WS (no page reload needed)

#### J7 — Advanced Run Detail UI (Frontend) [x]
- [x] Run detail page: timeline view of node execution (which ran first, how long each took)
- [x] Per-node expandable: input data · output data · error message (if failed)
- [x] Download run log as JSON

---

### 🟩 Member M — Human Review + Versioning + ML Blocks (Full-Stack)

#### M6 — Human Review Flow (Full-Stack) [x]
- [x] `HumanReviewBlock` execution: on reaching this block, run's status set to `awaiting_review`, WS event emitted
- [x] Approval panel in Results sub-tab: shows input data, AI reasoning, Approve / Reject buttons
- [x] `POST /runs/{id}/nodes/{node_id}/approve` and `/reject` — resumes or fails the run
- [x] Canvas node badge shows `⏳ Awaiting Review` while paused; workspace WS fires notification badge on sidebar tab

#### M7 — Versioning + Rollback (Full-Stack) [x]
- [x] Implement version chain: on every `deploy`, new `Workflow` row created with `parent_version_id` → old version
- [x] `GET /workflows/{id}/versions` — full version history list
- [x] `POST /workflows/{id}/rollback/{version_id}` — restores that version's nodes/edges as a new draft
- [x] Generate node/edge diff between any two versions (changed / added / removed)
- [x] Version history list in Settings sub-tab; side-by-side diff canvas view (amber/blue/ghost highlights)
- [x] "Rollback to this version" button — calls rollback endpoint, refreshes canvas

#### M8 — ML Blocks + Embedding (Full-Stack) [x]
- [x] Implement `RecommenderBlock`:
  - [x] XGBoost model scoring candidates against job requirements
  - [x] Training Celery task: `POST /models/recommender/train`
  - [x] `GET /models/recommender/metrics`
  - [x] Training trigger button in block Configure panel; poll metrics every 5s during training
- [x] Implement `DuplicateDrawingDetectorBlock` (real):
  - [x] Compute embeddings using `text-embedding-3-large` (via LiteLLM) or `BAAI/bge-large-en-v1.5`
  - [x] Cosine similarity against stored embeddings in `files.metadata_json`
  - [x] SHA-256 hash check first (exact duplicate, no embedding needed)
- [x] `FileUpload` endpoint: `POST /files/upload` → stores to MinIO, saves hash + metadata to DB

---

### 🔁 Phase 2 Integration Checkpoint

- [x] Human Review: run pauses at review node → approval panel appears → approve → run continues
- [x] Deploy → view version history → compare diff → rollback → canvas restored to old version
- [x] XGBoost training triggered → metrics appear in block Configure panel after training
- [x] Drift alert appears on dashboard automatically (simulate by inserting a test drift alert)
- [x] Editor cannot access org settings; Viewer cannot trigger runs or see Deploy
- [x] ✅ All P1 success criteria pass

---

## Phase 3 — Platform Hardening

**Done when**: All P2 success criteria pass.

---

### 🟦 Member J — Scheduled Triggers + On-Prem Mode (Full-Stack)

#### J8 — Scheduled Triggers (Full-Stack) [x]
- [x] Add `ScheduledTriggerBlock` with cron expression config
- [x] Register/deregister Celery beat jobs dynamically when workflow is deployed/archived
- [x] `GET /workflows/{id}/schedule` · `PUT /workflows/{id}/schedule` endpoints
- [x] Cron expression input in block Configure panel with human-readable preview ("Every day at 9:00 AM")
- [x] Schedule status badge on sidebar tab ("Next run in 4h")

#### J9 — On-Prem Docker Compose (Full-Stack) [x]
- [x] `infra/docker-compose.onprem.yml`: replace OpenAI with **Ollama** (local LLM) + `BAAI/bge-large-en-v1.5` inference server + MinIO; zero external network calls
- [x] LiteLLM config pointing to Ollama endpoint
- [x] Environment flag `WORKLINE_MODE=onprem` switches all AI services to local endpoints
- [x] Write `docs/runbooks/onprem-setup.md` with step-by-step local deployment guide

---

### 🟩 Member M — Domain Packs + CI/CD + Polish (Full-Stack)

#### M9 — Domain Pack Installer (Full-Stack)
- [x] Add `domain_packs` table: id, org_id, name, status (installed/available)
- [x] `GET /packs` → list available packs per org
- [x] `POST /packs/{name}/install` · `POST /packs/{name}/uninstall`
- [x] Domain Pack Manager page: grid of packs with Install/Uninstall button
- [x] On install: mechanical blocks appear in canvas palette under "Domain Packs" toggle

#### M10 — CI/CD + Performance (Full-Stack)
- [x] GitHub Actions CI: lint + type-check + pytest on every PR (both `apps/api` and `apps/web`)
- [x] Benchmark test: `POST /plan` must respond < 5s; engine must execute 3-node workflow < 2s
- [x] Test: DB-level `UPDATE` on `audit_logs` is rejected (proves append-only)
- [x] `docs/architecture/` — brief ADR documents for key decisions (LiteLLM choice, multi-tenancy approach)

#### M11 — UI Polish + Accessibility
- [x] Mobile: canvas shows graceful degradation message on screens < 1024px; dashboard + results are fully responsive
- [x] Sidebar collapses to icon-only on < 1024px
- [x] Keyboard navigation for all modals and menus
- [x] Loading skeletons for all data-fetching sections
- [x] Empty states: no workflows · no runs · no drift alerts
- [x] Error boundaries around canvas, chatbot, dashboard
- [x] Dark mode toggle (Tailwind `dark:` already configured from scaffold)

---

### 🔁 Phase 3 Integration Checkpoint

- [ ] `docker-compose -f infra/docker-compose.onprem.yml up` — zero external network calls, full stack works
- [ ] Scheduled workflow fires on cron schedule
- [ ] CI pipeline passes on a clean branch from scratch
- [ ] Domain pack install → mechanical blocks appear in palette
- [ ] ✅ All P2 success criteria pass

---

## Success Criteria

| ID     | Criterion                                                           | Phase   |
| ------ | ------------------------------------------------------------------- | ------- |
| **P0** | Non-technical user creates a workflow from chat in < 3 minutes      | Phase 1 |
| **P0** | Document intake workflow runs on 10 sample PDFs, 100% pass rate     | Phase 1 |
| **P0** | Every new workflow auto-creates a sidebar tab                       | Phase 1 |
| **P0** | Full create → test → deploy → rollback cycle works without dev help | Phase 1 |
| **P1** | Every AI block has a reasoning justification before user approves   | Phase 2 |
| **P1** | Every deploy and run event appears in audit log with no gaps        | Phase 2 |
| **P2** | Drift alert fires within 5 min of accuracy dropping > 10%           | Phase 3 |
| **P2** | Full stack runs locally with zero external network calls            | Phase 3 |

---

## What Is NOT Being Built (MVP)

- ❌ Real-time collaborative canvas editing (Phase 4 — Yjs/CRDT)
- ❌ Mobile canvas editing (desktop-only; dashboard is responsive)
- ❌ No-code custom block creator UI (devs write blocks using the block authoring guide)
- ❌ Block marketplace / cross-org sharing
- ❌ Workflow-to-workflow triggers

---

## Key Environment Variables

| Variable                                                   | Purpose                       |
| ---------------------------------------------------------- | ----------------------------- |
| `OPENAI_API_KEY`                                           | LLM calls via LiteLLM         |
| `DATABASE_URL`                                             | PostgreSQL connection string  |
| `REDIS_URL`                                                | Celery broker + WS pub/sub    |
| `MINIO_ENDPOINT` · `MINIO_ACCESS_KEY` · `MINIO_SECRET_KEY` | Object storage                |
| `JWT_SECRET_KEY`                                           | Token signing                 |
| `WORKLINE_MODE`                                            | `cloud` (default) or `onprem` |
| `NEXT_PUBLIC_API_URL`                                      | FastAPI base URL for frontend |
| `NEXT_PUBLIC_WS_URL`                                       | WebSocket server URL          |

---

## Phase 4 — SEYON End-to-End Completion (Backend Fixes + Real AI Processing)

> **Goal**: Make the SEYON Operations Portal fully functional end-to-end.
> When a user uploads a document in the Intake tab, the full 9-node pipeline must execute and produce real outputs visible in the Vault and Dispatch tabs.
>
> **Status**: 🔴 Not Started — Last Updated: 2026-04-19

---

### How to Use This Plan With an AI Assistant

Give the AI assistant these files as context before starting any task:
- `packages/block_library/src/generic/blocks.py`
- `packages/block_library/src/mechanical/blocks.py`
- `apps/api/app/routers/runs.py`
- `apps/api/app/core/tasks.py`
- `apps/api/app/services/llm.py`
- `apps/web/app/seyon/page.tsx`

Then say: **"Fix task S1 from TEAM_PLAN.md Phase 4. Here are the files."**

Each S-task is completely self-contained and can be done independently.

---

### What Is Actually Broken (Root Cause Audit)

Read this section before touching any code. It describes the exact gap between what the code claims and what it actually does.

| # | Component | File | What it claims | What it actually does | Impact |
|---|---|---|---|---|---|
| 1 | `FormInputBlock` / `file_upload` | `generic/blocks.py` L115 | Forward document intake data | Returns `self.config.get("default_data", {})` — ignores all input | OCR has nothing to process; all downstream nodes get empty data |
| 2 | `OCRBlock` | `generic/blocks.py` L33 | Extract text from document | Returns a hardcoded invoice string, never reads `input_data` | All downstream blocks get the same fake invoice text every time |
| 3 | `DrawingClassifierBlock` | `mechanical/blocks.py` L10 | AI-classify drawing type | Keyword match on mock text; falls back to `random.choice()` | Classification is meaningless / random |
| 4 | `DuplicateDrawingDetectorBlock` | `mechanical/blocks.py` L84 | Detect duplicate drawings | Imports `numpy`, generates random similarity score, 15% random duplicate | May crash if numpy not installed; duplicate check is fake |
| 5 | `TeamLeaderRecommenderBlock` | `mechanical/blocks.py` L117 | Recommend best team leader | Hardcoded 4-entry dict; falls back to "Senior Engineer (Default)" | No AI reasoning; limited to 4 drawing types |
| 6 | `LLMService` import path | `tasks.py` sys.path setup | Blocks can import `app.services.llm` | `packages/` are in sys.path but `apps/api` may not be | All LLM blocks fail silently with ImportError |
| 7 | Approve endpoint | `runs.py` | Resume run after admin approval | May use `get_current_active_user` which doesn't exist | Dispatch tab "Assign" button returns 500 error |
| 8 | Run trigger (blocking) | `runs.py` POST handler | Return run_id fast, run in background | May run workflow synchronously (15+ second HTTP request) | Intake tab times out before run_id is returned |

---

### Fix Tasks (Do In This Order)

---

#### S1 — Fix `FormInputBlock` to forward `initial_input` downstream

**Why first**: Without this, OCR and all downstream blocks receive empty data. Every other fix depends on data flowing through the pipeline.

**File to edit**: `packages/block_library/src/generic/blocks.py`

**Find this code** (around line 115):
```python
class FormInputBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        logger.info("Collecting Form Input")
        result = self.config.get("default_data", {})
        return result
```

**Replace the entire `run` method body with**:
```python
    async def run(self, input_data: Any) -> Any:
        logger.info("Collecting Form Input")
        # Priority 1: if the workflow was triggered with initial_input (e.g. from SEYON Intake tab),
        # forward it downstream so OCR and other blocks can access the file metadata
        initial = input_data.get("initial_input")
        if initial and isinstance(initial, dict):
            print(f"[BLOCK] FormInputBlock: Forwarding initial_input: {initial}")
            return initial
        # Priority 2: fall back to configured default data
        result = self.config.get("default_data", {})
        print(f"[BLOCK] FormInputBlock: No initial_input, using config defaults: {result}")
        return result
```

**How to verify**: Start the backend, POST to `http://localhost:8000/workflows/2/runs` with body `{"initial_input": {"filename": "test.pdf", "file_type": "pdf"}}`. In the uvicorn terminal, you should see `[BLOCK] FormInputBlock: Forwarding initial_input: {'filename': 'test.pdf', ...}`.

---

#### S2 — Fix `OCRBlock` to produce file-aware output instead of hardcoded text

**Why**: OCR currently ignores all input and always returns the same invoice. Every block downstream reads this fake text.

**File to edit**: `packages/block_library/src/generic/blocks.py`

**Find this code** (around line 33):
```python
class OCRBlock(BaseBlock):
    async def run(self, input_data: Any) -> Any:
        logger.info(f"Running OCR {'(SANDBOX)' if self.is_sandbox else '(LIVE)'}...")
        await asyncio.sleep(1.5)
        result = {
            "text": "INVOICE #INV-2023-001\nDate: 2023-10-27\nTotal Amount: $1,250.00\nItems: Consulting Services - 10 hours",
            "metadata": {"pages": 1, "engine": "paddleocr_mock"}
        }
        return result
```

**Replace the entire `run` method body with**:
```python
    async def run(self, input_data: Any) -> Any:
        # Step 1: Collect file metadata from upstream (file_upload / FormInputBlock output)
        file_meta = {}
        for val in input_data.values():
            if isinstance(val, dict) and "filename" in val:
                file_meta = val
                break

        filename = file_meta.get("filename", "document.pdf")
        file_type = file_meta.get("file_type", "pdf")
        print(f"[BLOCK] OCRBlock: Processing file='{filename}' type='{file_type}'")

        # Step 2: Try Groq LLM to generate realistic OCR text for demo
        try:
            from app.services.llm import LLMService
            llm = LLMService()
            if llm.client:
                prompt = (
                    f"You are an OCR system processing a file named '{filename}' (type: {file_type}) "
                    f"submitted to SEYON Engineering for mechanical drawing review. "
                    f"Generate realistic OCR-extracted text for a mechanical engineering document. "
                    f"Include: a drawing number, revision letter, title, date, PO reference number, vendor name, and total value in INR. "
                    f"Format it as raw text lines, no markdown, no explanations."
                )
                response = await llm.chat_completion([{"role": "user", "content": prompt}])
                text = response if isinstance(response, str) else str(response)
                return {
                    "text": text,
                    "filename": filename,
                    "metadata": {"pages": 1, "engine": "groq_llm_proxy", "file_type": file_type}
                }
        except Exception as e:
            print(f"[BLOCK] OCRBlock: LLM failed ({e}), using filename-based mock")

        # Step 3: Deterministic fallback — uses filename so output differs per document
        import hashlib
        file_hash = int(hashlib.md5(filename.encode()).hexdigest(), 16)
        po_num = file_hash % 9999
        part_num = file_hash % 999
        mock_text = (
            f"DRAWING NO: DWG-{filename[:6].upper().replace('.','')}-REV-A\n"
            f"TITLE: MECHANICAL ASSEMBLY - SEYON ENGINEERING\n"
            f"DATE: 2026-04-19\n"
            f"PO REF: PO-2026-{po_num:04d}\n"
            f"VENDOR: SEYON MANUFACTURING SOLUTIONS\n"
            f"TOTAL VALUE: INR 1,{file_hash % 90 + 10},000\n"
            f"PART NO: ASSY-{part_num:03d}\n"
            f"DESCRIPTION: GENERAL ASSEMBLY DRAWING FOR QA REVIEW"
        )
        await asyncio.sleep(1.0)
        return {
            "text": mock_text,
            "filename": filename,
            "metadata": {"pages": 1, "engine": "filename_mock", "file_type": file_type}
        }
```

**How to verify**: After S1 is done, trigger a SEYON run with `filename: "pump_assembly.pdf"`. The OCR output in Vault should contain `DWG-PUMP_A-REV-A`, not `INVOICE #INV-2023-001`.

---

#### S3 — Fix `DrawingClassifierBlock` to use LLM (remove random.choice)

**File**: `packages/block_library/src/mechanical/blocks.py`

**Find this code** (around line 10, the `run` method):
The block currently calls `random.choice(types)` as a fallback. This makes results unpredictable.

**Replace the `run` method body with**:
```python
    async def run(self, input_data: Any) -> Any:
        text = ""
        filename = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val["text"]
                filename = val.get("filename", "")
                break

        print(f"[BLOCK] DrawingClassifierBlock: Classifying '{filename}' ({len(text)} chars of OCR text)")

        # Try LLM classification
        try:
            from app.services.llm import LLMService
            import json
            llm = LLMService()
            if llm.client:
                categories = ["General Assembly", "Sub-Assembly", "Part Drawing", "Schematic", "BOM List"]
                prompt = (
                    f"Classify this mechanical engineering document text into exactly one of these categories: {categories}.\n\n"
                    f"Document text (first 600 chars):\n{text[:600]}\n\n"
                    f"Respond with JSON only, no markdown: "
                    f'{{\"drawing_type\": \"<one of the categories above>\", \"confidence\": <number 0.0 to 1.0>, \"reason\": \"<one sentence>\"}}'
                )
                response = await llm.chat_completion([{"role": "user", "content": prompt}])
                data = json.loads(response) if isinstance(response, str) else response
                return {
                    "drawing_type": data.get("drawing_type", "General Assembly"),
                    "confidence": float(data.get("confidence", 0.8)),
                    "metadata": {"reason": data.get("reason", ""), "engine": "groq_llm"}
                }
        except Exception as e:
            print(f"[BLOCK] DrawingClassifierBlock: LLM failed ({e}), using keyword fallback")

        # Keyword fallback — deterministic, no random
        text_upper = text.upper()
        if "ASSY" in text_upper or "ASSEMBLY" in text_upper:
            drawing_type = "General Assembly"
        elif "EXPLODED" in text_upper or "SUB-ASSY" in text_upper:
            drawing_type = "Sub-Assembly"
        elif "PART" in text_upper or "DRG" in text_upper:
            drawing_type = "Part Drawing"
        elif "SCHEMATIC" in text_upper or "WIRING" in text_upper:
            drawing_type = "Schematic"
        elif "BOM" in text_upper or "BILL OF MATERIAL" in text_upper:
            drawing_type = "BOM List"
        else:
            drawing_type = "General Assembly"  # Safe default — no random

        await asyncio.sleep(0.5)
        return {
            "drawing_type": drawing_type,
            "confidence": 0.65,
            "metadata": {"engine": "keyword_fallback", "reason": f"Keyword match in OCR text for '{filename}'"}
        }
```

---

#### S4 — Fix `DuplicateDrawingDetectorBlock` — remove numpy, use hashlib

**File**: `packages/block_library/src/mechanical/blocks.py`

**Find and remove this line** (around line 91 inside the `run` method):
```python
import numpy as np
embedding = np.random.rand(128)
```

**Replace the entire `run` method body with**:
```python
    async def run(self, input_data: Any) -> Any:
        import hashlib
        # Collect text + filename to build a document fingerprint
        text = ""
        filename = ""
        for val in input_data.values():
            if isinstance(val, dict) and "text" in val:
                text = val.get("text", "")
                filename = val.get("filename", "")
                break

        fingerprint_source = f"{filename}::{text[:300]}"
        doc_hash = hashlib.sha256(fingerprint_source.encode()).hexdigest()
        short_hash = doc_hash[:12]

        # Check against module-level seen-set (persists for server lifetime)
        is_duplicate = doc_hash in _SEEN_DOCUMENT_HASHES
        _SEEN_DOCUMENT_HASHES.add(doc_hash)

        if is_duplicate:
            print(f"[BLOCK] DuplicateDrawingDetectorBlock: DUPLICATE detected! hash={short_hash}")
            return {"is_duplicate": True, "match_id": short_hash, "max_similarity": 1.0, "engine": "sha256"}
        
        print(f"[BLOCK] DuplicateDrawingDetectorBlock: New document, hash={short_hash}")
        return {"is_duplicate": False, "match_id": None, "max_similarity": 0.0, "doc_hash": short_hash, "engine": "sha256"}
```

**Also add this at the module level** (at the top of `mechanical/blocks.py`, after the imports):
```python
# In-memory duplicate tracking (resets on server restart — acceptable for demo)
_SEEN_DOCUMENT_HASHES: set = set()
```

---

#### S5 — Fix `TeamLeaderRecommenderBlock` to use LLM with real team roster

**File**: `packages/block_library/src/mechanical/blocks.py`

**Replace the entire `run` method body of `TeamLeaderRecommenderBlock` with**:
```python
    async def run(self, input_data: Any) -> Any:
        # Collect context from upstream blocks
        drawing_type = "General Assembly"
        po_number = "Unknown"
        po_value = "Unknown"
        vendor = "Unknown"

        for val in input_data.values():
            if isinstance(val, dict):
                if "drawing_type" in val:
                    drawing_type = val["drawing_type"]
                if "po_number" in val:
                    po_number = val.get("po_number", "Unknown")
                    po_value = str(val.get("total_value", "Unknown"))
                    vendor = val.get("vendor", "Unknown")

        # SEYON team roster — update these names to real SEYON staff for production
        team_roster = [
            {"name": "Arun Kumar",  "role": "Senior Mechanical Lead",  "speciality": "General Assembly, Sub-Assembly"},
            {"name": "Priya Nair",  "role": "Drawing Review Engineer",  "speciality": "Part Drawing, Schematic"},
            {"name": "Suresh Babu", "role": "Procurement Coordinator",  "speciality": "BOM List, PO Verification"},
            {"name": "Meena Raj",   "role": "QA Lead",                  "speciality": "All types — QA sign-off"},
        ]

        try:
            from app.services.llm import LLMService
            import json
            llm = LLMService()
            if llm.client:
                roster_text = "\n".join([f"- {p['name']} ({p['role']}): specialises in {p['speciality']}" for p in team_roster])
                prompt = (
                    f"You are a job allocation coordinator at SEYON Engineering.\n"
                    f"Job details:\n"
                    f"  Drawing type: {drawing_type}\n"
                    f"  PO Number: {po_number}  |  PO Value: {po_value}  |  Vendor: {vendor}\n\n"
                    f"Available team leaders:\n{roster_text}\n\n"
                    f"Select the best-suited team leader for this job and give a brief reason.\n"
                    f"Respond with JSON only, no markdown: "
                    f'{{\"recommended_leader\": \"<full name>\", \"reasoning\": \"<2 sentences max>\", \"available\": true}}'
                )
                response = await llm.chat_completion([{"role": "user", "content": prompt}])
                data = json.loads(response) if isinstance(response, str) else response
                return {
                    "recommended_leader": data.get("recommended_leader", team_roster[0]["name"]),
                    "reasoning": data.get("reasoning", "Selected based on speciality alignment."),
                    "available": True
                }
        except Exception as e:
            print(f"[BLOCK] TeamLeaderRecommenderBlock: LLM failed ({e}), using rule-based fallback")

        # Rule-based fallback — deterministic, no random
        rule_map = {
            "General Assembly": "Arun Kumar",
            "Sub-Assembly": "Arun Kumar",
            "Part Drawing": "Priya Nair",
            "Schematic": "Priya Nair",
            "BOM List": "Suresh Babu",
        }
        leader = rule_map.get(drawing_type, "Meena Raj")
        await asyncio.sleep(0.5)
        return {
            "recommended_leader": leader,
            "reasoning": f"{leader} has the most relevant experience for {drawing_type} document review at SEYON.",
            "available": True
        }
```

---

#### S6 — Verify `apps/api` is in sys.path inside `tasks.py`

**File**: `apps/api/app/core/tasks.py`

**Find the sys.path block** (lines 14–18). It should look like:
```python
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../../.."))
packages_dir = os.path.join(root_dir, "packages")
if packages_dir not in sys.path:
    sys.path.append(packages_dir)
```

**Add these two lines after the existing block** to ensure `app.services.llm` is importable from blocks:
```python
api_dir = os.path.join(root_dir, "apps", "api")
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)
```

**How to verify**: After adding these lines, restart the uvicorn server and trigger a SEYON run. In the terminal, you should see `[BLOCK] OCRBlock: LLM OCR` (not `LLM failed: No module named 'app'`).

---

#### S7 — Fix approve/reject endpoint auth import in `runs.py`

**File**: `apps/api/app/routers/runs.py`

**Run this search**:
```bash
grep -n "get_current_active_user\|get_current_user" apps/api/app/routers/runs.py
```

If you see `get_current_active_user` anywhere, replace every occurrence with `get_current_user`.

The import at the top should read:
```python
from app.auth.dependencies import get_current_user
```

Then every route handler that previously said:
```python
current_user: models.User = Depends(get_current_active_user)
```
Should be changed to:
```python
current_user: models.User = Depends(get_current_user)
```

---

#### S8 — Make the run trigger non-blocking (return `run_id` immediately)

**File**: `apps/api/app/routers/runs.py`

**Find the `trigger_run` POST handler** (around line 16).

**Check**: Does it call `await run_workflow_async(...)` directly, or does it call `execute_workflow_task.delay(...)` (Celery async)?

- If it uses `execute_workflow_task.delay(...)` → it is already non-blocking. You are done.
- If it uses `await run_workflow_async(...)` directly without Celery → it blocks the request.

**If blocking**, the fix is to create the run record first and then launch execution with `asyncio.create_task`:

```python
@router.post("/workflows/{workflow_id}/runs")
async def trigger_run(
    workflow_id: int,
    initial_input: Optional[dict] = None,
    is_sandbox: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Create run record immediately
    from datetime import datetime
    run = models.WorkflowRun(
        workflow_id=workflow_id,
        org_id=current_user.org_id,
        status="running",
        started_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Launch asynchronously — do not await
    from app.core.tasks import run_workflow_async
    asyncio.create_task(
        run_workflow_async(
            workflow_id=workflow_id,
            initial_input=initial_input,
            is_sandbox=is_sandbox,
            org_id=current_user.org_id,
            run_id=run.id
        )
    )

    return {"run_id": run.id, "status": "running", "mode": "background"}
```

---

### Phase 4 Done Criteria

- [ ] Uploading any file from Intake tab starts a run within 2 seconds (no timeout)
- [ ] All 9 pipeline nodes eventually reach `completed` status (no node stays `pending` due to bugs)
- [ ] Vault tab → OCR node output shows text based on the uploaded filename, not hardcoded invoice text
- [ ] Vault tab → Drawing Classifier shows a real category with a reasoning sentence
- [ ] Vault tab → Duplicate Detector shows `is_duplicate: false` on first upload, `true` on second upload of same file
- [ ] Vault tab → Team Leader Recommender shows a real person's name with reasoning
- [ ] Dispatch tab → shows the correct team leader recommendation
- [ ] Dispatch tab → "Confirm Assignment" button successfully calls approve endpoint and shows "Assignment Confirmed"

---

### Phase 4 Not-In-Scope (Save for Later)

- ❌ Real file bytes upload to disk / MinIO
- ❌ PaddleOCR / Tesseract installation  
- ❌ Vector database / real embeddings for duplicate detection
- ❌ XGBoost training pipeline
- ❌ WebSocket real-time push (frontend polling every 2s is sufficient)


---

## Phase 4 â€” Parallel Module Assignment

> **How to use**: Split work across two people working simultaneously.
> Each module has a clear input contract and output contract.
> Merge at the Integration step using the checklist at the bottom.
>
> **Estimated total time**: ~2 hours if both tracks run in parallel.

---

### Dependency Map

```
Track 1A (Data Pipeline)   ---> Track 1B (Mechanical AI Blocks) --->|
                                                                     |--> Integration Test
Track 2  (API Layer Fixes) ----------------------------------------->|
```

- Track 1A and Track 2 can **start at the same time** â€” they touch completely different files.
- Track 1B **must wait** for Track 1A to finish (it reads from OCR output).
- Integration runs last, after all tracks are done.

---

### Track 1A â€” Data Pipeline Foundation

**Owner**: Member J
**Starts**: Immediately
**Estimated time**: 30â€“40 min
**Files touched**:
- `packages/block_library/src/generic/blocks.py`
- `apps/api/app/core/tasks.py`

**Tasks (do in this order)**:

| Task | What to fix | File |
|---|---|---|
| S6 | Add `apps/api` to sys.path in tasks.py | `apps/api/app/core/tasks.py` |
| S1 | `FormInputBlock.run()` â€” forward `initial_input` downstream instead of returning config defaults | `packages/block_library/src/generic/blocks.py` |
| S2 | `OCRBlock.run()` â€” use LLM or filename-based output, never hardcoded invoice text | `packages/block_library/src/generic/blocks.py` |

> **Do S6 before S1/S2** â€” without it, all `from app.services.llm import LLMService` calls inside blocks fail silently with ImportError.

**Output contract â€” OCR output shape (Track 1B reads exactly these keys)**:

```python
# s_ocr node must output this structure. Do NOT rename these keys.
{
    "text": "<string â€” extracted or generated text>",
    "filename": "<string â€” original filename from intake>",
    "metadata": {
        "pages": 1,
        "engine": "<string â€” groq_llm_proxy | filename_mock>",
        "file_type": "<string â€” pdf | png | dxf>"
    }
}
```

**Handoff test â€” run before signalling Track 1B to start**:
```
POST http://localhost:8000/workflows/2/runs
Body: {"initial_input": {"filename": "pump_assembly.pdf", "file_type": "pdf"}}

Then: GET http://localhost:8000/runs/{run_id}
-- Look at node s_ocr -> output_json
PASS: "text" field contains "pump" or "PUMP" (derived from the filename)
FAIL: "text" field contains "INVOICE #INV-2023-001" (still hardcoded mock â€” S2 not applied)
```

---

### Track 1B â€” Mechanical AI Block Upgrades

**Owner**: Member M
**Starts**: After Track 1A handoff test passes
**Estimated time**: 30â€“40 min
**Files touched**: `packages/block_library/src/mechanical/blocks.py` only

**Tasks (can be done in any order within this track)**:

| Task | What to fix | Why |
|---|---|---|
| S4 | `DuplicateDrawingDetectorBlock` â€” remove numpy + random, use hashlib SHA-256 | Prevents crash on servers without numpy; makes dedup deterministic |
| S3 | `DrawingClassifierBlock` â€” replace `random.choice()` fallback with LLM call | Classification is currently random/meaningless |
| S5 | `TeamLeaderRecommenderBlock` â€” replace hardcoded 4-entry dict with LLM call | Only covers 4 drawing types; no AI reasoning |

**Input contracts â€” what these blocks read from upstream node outputs**:

```
Block                           Reads from node    Key(s) it looks for
-------------------------------  -----------------  ----------------------------------------
DrawingClassifierBlock           s_ocr              "text", "filename"
DuplicateDrawingDetectorBlock    s_ocr              "text", "filename"
TeamLeaderRecommenderBlock       s_drawing_cls      "drawing_type"
                                 s_po_extract       "po_number", "total_value", "vendor"
```

> The engine passes ALL upstream node outputs in a single dict keyed by node ID.
> Use `for val in input_data.values()` and check `if "key_name" in val` to find the right output.
> Do NOT use `input_data["s_ocr"]` directly â€” that key may not always exist if the node failed.

**IMPORTANT â€” add this at the TOP of `mechanical/blocks.py` (after imports, before first class)**:

```python
# Module-level in-memory store for duplicate detection
# Resets on server restart â€” acceptable for demo purposes
_SEEN_DOCUMENT_HASHES: set = set()
```

**Output contracts â€” what Vault and Dispatch tabs read**:

```python
# DrawingClassifierBlock must output:
{
    "drawing_type": "<one of: General Assembly | Sub-Assembly | Part Drawing | Schematic | BOM List>",
    "confidence": <float between 0 and 1>,
    "metadata": { "reason": "<string>", "engine": "<groq_llm | keyword_fallback>" }
}

# DuplicateDrawingDetectorBlock must output:
{
    "is_duplicate": <True | False>,
    "match_id": "<12-char hash string if duplicate, else null>",
    "max_similarity": <1.0 if duplicate, 0.0 if not>,
    "engine": "sha256"
}

# TeamLeaderRecommenderBlock must output:
{
    "recommended_leader": "<full name from roster>",
    "reasoning": "<2 sentences explaining why>",
    "available": True
}
```

**Track 1B done when (verify in Vault tab after a run)**:
- `s_drawing_cls` output: `drawing_type` is consistent (not random) and `engine` is `groq_llm` or `keyword_fallback`
- `s_dup_detect` output: `engine` is `"sha256"` (not `"siamese_cnn_v4"`)
- `s_recommender` output: `recommended_leader` is a real name, not `"Senior Engineer (Default)"`

---

### Track 2 â€” API Layer Fixes

**Owner**: Either member (fully independent)
**Starts**: Immediately â€” does not depend on Track 1 at all
**Estimated time**: 20â€“30 min
**Files touched**: `apps/api/app/routers/runs.py` only

**Tasks**:

| Task | What to fix |
|---|---|
| S7 | Search for `get_current_active_user` in runs.py and replace with `get_current_user` |
| S8 | Make `trigger_run` endpoint return `run_id` immediately instead of waiting for full execution |

**How to check if S7 is needed (run this first â€” takes 5 seconds)**:
```bash
grep -n "get_current_active_user" apps/api/app/routers/runs.py
```
- Empty output? S7 is already fine â€” skip it.
- Lines printed? Replace every occurrence with `get_current_user`. The correct import is:
  `from app.auth.dependencies import get_current_user`

**How to check if S8 is needed**:
Open `apps/api/app/routers/runs.py` and find the `trigger_run` function.
Look for one of these patterns in the function body:

```python
# ALREADY FINE â€” S8 not needed:
execute_workflow_task.delay(...)
asyncio.create_task(run_workflow_async(...))

# NEEDS FIX â€” apply S8 from the task description above:
return await run_workflow_async(...)
asyncio.run(run_workflow_async(...))
```

**Output contract (what the Intake tab frontend expects)**:
```json
{ "run_id": 42, "status": "running", "mode": "background" }
```
This response must arrive within 2 seconds. The frontend immediately starts polling `GET /runs/{run_id}` every 2 seconds to update the node status indicators.

**Track 2 done when**:
```bash
# Time how long the POST takes:
curl -X POST "http://localhost:8000/workflows/2/runs" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"initial_input\": {\"filename\": \"test.pdf\"}}" \
  -w "\nTotal time: %{time_total}s\n"

# PASS: response arrives in under 2 seconds with run_id in body
# FAIL: request hangs for 10+ seconds (workflow running synchronously)
```

---

### Integration Step â€” After All Tracks Complete

**Owner**: Both members together
**Estimated time**: 30 min
**Prerequisite**: Track 1A done AND Track 1B done AND Track 2 done

**Step 1 â€” Merge branches (if using git branches)**:
```bash
git checkout main
git merge feature/track-1a
git merge feature/track-1b
git merge feature/track-2
```

**Step 2 â€” Restart the backend** (essential â€” picks up all Python changes):
```bash
cd apps/api
.\.venv\Scripts\uvicorn.exe app.main:app --reload
```

**Step 3 â€” Run the full SEYON end-to-end checklist**:

| # | Action | Where to look | Pass condition |
|---|---|---|---|
| 1 | Open `http://localhost:3000/seyon` | Browser | Page loads, SEYON Portal header visible |
| 2 | Click Intake tab | Browser | Drop zone visible |
| 3 | Drop any PDF or PNG file | Browser | Filename appears in drop zone |
| 4 | Click "Run AI Processing" | Browser | Button changes to Processing in under 2 seconds |
| 5 | Watch 9 pipeline nodes | Browser (Intake tab) | All 9 nodes tick to green checkmark |
| 6 | Vault tab â†’ select run â†’ click OCR node | Browser (Vault tab) | `text` field has filename in it, NOT "INVOICE #INV-2023-001" |
| 7 | Vault â†’ Drawing Classifier node | Browser | `drawing_type` is a real category; same value if you run same file again |
| 8 | Vault â†’ Duplicate Detector node | Browser | `engine` is `"sha256"`, `is_duplicate` is false |
| 9 | Upload the SAME file again, complete the run | Browser | Second run finishes |
| 10 | Check second run Vault â†’ Duplicate Detector | Browser | `is_duplicate` is now true |
| 11 | Dispatch tab â†’ select first run | Browser | Team member name shown with 2-sentence reasoning |
| 12 | Click Confirm Assignment | Browser | "Assignment Confirmed" message appears (no 500 error) |

**If any step fails**: Check the uvicorn terminal. Every block logs `[BLOCK] <ClassName>.run |` and every engine event logs `[PATHFINDER]`. The failing node ID and error will be printed clearly.

---

### Module Ownership Quick Reference

| Module | Owner | Files changed | Can start | Delivers to next step |
|---|---|---|---|---|
| **Track 1A** â€” Data Pipeline | Member J | `generic/blocks.py`, `tasks.py` | Immediately | OCR output with real filename-based text |
| **Track 1B** â€” Mechanical AI Blocks | Member M | `mechanical/blocks.py` | After 1A handoff | LLM classifier, hashlib dedup, LLM recommender |
| **Track 2** â€” API Layer | Either | `routers/runs.py` | Immediately | Non-blocking trigger, working approve endpoint |
| **Integration** | Both | None | After all 3 tracks | SEYON demo fully working end-to-end |

---

### Working Alone? Single-Person Order

If only one person is available, complete tasks in this order (total ~90 min):

```
S6  (5 min)  â€” Fix sys.path in tasks.py
S1  (5 min)  â€” Fix FormInputBlock
S2  (15 min) â€” Fix OCRBlock
S7  (5 min)  â€” Check/fix approve endpoint import
S8  (15 min) â€” Check/fix run trigger blocking
S4  (10 min) â€” Fix DuplicateDetector (remove numpy)
S3  (15 min) â€” Fix DrawingClassifier (add LLM)
S5  (15 min) â€” Fix TeamLeaderRecommender (add LLM)
Integration test (30 min)
```
