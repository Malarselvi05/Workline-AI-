# docs/runbooks/onprem-setup.md
# WorkLine AI — On-Premises Deployment Guide

> **Goal:** Run the full WorkLine AI stack locally with **zero external network calls**. All AI is served by [Ollama](https://ollama.com) (LLM) and HuggingFace TEI (embeddings).

---

## 🖥️ Prerequisites

| Requirement    | Minimum spec                      | Notes                                              |
| -------------- | --------------------------------- | -------------------------------------------------- |
| OS             | Windows 10 / macOS 12 / Ubuntu 22 | Any Docker-capable OS                              |
| RAM            | **16 GB**                         | 6 GB for Ollama · 4 GB for BGE · rest for services |
| Disk           | 20 GB free                        | LLM model ~2 GB · BGE model ~1.5 GB                |
| Docker Desktop | v4.20+                            | Enable WSL 2 backend on Windows                    |

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/workline-ai.git
cd workline-ai
```

### 2. Copy the environment file

```bash
cp apps/api/.env.example apps/api/.env
# No changes needed — WORKLINE_MODE=onprem is set in docker-compose.onprem.yml
```

### 3. Start all services

```bash
docker compose -f infra/docker/docker-compose.onprem.yml up -d
```

> **First run:** Ollama will automatically pull `llama3.2:3b` (~2 GB). This can take 3–10 minutes depending on your internet speed. After the first run, the model is cached in the `ollama_data` Docker volume.

### 4. Run database migrations

```bash
docker compose -f infra/docker/docker-compose.onprem.yml exec api alembic upgrade head
docker compose -f infra/docker/docker-compose.onprem.yml exec api python app/seed.py
```

### 5. Open the app

- **Frontend:** http://localhost:3000 *(run `npm run dev` in `apps/web` separately, or add a web service to the compose)*
- **API Swagger:** http://localhost:8000/docs
- **MinIO Console:** http://localhost:9001 (minioadmin / minioadmin)

---

## ✅ Verification Checklist

After startup, verify each service is healthy:

```bash
# All containers should show "Up"
docker compose -f infra/docker/docker-compose.onprem.yml ps

# Ollama — model should be listed
curl http://localhost:11434/api/tags

# BGE Embedding Server — should return an embedding vector
curl -X POST http://localhost:8080/embed \
  -H "Content-Type: application/json" \
  -d '{"inputs": "test document"}'

# WorkLine AI API
curl http://localhost:8000/
# Expected: {"message": "WorkLine AI API is running", ...}
```

---

## 🔧 Configuration

All AI routing is controlled by a single environment variable:

| Variable          | Value                     | Effect                                   |
| ----------------- | ------------------------- | ---------------------------------------- |
| `WORKLINE_MODE`   | `cloud` (default)         | Uses Groq API for LLM                    |
| `WORKLINE_MODE`   | `onprem`                  | Uses Ollama + BGE; **no external calls** |
| `OLLAMA_BASE_URL` | `http://ollama:11434`     | Ollama endpoint (set in compose)         |
| `EMBEDDING_URL`   | `http://bge-inference:80` | BGE TEI endpoint (set in compose)        |

---

## 🔄 Switching LLM Models

The default model is `llama3.2:3b` (small, fast, CPU-compatible). To use a larger model:

```bash
# Pull a bigger model into Ollama
docker compose -f infra/docker/docker-compose.onprem.yml exec ollama ollama pull llama3.1:8b

# Update the model in docker-compose.onprem.yml:
# entrypoint: ollama pull llama3.1:8b
```

Then update `apps/api/app/ai/planner.py` → `self.model = "llama3.1:8b"` and restart.

---

## 🛑 Stopping & Cleanup

```bash
# Stop all containers (data preserved in volumes)
docker compose -f infra/docker/docker-compose.onprem.yml down

# Full cleanup including volumes (deletes all data + LLM model cache)
docker compose -f infra/docker/docker-compose.onprem.yml down -v
```

---

## 🐛 Troubleshooting

| Symptom                            | Cause                                     | Fix                                                                |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| Ollama container OOM-killed        | Not enough RAM for model                  | Increase `deploy.resources.limits.memory` or use smaller model     |
| `Connection refused` on port 11434 | Ollama still pulling model                | Wait 5 min, check `docker logs workline-ollama-1`                  |
| BGE embed returns empty            | Model not yet cached                      | Check `docker logs workline-bge-inference-1`                       |
| API returns 500 on `/plan`         | Ollama not reachable from `api` container | Ensure both on same Docker network (default compose network works) |
| Alembic migration errors           | DB not ready                              | Wait 10s after `docker compose up` then retry                      |
