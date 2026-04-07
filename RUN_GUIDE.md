# 🚀 WorkLine AI — Execution & Runtime Guide

Welcome to the **WorkLine AI** execution guide. This document provides step-by-step instructions for launching both the **FastAPI Backend** and the **Next.js Frontend** in your local development environment.

---

## 🛠️ Prerequisites

Before you begin, ensure your system has the following installed:

- **Node.js**: v20 or higher
- **Python**: v3.11 or higher
- **Redis**: Required for the workflow task queue and real-time triggers.
- **npm**: v10 or higher (or `pnpm` / `yarn`)

---

## 1️⃣ Quick Start (Monorepo Run)

WorkLine AI uses **Turborepo** for unified workspace management. From the root directory:

```bash
# 1. Install Node.js dependencies
npm install

# 2. Run both Backend & Frontend in parallel
npm run dev
```

> [!TIP]
> This command will launch the FastAPI backend on `http://localhost:8001` and the Next.js frontend on `http://localhost:3000`.

---

## 2️⃣ Backend Setup (FastAPI)

If you need to run or debug the API individually:

### 🐍 Environment Configuration
1. Navigate to the API directory: `cd apps/api`
2. Create a `.env` file (copy from `.env.example` if available) and configure your `DATABASE_URL` and `GROQ_API_KEY`.

### 📦 Installation
```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### ⚡ Start the API
```bash
# From the apps/api folder
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 3️⃣ Frontend Setup (Next.js)

The frontend is a dedicated Next.js application built with TailwindCSS and Radix UI.

```bash
# From the root or apps/web
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🧪 Testing

To verify the system's technical health and security hardening (Multi-tenancy, Append-only logs, etc.):

```bash
# From the apps/api folder
set PYTHONPATH=.
pytest tests/
```

---

## ⚙️ Key Endpoints & Architecture

- **API Documentation (SwaggerUI)**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Websocket Port**: `8001/ws` (Used for real-time workflow status updates)

> [!IMPORTANT]
> **Audit Log Integrity**: The `audit_logs` table has been hardened to prevent all `UPDATE` and `DELETE` operations. Any attempt to modify logs will result in an `Exception: Audit logs are append-only.`

---
*Created by Antigravity — Your AI Coding Partner*
