# WorkLine AI Implementation Evaluation
> **Author**: Antigravity (AI Teammate)
> **Status**: Deep Analysis of Phases 1, 2, and 3
> **Legend**: ✅ Done | 🔄 In Progress | ❌ Pending

---

## 🟦 Phase 1: Core MVP (Create → Test → Deploy)
**Objective**: Enable a non-technical user to go from a business goal to a deployed, version-controlled workflow.

### Feature 1: AI Planner & Chatbot (Member J)
*   **Use Case**: User types "Classify all incoming POs and notify the team lead" in the chatbot panel.
*   **Test Case**: Send the prompt, wait for the AI response, and inspect the reasoning accordion.
*   **Expected Output**: 
    1.  A valid JSON DAG containing `file_upload`, `ocr`, `po_extractor`, `classify`, and `notify` blocks.
    2.  Graph correctly auto-layouted on the canvas (x-gap 260px, y-gap 160px).
    3.  `Conversation` and `ConversationTurn` records created in the database.
*   **Failure Conditions**:
    1.  **LLM Timeout/HAL**: Groq API key missing or invalid.
    2.  **Validation Error**: LLM proposes a block type not in `BLOCK_REGISTRY` (e.g., `email_sender` instead of `notify`).
    3.  **Graph Cycle**: LLM produces a circular dependency (e.g., A -> B -> A).
    4.  **Layout Failure**: Disconnected nodes resulting in overlapping coordinates.

### Feature 2: Canvas UI & Interactions (Member J)
*   **Use Case**: User manually edits the AI-proposed graph before saving.
*   **Test Case**: Drag a new `Human Review` block onto the canvas, connect it between `OCR` and `Classify`, and click "Save".
*   **Expected Output**: 
    1.  Zustand `canvasStore` updates state correctly.
    2.  `POST /workflows` successfully creates a new record in `workflows`, `workflow_nodes`, and `workflow_edges`.
    3.  A new sidebar tab appears for the workflow.
*   **Failure Conditions**:
    1.  **Dangling Edges**: User deletes a node but the edge remains in local state (prevented by React Flow, but check store consistency).
    2.  **Duplicate IDs**: Multiple nodes with the same string ID (e.g., `"node_1"`).

### Feature 3: Infrastructure, Auth & CRUD (Member M)
*   **Use Case**: Ensure multi-tenancy and data security across the platform.
*   **Test Case**: Log in as `Member J` and attempt to access a workflow belonging to `Org 2`.
*   **Expected Output**: 
    1.  JWT token contains `org_id`.
    2.  SQLAlchemy event listener (M1) automatically filters all queries by the logged-in user's `org_id`.
    3.  FastAPI returns `404 Not Found` for cross-org access.
*   **Failure Conditions**:
    1.  **Missing `org_id` Filter**: A query is executed without the filter, leaking data.
    2.  **Audit Log Mutation**: An attempt to `UPDATE` or `DELETE` from `audit_logs` should be rejected by the database (PostgreSQL level).

### Feature 4: Execution Engine (Member M)
*   **Use Case**: Trigger a workflow run and monitor progress in real-time.
*   **Test Case**: Click "Simulate" on the canvas.
*   **Expected Output**: 
    1.  `WorkflowRun` status set to `running`.
    2.  WebSocket (`WS /ws/runs/{run_id}`) emits status updates: `pending` → `running` → `completed`.
    3.  Nodes on canvas show ⚙️ and ✅ icons live.
*   **Failure Conditions**:
    1.  **Worker Downtime**: Celery workers not running (app should fallback to synchronous execution or show "queued").
    2.  **Dependency Failure**: Downstream nodes marked `skipped` if an upstream node fails.

---

## 🟧 Phase 2: Advanced Features (Human-in-the-Loop & Drift)
**Objective**: Handle complex decision points, version history, and model performance monitoring.

### Feature 5: Human Review Flow (Member M)
*   **Use Case**: A workflow requires manual approval for sensitive data extraction.
*   **Test Case**: Execute a workflow with a `HumanReviewBlock`.
*   **Expected Output**:  
    1.  Execution pauses at the `human_review` node.
    2.  `WorkflowRun` status becomes `awaiting_review`.
    3.  Workspace WebSocket fires a notification; Sidebar tab shows an "Awaiting Review" badge.
*   **Failure Conditions**:
    1.  **Concurrency Issues**: Two users attempt to approve/reject the same run simultaneously.
    2.  **Stale WS Connections**: UI fails to show the approval panel if the connection drops.

### Feature 6: Versioning & Rollback (Member M)
*   **Use Case**: User breaks a workflow and needs to revert to a previous working state.
*   **Test Case**: Deploy Version 2, then click "Rollback" to Version 1 in the Settings tab.
*   **Expected Output**: 
    1.  New `Workflow` record created (Version 3) with `parent_version_id` pointing to Version 2.
    2.  Nodes and Edges exactly match Version 1.
    3.  Audit log reflects the rollback action.
*   **Failure Conditions**:
    1.  **Broken Lineage**: `parent_version_id` link is broken or null.
    2.  **Partial Copy**: Some nodes or edges fail to copy, resulting in a broken graph.

### Feature 7: Dashboard & Drift Detection (Member J)
*   **Use Case**: Admin monitors system health and model accuracy.
*   **Test Case**: View the dashboard cards; trigger enough runs to fire a simulated drift alert.
*   **Expected Output**: 
    1.  KPI cards (Total Runs, Success Rate) update via Tanstack Query every 30s.
    2.  `DriftAlert` record appears in the UI when KL divergence exceeds 0.15.
*   **Failure Conditions**:
    1.  **Mock Data Bias**: UI shows static mock data instead of real API values (J5/J6 pending real wiring).
    2.  **Metric Calculation Overload**: Heavy embedding computations slowing down the Celery worker.

---

## 🟨 Phase 3: Platform Hardening (Triggers & On-Prem)
**Objective**: Production readiness, local privacy, and CI/CD stability.

### Feature 8: Scheduled Triggers (Member J)
*   **Use Case**: User wants a daily summary of all processed documents at 9:00 AM.
*   **Test Case**: Set a cron expression `0 9 * * *` in the Schedule Panel.
*   **Expected Output**: 
    1.  `ScheduledTrigger` record created in DB.
    2.  Celery Beat dynamically registers the task.
    3.  `next_run_at` is correctly calculated and displayed **Failure Conditions**:
    1.  **Invalid Cron**: User enters `* * * 100 *`, resulting in a backend validation error (should be handled in `SchedulesRouter`).
    2.  **Duplicate Registration**: Multiple beat jobs for the same workflow id.

### Feature 9: On-Prem Mode (Member J)
*   **Use Case**: Client requires 100% data privacy with no external API calls.
*   **Test Case**: Set `WORKLINE_MODE=onprem` and run the stack using `docker-compose.onprem.yml`.
*   **Expected Output**: 
    1.  Planner uses `Ollama` (llama3.2:3b) instead of Groq.
    2.  Embeddings use local `BGE TEI` server.
    3.  All external LLM SDK calls are bypassed.
*   **Failure Conditions**:
    1.  **Resource Exhaustion**: Local GPU/CPU unable to handle the LLM model size.
    2.  **API Incompatibility**: Ollama response format (non-standard JSON) breaking the `_parse_and_validate` logic.

---

## 🧐 Teammate's Deep Analysis: "Every Minute Thing"

1.  **Topological Sort (Kahn's Algorithm)**: 
    *   *Analysis*: Found in `planner.py` (`_validate_dag` and `_compute_layout`). It's implemented using `deque` and `in_degree` counts. This is mathematically sound for DAG validation.
    *   *Edge Case*: A disconnected node (0 edges) will be correctly handled by BFS and level-assigned to column 0.

2.  **DB Multi-Tenancy**: 
    *   *Analysis*: `org_id` is a nullable foreign key in most tables. While the `CONTEXT.md` mentions a "SQLAlchemy event listener," I've verified `models.py` has the schema ready. The key "minute detail" is ensuring the interceptor in `session.py` is active.

3.  **Deployment Logic**: 
    *   *Analysis*: `deploy_workflow` in `workflows.py` archives "versions of the same name." This implies `name` is the unique identifier for a workflow "lineage."
    *   *Risk*: If a user renames a workflow, the archive logic might fail to target previous versions.

4.  **WebSocket Scalability**: 
    *   *Analysis*: Redis Pub/Sub is used for real-time status. Each run has its own channel (`run_status:{run_id}`).
    *   *Minute Detail*: `run_workflow_async` publishes to both the run-specific channel AND the workspace channel. This is optimal for UI reactivity.

5.  **Alembic Hygiene**:
    *   *Analysis*: All migrations are tracked and stamped. The logic for composite primary keys in `WorkflowEdge` (workflow_id + node_id) ensures data integrity at the DB level, preventing cross-workflow edges.

---

## 📜 Manual Checklist for USER
- [ ] **Auth**: Login → Token Refresh → Access Protected Route.
- [ ] **AI**: Input Goal → Check Reasoning Accordion → Apply to Canvas.
- [ ] **Execution**: Click Simulate → Observe Live Status Icons → Check Run Logs.
- [ ] **Versioning**: Deploy → Modify → Deploy Again → View History → Rollback.
- [ ] **Scheduling**: Set Cron → Wait 1 min (with modified beat schedule) → Check if Run started.
- [ ] **On-Prem**: Disconnect internet → Run Stack → Confirm Planner still works.

---
*End of Evaluation Document*
