# Workline AI — Practical Evaluation (Simple)

## 🎯 Goal
Check if the system works end-to-end.

---

## 🔥 Test 1 — AI Workflow Generation

Input:
"Classify PDFs and store them"

Check:
- [ ] Workflow is generated
- [ ] Nodes make sense (OCR → classify → store)
- [ ] No weird extra blocks
- [ ] No errors

---

## 🔥 Test 2 — Canvas + Save

Action:
- Apply workflow
- Add one node manually
- Click Save

Check:
- [ ] Workflow saved in DB
- [ ] Sidebar tab created
- [ ] No crash

---

## 🔥 Test 3 — Execution

Action:
- Click Simulate

Check:
- [ ] Nodes run in order
- [ ] Status updates (running → success)
- [ ] No node fails

---

## 🔥 Test 4 — Deploy + Rollback

Action:
- Deploy workflow
- Modify something
- Deploy again
- Rollback

Check:
- [ ] Version created
- [ ] Rollback works
- [ ] Old version restored

---

## 🔥 Test 5 — Human Review

Action:
- Run workflow with human_review block

Check:
- [ ] Run pauses
- [ ] UI shows "awaiting review"
- [ ] Approve → continues

---

## 🐞 Bugs

| Date | Test | Issue | Fix |
|------|------|------|-----|