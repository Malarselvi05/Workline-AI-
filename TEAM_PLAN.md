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
- [ ] Add `domain_packs` table: id, org_id, name, status (installed/available)
- [ ] `GET /packs` → list available packs per org
- [ ] `POST /packs/{name}/install` · `POST /packs/{name}/uninstall`
- [ ] Domain Pack Manager page: grid of packs with Install/Uninstall button
- [ ] On install: mechanical blocks appear in canvas palette under "Domain Packs" toggle

#### M10 — CI/CD + Performance (Full-Stack)
- [ ] GitHub Actions CI: lint + type-check + pytest on every PR (both `apps/api` and `apps/web`)
- [ ] Benchmark test: `POST /plan` must respond < 5s; engine must execute 3-node workflow < 2s
- [ ] Test: DB-level `UPDATE` on `audit_logs` is rejected (proves append-only)
- [ ] `docs/architecture/` — brief ADR documents for key decisions (LiteLLM choice, multi-tenancy approach)

#### M11 — UI Polish + Accessibility
- [ ] Mobile: canvas shows graceful degradation message on screens < 1024px; dashboard + results are fully responsive
- [ ] Sidebar collapses to icon-only on < 1024px
- [ ] Keyboard navigation for all modals and menus
- [ ] Loading skeletons for all data-fetching sections
- [ ] Empty states: no workflows · no runs · no drift alerts
- [ ] Error boundaries around canvas, chatbot, dashboard
- [ ] Dark mode toggle (Tailwind `dark:` already configured from scaffold)

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
