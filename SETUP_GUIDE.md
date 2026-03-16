# 🛠️ WorkLine AI: Developer Setup Guide

This guide will help you set up your local development environment for WorkLine AI.

---

## 1. Prerequisites
- **Git**
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Groq API Key** (Get one at [console.groq.com](https://console.groq.com))
- **Docker Desktop** (Recommended for easiest setup)

---

## 2. Clone the Repository
```powershell
git clone https://github.com/Malarselvi05/Workline-AI-.git
cd Workline-AI-
```

---

## 3. Infrastructure Setup (Choose ONE)

### Option A: Using Docker (Recommended for Member J)
This starts PostgreSQL, Redis, and MinIO automatically.
```powershell
cd infra/docker
docker-compose up -d db redis minio
```
*Wait a few seconds for the services to initialize.*

### Option B: Local Installation (Manual)
If you prefer installing software directly on Windows:
1. **PostgreSQL**: Install v16. Create a database named `workline`.
2. **Redis**: Install [Memurai Developer](https://www.memurai.com/get-memurai).
3. **MinIO**: Download and run MinIO server.

---

## 4. Backend Setup (API)

1. **Navigate to API directory:**
   ```powershell
   cd apps/api
   ```

2. **Install Dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Create a file named `.env` and copy content from `.env.example`. Adjust the `DATABASE_URL` password if needed.
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workline
   REDIS_URL=redis://localhost:6379/0
   GROQ_API_KEY=your_gsk_key_here
   JWT_SECRET_KEY=dev_secret
   ```

4. **Initialize Database:**
   ```powershell
   # Apply migrations
   alembic upgrade head
   
   # Seed demo data
   python app/seed.py
   ```

5. **Start the API:**
   ```powershell
   uvicorn app.main:app --reload
   ```

---

## 5. Frontend Setup (Web)

1. **Navigate to Web directory:**
   ```powershell
   cd apps/web
   ```

2. **Install Dependencies:**
   ```powershell
   npm install
   ```

3. **Configure Environment:**
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Start the UI:**
   ```powershell
   npm run dev
   ```

---

## 🛠️ Common Troubleshooting

### "Duplicate Object / Constraint already exists" (Alembic)
If you see an error about `fk_audit_logs_org_id_organisations` during `alembic upgrade`, it means your DB was created without Alembic's knowledge. Fix it by running:
```powershell
alembic stamp 0e785d094cbd
```

### "Database tables missing"
If the app starts but errors because of missing tables, ensure you ran:
```powershell
alembic upgrade head
```

### "Groq API Error"
Ensure your `GROQ_API_KEY` in `apps/api/.env` is valid and has not expired.

---

## 🤝 Project Structure
- `apps/web`: Next.js 14 Frontend (React Flow, Tailwind).
- `apps/api`: FastAPI Backend (SQLAlchemy, Celery).
- `packages/workflow-engine`: Core DAG execution logic.
- `packages/block-library`: AI and Domain-specific blocks.

---
**Happy Coding!** 🚀
