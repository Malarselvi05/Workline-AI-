# Workline AI: Workflow Engine & Infrastructure Engineer Study Guide

This document is your master study plan and technical defense guide. It is specifically tailored to your role as the **Workflow Engine & Infrastructure Engineer (Role #4)** for Workline AI. Use this guide to prepare for judge evaluations, understand the exact inner workings of the codebase, and confidently explain the *What*, *Why*, and *How* of your infrastructure.

---

## 1. Project Overview: What, Why, and How

### What is Workline AI?
Workline AI is an enterprise-grade, AI-powered workflow automation platform designed specifically for engineering and operational environments (such as SEYON Engineering). It allows non-technical users to convert conversational goals into fully automated, multi-step document processing pipelines (Directed Acyclic Graphs).

### Why does it exist?
Traditional enterprise workflows require heavy developer intervention to build, deploy, and maintain. Workline AI democratizes this process by combining an LLM-driven planning assistant with a robust, deterministic execution engine. It automates complex engineering intake tasks—such as extracting Bill of Materials (BOM) from CAD drawings, classifying mechanical assemblies, detecting duplicate submissions, and intelligently assigning tasks to team leaders—saving thousands of hours of manual triage.

### How does it work? (Macro Flow)
1. **Intake & Planning**: A user uploads a document or states a goal in the Next.js frontend. An AI Planner (`llama-3.3-70b`) translates this into a valid DAG based on 21 predefined building blocks.
2. **Orchestration**: Once deployed, triggering a workflow dispatches an asynchronous execution run via **FastAPI**, **Celery**, and **Redis**.
3. **Execution**: The custom `WorkflowEngine` executes the graph topologically, running independent tasks in parallel while handling conditional branching, AI inference, and human-in-the-loop pauses.
4. **Real-time Feedback**: As nodes execute, live state updates are broadcast over **Redis Pub/Sub** to **WebSockets**, instantly updating the frontend canvas and operations portal.

---

## 2. Master Checklist: Files & Modules to Study

To master your role before the evaluation, review the following core files in the monorepo. Every file listed below directly impacts your domain (Execution Engine, Background Tasks, and Deployment).

```
Workline-AI/
├── apps/api/app/core/
│   ├── celery_app.py        👉 Celery worker init, Redis broker configuration, task routing.
│   ├── tasks.py             👉 Celery task wrappers (`execute_workflow_task`), DB state tracking, Redis pub/sub emitting.
│   └── scheduler.py         👉 Dynamic Celery Beat scheduling for cron-based workflow triggers.
│
├── apps/api/app/routers/
│   ├── runs.py              👉 REST endpoints for triggering runs (`POST /workflows/{id}/runs`), pausing/resuming, and cancelling.
│   └── ws.py                👉 WebSocket server streaming live Redis pub/sub events (`/ws/runs/{run_id}`).
│
├── packages/workflow_engine/
│   └── engine.py            👉 The core DAG execution engine: Kahn's algorithm, topological sorting, parallel execution, resumption logic.
│
└── infra/docker/
    ├── docker-compose.yml         👉 Production/Cloud deployment orchestration (FastAPI, Postgres, Redis, MinIO).
    └── docker-compose.onprem.yml  👉 Air-gapped On-Premises deployment orchestration (Ollama, BGE TEI, MinIO).
```

### 📋 Step-by-Step Study Checklist
- [ ] **`packages/workflow_engine/engine.py`**: Understand how `__init__` calculates `in_degree` and `adj` (adjacency lists). Review the `execute()` method to see how `asyncio.gather` processes waves of independent nodes simultaneously.
- [ ] **`apps/api/app/core/tasks.py`**: Trace `run_workflow_async`. Look at how `models.WorkflowRun` and `models.RunNodeState` are created, how `on_status_change` publishes to Redis, and how `sys.path` is modified to import monorepo packages.
- [ ] **`apps/api/app/core/celery_app.py`**: Check the `Celery` instantiation, `broker` / `backend` settings pointing to `REDIS_URL`, and task route mappings (`main-queue`).
- [ ] **`apps/api/app/routers/runs.py`**: Examine `trigger_run()`. Understand the difference between blocking synchronous execution and non-blocking background task dispatching.
- [ ] **`infra/docker/docker-compose.yml`**: Review the service definitions, environment variables, volume mounts, and network bridges connecting FastAPI, PostgreSQL, Redis, and MinIO.

---

## 3. Tech Stack Defense (Judge Q&A Prep)

Judges will test your architectural comprehension by asking why specific technologies were chosen over alternatives. Here is your definitive defense for each layer of your infrastructure.

### ❓ Why Celery + Redis for Background Tasks?
* **Judge Question**: *"Why did you use Celery and Redis instead of standard FastAPI `BackgroundTasks` or `asyncio`?"*
* **Your Defense**: 
  > "Standard `asyncio` or FastAPI `BackgroundTasks` execute inside the same event loop and memory space as the API server. In an enterprise workflow engine, long-running AI inference tasks, OCR extraction, or heavy data processing would block the main API thread, leading to HTTP timeouts and degraded user experience. Furthermore, in-memory background tasks are lost if the API pod restarts. 
  > 
  > By introducing **Celery** as a distributed task queue and **Redis** as a lightning-fast, in-memory message broker, we fully decouple API ingestion from workflow execution. This provides **horizontal scalability** (we can spin up dozens of isolated Celery worker containers to handle heavy workflow loads independently of the API), **fault tolerance** (unacknowledged tasks are preserved in Redis if a worker crashes), and **advanced scheduling** via Celery Beat."

### ❓ Why Directed Acyclic Graphs (DAGs) for the Engine?
* **Judge Question**: *"Why did you build a custom DAG workflow engine instead of a simple linear script or chaining functions?"*
* **Your Defense**:
  > "Enterprise workflows are rarely linear; they require complex conditional branching (e.g., routing high-value purchase orders to a Director while auto-approving standard orders), parallel processing, and human-in-the-loop checkpoints. A linear script cannot represent these topologies efficiently.
  > 
  > We implemented a **Directed Acyclic Graph (DAG)** model governed by **Kahn’s Algorithm for Topological Sorting**. By tracking the `in_degree` (number of prerequisite dependencies) of each node, our engine automatically identifies independent branches and executes them concurrently using `asyncio.gather`. This drastically reduces overall workflow execution time. Additionally, the DAG mathematical model guarantees the absence of circular dependencies (infinite loops), ensuring deterministic, predictable execution."

### ❓ Why Docker & Multi-Environment Compose?
* **Judge Question**: *"How does your Docker deployment strategy handle enterprise security and environment parity?"*
* **Your Defense**:
  > "We utilize Docker and Docker Compose to guarantee absolute environment parity across development, staging, and production, eliminating 'it works on my machine' discrepancies. 
  > 
  > More importantly, our deployment architecture is specifically tailored to enterprise security requirements. We designed a dual-compose strategy: `docker-compose.yml` orchestrates our cloud-first architecture utilizing external LLM APIs (Groq/LiteLLM), while `docker-compose.onprem.yml` orchestrates a completely **air-gapped, on-premises environment**. In on-prem mode, Docker spins up local **Ollama** containers for LLM inference, local **BGE Text Embedding** servers, and **MinIO** for S3-compatible object storage. This ensures zero external network calls, allowing highly regulated clients (such as defense or healthcare contractors) to maintain absolute data privacy."

### ❓ Why FastAPI & PostgreSQL?
* **Judge Question**: *"What makes FastAPI and PostgreSQL the right choice for the core backend?"*
* **Your Defense**:
  > "**FastAPI** was selected because it is built natively on ASGI (`starlette` / `asyncio`), providing near-Node.js/Go throughput for I/O-bound API operations. Its seamless integration with Pydantic gives us automatic request validation and OpenAPI documentation out of the box.
  > 
  > **PostgreSQL** is our primary persistent store because enterprise automation requires strict ACID compliance, relational integrity for audit trails, and robust concurrent transaction handling. We leverage SQLAlchemy ORM combined with Alembic migrations for schema evolution, and we implemented an ORM-level event listener that automatically appends `org_id` filters to all queries, guaranteeing bulletproof **multi-tenant data isolation** at the database level."

---

## 4. Architectural Diagrams

### 🗺️ High-Level System Architecture
This diagram illustrates the macro data flow from the client browser through the API gateway, task queue, execution workers, and storage layers.

```
+-----------------------------------------------------------------------------------+
|                               NEXT.JS 14 FRONTEND                                 |
|         (Operations Portal / Interactive Canvas / Real-time Status Overlay)       |
+-----------------------------------------------------------------------------------+
        |                                                 ^
        | 1. POST /workflows/{id}/runs                    | 6. Live Status Broadcast
        |    (Trigger Workflow)                           |    via WebSockets
        v                                                 |
+-----------------------------------------------------------------------------------+
|                             FASTAPI APPLICATION GATEWAY                           |
|         (Auth Interceptors / Workflow CRUD / Pydantic Schema Validation)          |
+-----------------------------------------------------------------------------------+
        |                                                 ^
        | 2. execute_workflow_task.delay()                | 5. Publish Event
        |    (Dispatch Task)                              |    (run_status:{id})
        v                                                 |
+-----------------------------------------------------------------------------------+
|                                 REDIS BROKER                                      |
|            (Celery Task Queue / In-Memory Pub-Sub / WebSocket Bridge)             |
+-----------------------------------------------------------------------------------+
        |                                                 ^
        | 3. Consume Task                                 | 4. Emit Node State
        v                                                 |
+-----------------------------------------------------------------------------------+
|                              CELERY WORKER INSTANCE                               |
|                                                                                   |
|     +-----------------------------------------------------------------------+     |
|     |                       CUSTOM WORKFLOW ENGINE                          |     |
|     |                                                                       |     |
|     |   [Wave 1: Input] ---> [Wave 2: OCR / Classify] ---> [Wave 3: Decide] |     |
|     |   (asyncio.gather parallel execution based on Topological In-Degree)  |     |
|     +-----------------------------------------------------------------------+     |
+-----------------------------------------------------------------------------------+
        |                                                 |
        | Read/Write State & Audit Logs                   | Read/Write Files & Blobs
        v                                                 v
+---------------------------------------+       +-----------------------------------+
|         POSTGRESQL 16 DATABASE        |       |          MINIO OBJECT STORE       |
|  (Multi-tenant ORM / RunNodeStates)   |       |   (S3-Compatible Document Vault)  |
+---------------------------------------+       +-----------------------------------+
```

---

### 🔍 Low-Level DAG Execution & Pub/Sub Mechanics
This diagram breaks down the internal mechanics of `packages/workflow_engine/engine.py` and `apps/api/app/core/tasks.py`.

```
=====================================================================================
                   LOW-LEVEL DAG EXECUTION & PUB/SUB MECHANICS
=====================================================================================

[ CELERY WORKER: execute_workflow_task ]
   │
   ▼
[ 1. DB State Initialization ]
   ├─ Create models.WorkflowRun (status="running")
   └─ Create models.RunNodeState for all nodes (status="pending")
   │
   ▼
[ 2. Engine Initialization (engine.py) ]
   ├─ Build Adjacency List (adj: source -> target)
   ├─ Compute Dependency In-Degree (in_degree: target -> count)
   └─ CRITICAL RESUMPTION STEP: Pre-reduce in_degree for already completed nodes
   │
   ▼
[ 3. Topological Wave Execution Loop ]
   │
   ├─► Filter Queue: Select all nodes where in_degree == 0
   │
   ├─► Launch Wave: asyncio.gather(process_node(node_1), process_node(node_2))
   │     │
   │     ├─► Block Execution: block.run(node_outputs)
   │     │     │
   │     │     ├─► Case A: Success -> output generated
   │     │     └─► Case B: Human Review -> raise waiting_for_human -> PAUSE ENGINE
   │     │
   │     └─► Emit Status Callback (on_status_change)
   │           │
   │           ├─► Update DB: RunNodeState.status = "completed" | "running"
   │           └─► Publish Redis Pub/Sub: redis.publish("run_status:{run_id}", payload)
   │                 │
   │                 └─► [ FastAPI WebSocket Server (ws.py) ]
   │                       └─► Stream JSON to Next.js Client -> Update Canvas Badge
   │
   └─► Propagate & Prune:
         ├─ Check conditional edges (condition_true / condition_false)
         ├─ Prune skipped branches (mark downstream nodes "skipped")
         └─ Decrement neighbor in_degree (in_degree[neighbor] -= 1)
         │
         └─► Loop back to Step 3 until Queue is empty or Engine Pauses.
```

---

## 5. Key Engineering Challenges & Solutions

When defending your project, judges want to hear about real technical hurdles you faced and how you solved them. Here are five major engineering challenges in your domain and the exact architectural solutions implemented in the codebase.

### ⚠️ Challenge 1: DAG Resumption & State Stalling After Human Review
* **The Problem**: When a workflow reached a `HumanReviewBlock`, the engine correctly paused execution and marked the run as `awaiting_review`. However, when an administrator clicked "Confirm Assignment" to resume the run, the engine would re-initialize the graph but immediately stall. The execution queue remained empty, and downstream nodes never ran.
* **The Root Cause**: Kahn’s algorithm relies on `in_degree == 0` to add nodes to the execution queue. When resuming, upstream nodes (like OCR or Classification) were already completed, but the engine initialization logic was calculating `in_degree` based on the raw edges. Because the completed parent nodes were skipped, they never fired the propagation logic to decrement their children's `in_degree`. Thus, downstream nodes remained at `in_degree = 1`, preventing them from entering the execution queue.
* **The Solution**: We implemented a **resumption pre-reduction pass** inside `WorkflowEngine.__init__`. Before execution starts, the engine iterates over `completed_node_ids`. For every completed node, it identifies its target neighbors in the adjacency list and explicitly decrements their `in_degree`. This correctly resets the boundary nodes to `in_degree = 0`, allowing the engine to seamlessly resume execution exactly where it left off.
```python
# The exact fix in packages/workflow_engine/engine.py
for nid in self.completed_node_ids:
    for neighbor in self.adj.get(nid, []):
        if neighbor in self.in_degree:
            self.in_degree[neighbor] -= 1
            print(f"[ENGINE_RESUME] Pre-reduced in_degree for {neighbor}")
```

### ⚠️ Challenge 2: Real-time UI Sync & Pub/Sub Race Conditions
* **The Problem**: During parallel node execution, the Next.js frontend occasionally failed to update node status badges, leaving completed nodes spinning indefinitely as "running" on the canvas.
* **The Root Cause**: If the frontend polled the REST API for run status, it suffered from polling latency. If we used direct WebSocket connections handled by individual FastAPI worker threads, horizontal scaling broke down—a Celery worker processing a task on Server B had no way to push WebSocket frames to a user connected to Server A.
* **The Solution**: We implemented a decoupled **Redis Pub/Sub broadcast pattern**. When `WorkflowEngine` executes a node, it fires `on_status_change()`. This function simultaneously commits the state to PostgreSQL and publishes a JSON event string to a Redis channel named `run_status:{run_id}`. The FastAPI WebSocket endpoint (`/ws/runs/{run_id}`) acts purely as a Redis subscriber, instantly streaming incoming messages to the client browser regardless of which Celery worker executed the task.

### ⚠️ Challenge 3: Monorepo Package Resolution & Worker Isolation
* **The Problem**: When Celery workers attempted to execute blocks containing AI logic, tasks failed instantly with `ImportError: No module named 'app'`.
* **The Root Cause**: In our Turborepo monorepo, `apps/api/` and `packages/block_library/` reside in separate directory trees. When Celery executed `tasks.py` inside the `apps/api` context, the Python interpreter's `sys.path` did not include the root directory or the `apps/api` directory itself, preventing standalone packages from importing API services like `app.services.llm`.
* **The Solution**: We engineered a dynamic `sys.path` bootstrapping sequence directly at the top of `apps/api/app/core/tasks.py`. This dynamically resolves the absolute path to the monorepo root, injecting both `packages/` and `apps/api/` into the Python path before any task executes.
```python
# The exact fix in apps/api/app/core/tasks.py
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../../.."))
packages_dir = os.path.join(root_dir, "packages")
api_dir = os.path.join(root_dir, "apps", "api")

if packages_dir not in sys.path: sys.path.append(packages_dir)
if api_dir not in sys.path: sys.path.insert(0, api_dir)
```

### ⚠️ Challenge 4: Dynamic Cron Scheduling in Celery Beat
* **The Problem**: Standard Celery Beat requires static schedule definitions hardcoded into `celery_app.conf.beat_schedule` at startup. However, Workline AI users need to dynamically create, update, and delete workflow schedules (e.g., "Run Intake every Monday at 9 AM") from the frontend UI without restarting the backend servers.
* **The Root Cause**: Celery Beat does not natively poll the database for schedule changes in real-time when using the default persistent scheduler.
* **The Solution**: We built a dynamic scheduling manager in `apps/api/app/core/scheduler.py`. When a user modifies a schedule via `PUT /workflows/{id}/schedule`, the API updates the `scheduled_triggers` table in PostgreSQL and immediately mutates the live `celery_app.conf.beat_schedule` dictionary in memory. To ensure persistence across restarts, we implemented a startup seeder (`restore_schedules_from_db`) that runs during worker initialization to reconstruct the in-memory beat schedule directly from active database rows.

### ⚠️ Challenge 5: Blocking vs. Non-Blocking Task Triggers
* **The Problem**: When users clicked "Run AI Processing" on large document intake workflows, the frontend UI would freeze or time out with an HTTP 504 error.
* **The Root Cause**: The original `POST /workflows/{id}/runs` endpoint was calling `await run_workflow_async(...)` directly inside the request handler. Because document processing, OCR, and LLM classification take 10–15 seconds, the HTTP request remained open and blocked the server thread until the entire workflow completed.
* **The Solution**: We refactored the route to be strictly **non-blocking**. The endpoint now creates the `models.WorkflowRun` row in PostgreSQL instantly, commits it to get a valid `run_id`, and immediately hands off execution to the background using `asyncio.create_task` (or Celery's `execute_workflow_task.delay()`). The API returns `{"run_id": 42, "status": "running"}` in under 200 milliseconds, allowing the frontend to gracefully transition to a real-time WebSocket listening state.

---

## 6. Summary for Judges: Your 60-Second Elevator Pitch

If a judge asks you to summarize your contribution, use this exact pitch:

> "As the Workflow Engine & Infrastructure Engineer, I architected the asynchronous execution backbone of Workline AI. I designed a distributed orchestration layer utilizing **FastAPI**, **Celery**, and **Redis** to completely decouple API ingestion from heavy AI workflow processing. 
> 
> At the core of the platform, I implemented a custom **Directed Acyclic Graph (DAG)** engine powered by Kahn’s algorithm. This engine evaluates dependency `in_degree` to execute independent workflow branches in parallel, while supporting advanced features like conditional edge routing, human-in-the-loop pauses, and seamless state resumption. To provide a flawless user experience, I engineered a **Redis Pub/Sub** broadcasting system that streams sub-second node execution states directly to frontend **WebSockets**. Finally, I established an enterprise-grade **Docker Compose** infrastructure supporting both cloud-first LLM orchestration and completely air-gapped, on-premises deployments."
