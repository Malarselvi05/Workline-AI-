# ⚡ WorkLine AI: The Agentic Automation Platform

**WorkLine AI** is a production-ready, no-code, graph-based automation platform (similar to n8n) that leverages an Agentic Chatbot to convert natural language into executable AI pipelines. It's designed to automate manual, fragmented business processes across various domains.

---

## 🚀 Core Features & Capabilities

### 1. 🎨 Intelligent Workflow Canvas
*   **Visual Editor:** Built with **React Flow**, providing a high-performance, interactive drag-and-drop workspace.
*   **Custom Nodes:** Sleek, icon-driven nodes for OCR, AI Classification, Human Review, Database Storage, and more.
*   **Auto-Layout:** The graph automatically centers and zooms to accommodate AI-generated designs.

### 2. 🤖 AI Architect (Agentic Chatbot)
*   **Natural Language to DAG:** Describe your goal (e.g., "Review resumes for hiring") and the AI designs the full Directed Acyclic Graph (DAG) live.
*   **Reasoning Engine:** The AI explains *why* it chose specific blocks and how the data will flow between them.
*   **Contextual Understanding:** Supports complex logic like "Human-in-the-loop" and "Conditional Routing."

### 3. 📦 Domain-Specific Power Packs
*   **Generic Pack:** Standard blocks for Document Intake (OCR), Parsing, and API Notifications.
*   **Mechanical Engineering Pack:** Specialized blocks for Drawing Classification, Duplicate Detector, and PO Data Extraction.
*   **HR & Support Packs:** Automated resume filtering and sentiment-based ticket routing.

### 4. ⚙️ Robust Execution Engine
*   **Topological Sorting:** Ensures tasks run in the correct logical order.
*   **Asynchronous Processing:** Powered by **Celery & Redis** for long-running heavy AI tasks.
*   **Universal Fallback:** Automatically switches to synchronous execution if background workers aren't available.

---

## 🛠️ Technology Stack

| Component         | Technology                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| **Frontend**      | Next.js 14, React Flow, Zustand, Tailwind CSS, Lucide                    |
| **Backend**       | FastAPI (Python 3.11+), SQLAlchemy, Pydantic                             |
| **Database**      | SQLite (Default for MVP) / PostgreSQL (Ready)                            |
| **Worker Engine** | Celery, Redis                                                            |
| **AI Processing** | Groq `llama-3.3-70b-versatile` (Planning), DAG validation + Dagre layout |

---

## 🏁 Getting Started

### 1. Backend Setup (API)
```powershell
# Navigate to the API folder
cd apps/api

# Install dependencies
pip install -r requirements.txt

# Set your Groq API key in apps/api/.env
# Get a free key at https://console.groq.com
# GROQ_API_KEY=gsk_...

# Run migrations (Ensures DB schema is up-to-date)
alembic upgrade head

# Initialize the database (Seeds demo workflows and default admin)
python app/seed_postgres.py

# Default Credentials (created by seed script):
# Role: Admin
# Email: admin@example.com
# Password: admin123

# Start the API server
uvicorn app.main:app --reload
```
*The API will be live at `http://localhost:8000`*

### 2. Frontend Setup (Web)
```powershell
# Navigate to the Web folder
cd apps/web

# Install dependencies (Next.js, React Flow, Zustand, Tailwind)
npm install

# Start the development server
npm run dev
```
*   **Access UI:** `http://localhost:3000`
*   **Note:** Ensure `NEXT_PUBLIC_API_URL` is set if you change the backend port.

### 3. On-Premises Setup (Zero External Calls)
```powershell
# Requires Docker Desktop with 16 GB RAM available
docker compose -f infra/docker/docker-compose.onprem.yml up -d
# First run: Ollama will pull llama3.2:3b (~2 GB) automatically
```
*   Full guide: [`docs/runbooks/onprem-setup.md`](./docs/runbooks/onprem-setup.md)
*   No `GROQ_API_KEY` needed — all AI is served locally by Ollama + BGE embeddings

### 4. Celery Beat Scheduler (for Scheduled Triggers)
```powershell
cd apps/api
celery -A app.core.celery_app.celery_app beat --loglevel=info
```
*Needed if you use the `ScheduledTriggerBlock` in any deployed workflow.*
---

## 🧪 Try These Prompts

Switch to the **"Automate"** tab and try these natural language inputs:

*   **Document Processing:** *"I want to classify PDFs and store them by job number."*
*   **Human Approval:** *"Extract data from invoices, but send to a supervisor for approval if confidence is low."*
*   **Mechanical Flow:** *"Analyze new mechanical drawings, find duplicates, and recommend a lead."*
*   **HR Automation:** *"Filter resumes for technical skills and match candidates to interviewers."*
---

## 📁 Project Structure
```text
Workline-AI/
├── apps/
│   ├── web/                # Next.js 14 Frontend
│   └── api/                # FastAPI Backend Service
├── packages/
│   ├── workflow-engine/    # DAG Execution Core Logic
│   └── block-library/      # Industry-Specific AI Blocks
└── infra/                  # Docker & Deployment Configs
```

---

## 🛠️ Current Status (v0.4.0-alpha)
- [x] Multi-tenant DB Foundation (Organisations, Users, Workflows)
- [x] Alembic Migration System
- [x] Backend Seeding & Idempotency
- [x] Frontend Scaffolding (Next.js 14)
- [x] Core Dependency Integration (React Flow, Zustand)
- [x] Full Stack Docker-Compose (Postgres, Redis, MinIO)
- [x] **Real LLM Graph Generation** — Groq `llama-3.3-70b-versatile` via `POST /plan` (J1)
- [x] **Conversation History** — Persistent chat turns with `GET /conversations/{id}` (J1)
- [x] **Canvas UI** — Undo/Redo, diff highlights, right-click menu, auto-layout (J2)
- [x] **Chatbot Panel UI** — Reasoning accordion, file attach, conversation restore (J3)
- [x] **Workflow Save/Deploy UI** — SaveModal, DeployModal, Rollback UI, Sidebar status badges (J4)
- [x] **Scheduled Triggers** — Cron schedule via `PUT /workflows/{id}/schedule`, dynamic Celery beat, ScheduleConfigPanel UI (J8)
- [x] On-Premises Mode — `WORKLINE_MODE=onprem` runs fully air-gapped with Ollama + BGE via `docker-compose.onprem.yml` (J9)
- [/] Multi-Domain Block Library (In Progress)
- [x] Multi-user RBAC & Organisations 

---

## 🔑 Login Credentials

The following identities represent different roles and views across multiple isolated organizations.

### Organization 1
*Has independent workflows and team data isolated from Org 2.*

*   **Email:** `malarrajamani24@gmail.com`
*   **Password:** `1234`
*   **Role:** Admin (Full Access to create & run pipelines)

*   **Email:** `memberj@example.com`
*   **Password:** `admin123`
*   **Role:** Admin (Full Access)

### Organization 2
*Has independent testing workflows isolated from Org 1.*

*   **Email:** `admin@workline.ai`
*   **Password:** `admin123`
*   **Role:** Admin (Full edit/configuration access)

*   **Email:** `viewer@workline.ai`
*   **Password:** `viewer123`
*   **Role:** Viewer (Read-only observation access, cannot modify nodes)
