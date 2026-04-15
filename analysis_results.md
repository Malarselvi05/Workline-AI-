# WorkLine AI: Project Deep Analysis

This document provides a comprehensive analysis of the **WorkLine AI** platform as it stands in v0.4.0-alpha. 

## 🏗️ Architecture & Technical Stack

The project is built as a highly modular monorepo using **Turborepo**, ensuring consistency across the frontend, backend, and shared packages.

### Backend (apps/api)
- **Framework**: FastAPI (Python 3.11+). Chosen for its high performance, asynchronous support, and native Pydantic validation.
- **ORM**: SQLAlchemy with **Alembic** for migrations. Fully multi-tenant at the ORM layer.
- **Task Queue**: **Celery + Redis**. Handles long-running AI tasks and scheduled triggers.
- **Storage**: **MinIO** (S3-compatible) for document storage, ensuring scalability.

### Frontend (apps/web)
- **Framework**: Next.js 14 (App Router).
- **State Management**: **Zustand**. Used for the complex canvas state, chat history, and workspace navigation.
- **Workflow UI**: **React Flow**. A high-performance library for the interactive DAG canvas.
- **Styling**: Tailwind CSS with ShadCN for a premium, modern look.

### Shared Logic (packages/)
- **`shared-types`**: The "single source of truth" for 21 block types and API schemas, used by both TypeScript and Python.
- **`block-library`**: Modular implementation of block logic, allowing easy expansion into new domains.
- **`workflow-engine`**: The core execution logic, responsible for topological sorting and error handling.

---

## 🚀 Completed Milestones

### 1. Agentic Chatbot (The AI Architect)
- **Capability**: Converts natural language goals into complete, executable workflows.
- **Engine**: Powered by **Groq (Llama-3.3-70b)** for cloud mode and **Ollama** for on-prem.
- **Features**: 
    - Real-time reasoning accordion (explaining why each block was chosen).
    - Intelligent layout (Dagre-BFS algorithm computes positions automatically).
    - Conversation persistence (allows resuming chat turns).

### 2. Interactive Canvas
- **Features**: Drag-and-drop, right-click context menus, and a searchable block palette.
- **State**: Full Undo/Redo history support.
- **Visualization**: Diff highlights (amber for changes, blue for new, ghost for removed) when the AI modifies an existing workflow.

### 3. Execution & Workflow Management
- **Status**: Full CRUD (Create, Read, Update, Delete) and **Versioning**.
- **Execution**: Can be run synchronously or asynchronously via Celery.
- **Real-time**: WebSockets provide live status updates (Pending → Running → Success/Fail) on the canvas nodes.
- **Rollback**: One-click restoration of any previous workflow version.

### 4. Enterprise Features
- **Scheduled Triggers**: Dynamic Celery beat integration allowing users to schedule pipelines via cron.
- **On-Prem Mode**: A fully containerized setup (`docker-compose.onprem.yml`) that runs 100% air-gapped using local LLMs/embeddings.
- **RBAC Foundation**: JWT-based auth with defined roles (Admin, Editor, Viewer).

---

## 🔍 Internal Logic Deep Dive

### The Workflow Generation Pipeline
1. **User Goal** (e.g., "Review resumes") → **Groq/Ollama**
2. **LLM** receives: System Persona + 21-Block Schema + Domain Context + Chat History.
3. **LLM** returns: A JSON proposal with nodes and edges.
4. **Backend Validation**: Verifies all block types and performs a topological search to ensure the graph is a valid DAG.
5. **Auto-Layout**: Computes X/Y coordinates using a BFS-based spacing algorithm.
6. **Frontend**: Renders the diff and waits for user "Apply".

### The Execution Engine
- **Kahn's Algorithm**: Used to determine the execution order.
- **Parallelism**: Standardizes task grouping so independent nodes run concurrently using `asyncio.gather`.
- **Sandbox Mode**: Allows "dry runs" by simulating side-effects (e.g., mock API calls) instead of real mutations.

---

## ⚠️ Identified Gaps & Next Steps

Based on the `CONTEXT.md` and codebase review, the following areas require attention:

### 1. Security & RBAC Enforcement
- While the auth logic and JWT helpers exist, the **RBAC dependencies** (`require_admin`, etc.) have not yet been fully applied across all router endpoints.

### 2. Operational Visibility
- **Drift Detection**: The schema and service for drift analysis exist, but the logic to compute KL-divergence on embeddings is still in the "scaffold" phase.
- **Real Dashboard Stats**: The dashboard currently displays mock metrics. Wiring these to real run data is a priority (J5).

### 3. "Real" vs "Mock" Logic
- **MinIO**: The infrastructure is ready, but the `StoreFileBlock` is still largely using simulated storage paths.
- **ML Blocks**: Some mechanical blocks like `DuplicateDrawingDetector` are currently using hash-checks or basic embeddings.

---

## 📊 Project Health Score: 85%
*The project is extremely stable and feature-rich for an Alpha version. The core architectural "hard problems" (Real-time WS, Monorepo types, Dynamic scheduling, Agentic planning) are solved. The remaining 15% is primarily "wiring" and UI polish.*
