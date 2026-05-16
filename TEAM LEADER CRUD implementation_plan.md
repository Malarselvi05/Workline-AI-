# Team Leader CRUD — Skill Database Feature

## Goal
Replace the hardcoded `MOCK_TEAM_LEADERS` with a real database-backed employee management system. The Skill Database tab will allow adding, editing, and deleting team leaders with skill tags — and the AI recommender will use this live data when allocating jobs.

---

## Current State (Problems)

- `MOCK_TEAM_LEADERS` in `vault/page.tsx` is a hardcoded array — no DB interaction
- No `TeamLeader` table in `models.py`
- The `recommend_engineer()` function in `ml_service.py` is designed correctly (TF-IDF cosine similarity on skills) but receives hardcoded data from the workflow block
- The AI can't improve recommendations because there's no real skill data

---

## Proposed Changes

### Backend

---

#### [MODIFY] [models.py](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/api/app/models/models.py)

Add a new `TeamLeader` table:

```python
class TeamLeader(Base):
    __tablename__ = "team_leaders"
    id           = Column(Integer, primary_key=True, index=True)
    org_id       = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    name         = Column(String, nullable=False)
    skills       = Column(JSON, default=[])       # List[str]  e.g. ["General Assembly", "CAD"]
    workload_pct = Column(Integer, default=0)     # 0–100, updated as jobs are assigned
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
```

---

#### [NEW] [team_leaders.py](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/api/app/routers/team_leaders.py)

Full CRUD router with these endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/team-leaders` | List all for org |
| `POST` | `/team-leaders` | Create new |
| `PATCH` | `/team-leaders/{id}` | Update name/skills/workload |
| `DELETE` | `/team-leaders/{id}` | Delete |

---

#### [MODIFY] [main.py](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/api/app/main.py)

Register the new `team_leaders` router.

---

### Frontend

---

#### [MODIFY] [api.ts](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/web/lib/api.ts)

Add `TeamLeader` interface and 4 API functions:
- `listTeamLeaders()`
- `createTeamLeader(data)`
- `updateTeamLeader(id, data)`
- `deleteTeamLeader(id)`

---

#### [MODIFY] [vault/page.tsx](file:///d:/MiniProject/Workline_AI/Workline-AI-/apps/web/app/vault/page.tsx)

Replace `MOCK_TEAM_LEADERS` static array with live API data. New Skill Database UI:

- **Employee cards** — avatar, name, active job count, skill tags (colored chips)
- **➕ Add Employee button** — opens a slide-in modal with name + skill tag input (type & press Enter to add tags)
- **✏️ Edit button** on each card — same modal pre-filled
- **🗑️ Delete button** on each card — inline confirmation
- **Skill tags** rendered as colored pill badges (not just text list)

---

## Verification Plan

### Automated
- Backend: uvicorn auto-reload confirms no import errors
- `GET /team-leaders` returns `[]` initially, then real rows after create

### Manual
1. Seed 2–3 team leaders via the UI
2. Upload a JPG document via the SEYON intake page
3. Check that the recommended team leader matches the skill set of one of the seeded employees
4. Edit a team leader's skills and re-run — confirm recommendation changes

---

## Open Questions

> [!NOTE]
> The AI recommender block currently has hardcoded engineers. After adding the DB, should the workflow engine be updated to fetch live `TeamLeader` rows from the DB during execution? This would make recommendations fully dynamic. I'll include this update since it's straightforward.
