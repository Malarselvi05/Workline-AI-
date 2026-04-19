# SEYON Operations Portal — UI Walkthrough (As the User)

---

## 🖥️ THE APP SHELL (always visible after login)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WORKLINE AI                                                                │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  SIDEBAR     │   ← MAIN CONTENT AREA (changes per tab)                     │
│              │                                                              │
│  ┌────────┐  │                                                              │
│  │  SEYON │  │                                                              │
│  │ PORTAL │  │                                                              │
│  └────────┘  │                                                              │
│              │                                                              │
│  📊 Dashboard│                                                              │
│  📥 Intake   │                                                              │
│  🗂️ Vault    │                                                              │
│  🧑‍💼 Dispatch │                                                              │
│  🔨 Bending  │                                                              │
│              │                                                              │
│  ──────────  │                                                              │
│  ⚙ Settings  │                                                              │
│  🧩 Dev Mode │                                                              │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

> The sidebar has 4 SEYON tabs. Clicking each one changes the main content.
> The existing "Automate / Workflows" dev links stay below the separator.

---

---

## TAB 1 — 📊 DASHBOARD (Monitoring)

> *"I want to see what's happening right now in the system."*

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  📊 SEYON Dashboard                   [ ⚡ Show Canvas ] OFF│
│              │  ─────────────────────────────────────────────────────────  │
│  📊 Dashboard│                                                              │
│  📥 Intake   │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───┐ │
│  🗂️ Vault    │   │ 📄 Docs      │ │ ✅ Success    │ │ ⏱ Avg Time   │ │ ⚠ │ │
│  🧑‍💼 Dispatch │   │ Processed   │ │ Rate         │ │              │ │   │ │
│  🔨 Bending  │   │    47        │ │   94%        │ │   2.3 min    │ │ 2 │ │
│              │   │ this week    │ │              │ │              │ │   │ │
│              │   └──────────────┘ └──────────────┘ └──────────────┘ └───┘ │
│              │                                                              │
│              │   Recent Activity                                            │
│              │   ┌─────────────────────────────────────────────────────┐   │
│              │   │  Run ID  │ Document              │ Status  │ Time   │   │
│              │   │──────────┼───────────────────────┼─────────┼────────│   │
│              │   │   #42    │ PO_SEYON_2024.pdf      │ ✅ Done │ 2m ago │   │
│              │   │   #41    │ Assembly_DRG_114.pdf   │ ✅ Done │ 5m ago │   │
│              │   │   #40    │ Schematic_Rev3.pdf     │ ⏳ Run  │ 8m ago │   │
│              │   │   #39    │ BOM_Mechanical.xlsx    │ ✅ Done │ 1h ago │   │
│              │   │   #38    │ PartDrawing_099.pdf    │ ❌ Fail │ 2h ago │   │
│              │   └─────────────────────────────────────────────────────┘   │
│              │                                                              │
│              │   Team Leader Workload                                       │
│              │   ┌─────────────────────────────────────────────────────┐   │
│              │   │  Jane Smith (Lead Architect)     ████████░░  4 jobs │   │
│              │   │  John Doe (Production Lead)      ██████░░░░  3 jobs │   │
│              │   │  Robert Brown (Electrical Head)  ████░░░░░░  2 jobs │   │
│              │   │  Alice White (Procurement)       ██░░░░░░░░  1 job  │   │
│              │   └─────────────────────────────────────────────────────┘   │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

**Toggle OFF** → This clean monitoring UI.

---

## TAB 1 — 📊 DASHBOARD  (with Canvas Toggle ON)

> *"I want to see the AI nodes processing in real time behind the dashboard."*

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  📊 SEYON Dashboard                   [ ⚡ Show Canvas ] ON │
│              │  ─────────────────────────────────────────────────────────  │
│  📊 Dashboard│                                                              │
│  📥 Intake   │   ┌──────────────────────── DASHBOARD UI ──────────────┐    │
│  🗂️ Vault    │   │  (same KPI cards, same table — now dimmed slightly) │    │
│  🧑‍💼 Dispatch │   └─────────────────────────────────────────────────────┘    │
│  🔨 Bending  │                                                              │
│              │  ╔═══════════════════════════════════════════════════════╗   │
│              │  ║  🧠 NERVOUS SYSTEM  (React Flow Canvas Overlay)       ║   │
│              │  ║  ─────────────────────────────────────────────────── ║   │
│              │  ║                                                       ║   │
│              │  ║  [file_upload]──►[ocr]──►[classify]──►[recommend]... ║   │
│              │  ║       ●               ●●●          ✅                  ║   │
│              │  ║                                                       ║   │
│              │  ║  Node #3 classify  ███████░░░  Running...            ║   │
│              │  ║                                                       ║   │
│              │  ║  [Block palette]  [Chat Panel]  [Toolbar]            ║   │
│              │  ║                                          [ ✕ Close ] ║   │
│              │  ╚═══════════════════════════════════════════════════════╝   │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

The canvas appears **on top** of the tab content as a semi-transparent overlay.
You can see both the clean SEYON UI and the raw node graph simultaneously.

---

---

## TAB 2 — 📥 INTAKE (Phase 1: Upload & Extract)

> *"I have a new document from a customer. I want to feed it into the system."*

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  📥 Intake — Document Processing         [ ⚡ Show Canvas ]  │
│              │  ─────────────────────────────────────────────────────────  │
│  📊 Dashboard│                                                              │
│  📥 Intake ◄ │                                                              │
│  🗂️ Vault    │   ┌─────────────────────────────────────────────────────┐   │
│  🧑‍💼 Dispatch │   │                                                         │   │
│  🔨 Bending  │   │        📄                                            │   │
│              │   │   Drag & Drop Document Here                          │   │
│              │   │                                                      │   │
│              │   │   or  [ Browse Files ]                               │   │
│              │   │                                                      │   │
│              │   │   Accepted: PDF, PNG, JPG, DXF, XLSX                │   │
│              │   └─────────────────────────────────────────────────────┘   │
│              │                                                              │
│              │   Document Type (optional hint):                            │
│              │   ○ Auto-detect    ○ Purchase Order    ○ Drawing            │
│              │   ○ Schematic      ○ BOM               ○ Other              │
│              │                                                              │
│              │   [ 🚀  Run AI Processing ]   ← triggers the SEYON DAG     │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## TAB 2 — 📥 INTAKE (after Upload — Processing in Progress)

> *"File uploaded! Now I can see the AI nodes processing step by step."*

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  📥 Intake — AI Processing Run #43     [ ⚡ Show Canvas ]   │
│              │  ─────────────────────────────────────────────────────────  │
│  📥 Intake ◄ │                                                              │
│              │   File: PO_SEYON_2024.pdf               Status: ⏳ Running  │
│              │                                                              │
│              │   AI Processing Pipeline                                     │
│              │   ┌─────────────────────────────────────────────────────┐   │
│              │   │                                                      │   │
│              │   │  ✅  file_upload      Done                           │   │
│              │   │       └─ Input received                              │   │
│              │   │                                                      │   │
│              │   │  ✅  ocr              Done  (1.2s)                   │   │
│              │   │       └─ Extracted 847 characters                   │   │
│              │   │                                                      │   │
│              │   │  ⏳  drawing_classifier   ● Running...              │   │
│              │   │       └─ Analyzing content patterns                 │   │
│              │   │                                                      │   │
│              │   │  ○   po_extractor     Waiting                        │   │
│              │   │  ○   duplicate_detector  Waiting                    │   │
│              │   │  ○   classify         Waiting                        │   │
│              │   │  ○   team_leader_recommender  Waiting               │   │
│              │   │  ○   human_review     Waiting                        │   │
│              │   └─────────────────────────────────────────────────────┘   │
│              │                                                              │
│              │   [ View in Vault once complete → ]                          │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

Each node ticks off in real time as the engine runs.

---

---

## TAB 3 — 🗂️ VAULT (File Explorer / Output Store)

> *"Show me the extracted data. Where did the document land? What did AI find?"*

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  🗂️ Vault — Document Explorer            [ ⚡ Show Canvas ]  │
│              │  ─────────────────────────────────────────────────────────  │
│  🗂️ Vault  ◄ │                                                              │
│              │  📁 SEYON Storage                                            │
│              │  ┌────────────────┬────────────────────────────────────────┐ │
│              │  │  📁 Folders    │  📄 Contents of: Run #43               │ │
│              │  │                │                                        │ │
│              │  │  📂 Run #43   ◄│  ┌─────────────────────────────────┐  │ │
│              │  │  📂 Run #42   │  │  📄 OCR Extraction              │  │ │
│              │  │  📂 Run #41   │  │  Type: Purchase Order           │  │ │
│              │  │  📂 Run #40   │  │  Confidence: 92%                │  │ │
│              │  │  📂 Run #39   │  │  Text: "PO-2024-882, Global..." │  │ │
│              │  │               │  └─────────────────────────────────┘  │ │
│              │  │               │                                        │ │
│              │  │               │  ┌─────────────────────────────────┐  │ │
│              │  │               │  │  📊 Drawing Classifier          │  │ │
│              │  │               │  │  Type: General Assembly         │  │ │
│              │  │               │  │  Confidence: 0.91               │  │ │
│              │  │               │  └─────────────────────────────────┘  │ │
│              │  │               │                                        │ │
│              │  │               │  ┌─────────────────────────────────┐  │ │
│              │  │               │  │  📦 PO Extractor                │  │ │
│              │  │               │  │  PO Number: PO-2024-882         │  │ │
│              │  │               │  │  Vendor: Global Parts Ltd       │  │ │
│              │  │               │  │  Value: $12,500.00 USD          │  │ │
│              │  │               │  └─────────────────────────────────┘  │ │
│              │  │               │                                        │ │
│              │  │               │  ┌─────────────────────────────────┐  │ │
│              │  │               │  │  🔎 Duplicate Check             │  │ │
│              │  │               │  │  Status: ✅ No Duplicate Found   │  │ │
│              │  │               │  │  Similarity: 0.23               │  │ │
│              │  │               │  └─────────────────────────────────┘  │ │
│              │  └────────────────┴────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

This is the **Windows File Explorer metaphor** — left panel = runs as folders, right panel = AI output per node.

---

---

## TAB 4 — 🧑‍💼 DISPATCH (Phase 2: Job & Team Leader Assignment)

> *"The AI has analysed the job. Now I need to assign it to the right team leader."*

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  🧑‍💼 Dispatch — Job Assignment            [ ⚡ Show Canvas ]  │
│              │  ─────────────────────────────────────────────────────────  │
│  🧑‍💼 Dispatch◄│                                                              │
│              │   Job Summary (from Run #43)                                 │
│              │   ┌─────────────────────────────────────────────────────┐   │
│              │   │  Document:  PO_SEYON_2024.pdf                        │   │
│              │   │  Type:      General Assembly                          │   │
│              │   │  PO Number: PO-2024-882                               │   │
│              │   │  Value:     $12,500 USD                               │   │
│              │   └─────────────────────────────────────────────────────┘   │
│              │                                                              │
│              │   🤖 AI Recommended Team Leaders  (ranked by fit)           │
│              │   ┌─────────────────────────────────────────────────────┐   │
│              │   │                                                      │   │
│              │   │  #1  🟢  Jane Smith         Lead Architect     95%  │   │
│              │   │         "Best match — Assembly expertise · 3 yrs"  │   │
│              │   │         Workload: ████░░ Moderate                   │   │
│              │   │                           [ ✅ Assign This Person ] │   │
│              │   │  ────────────────────────────────────────────────  │   │
│              │   │  #2  🟡  John Doe           Production Lead    81%  │   │
│              │   │         "Good fit — mechanical background"          │   │
│              │   │         Workload: ██░░░░ Light                      │   │
│              │   │                           [ Assign ]                │   │
│              │   │  ────────────────────────────────────────────────  │   │
│              │   │  #3  🔴  Robert Brown       Electrical Head    54%  │   │
│              │   │         "Partial match — different specialty"        │   │
│              │   │         Workload: ██████ Heavy                      │   │
│              │   │                           [ Assign ]                │   │
│              │   └─────────────────────────────────────────────────────┘   │
│              │                                                              │
│              │   Admin Notes: ___________________________________________   │
│              │                                                              │
│              │   [ ✅ Confirm Assignment ]    [ ↩ Back to Vault ]          │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---


## TAB 5 — 🔨 BENDING (Phase 3: Shop Floor Monitoring)

> *"The job is assigned; now I track the physical fabrication process."*

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  🔨 Bending — Production Control         [ ⚡ Show Canvas ]  │
│              │  ─────────────────────────────────────────────────────────  │
│  🔨 Bending ◄│                                                              │
│              │   Active Shop Floor Jobs                                     │
│              │   ┌─────────────────────────────────────────────────────┐   │
│              │   │  Job #43  |  PO-2024-882  |  Status: ⚙ In-Progress   │   │
│              │   │  Machine: CNC Brake Press #4                        │   │
│              │   │  Progress: ███████░░░ (70%)                         │   │
│              │   └─────────────────────────────────────────────────────┘   │
│              │                                                              │
│              │   Live Telemetry                                            │
│              │   ┌─────────────────────────────────────────────────────┐   │
│              │   │  • Bend Angle: 90.0° (Target 90.0°)    ✅ Valid     │   │
│              │   │  • Material: 3mm Alum                  ✅ Verified  │   │
│              │   │  • Safety Gate: CLOSED                              │   │
│              │   └─────────────────────────────────────────────────────┘   │

## TAB 4 — 🧑‍💼 DISPATCH (after "Assign" is clicked)

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  🧑‍💼 Dispatch — Assignment Confirmed!     [ ⚡ Show Canvas ]  │
│              │  ─────────────────────────────────────────────────────────  │
│  🧑‍💼 Dispatch◄│                                                              │
│              │                                                              │
│              │          ✅   Assignment Complete                            │
│              │                                                              │
│              │          Job PO-2024-882 has been assigned to:              │
│              │                                                              │
│              │          ┌───────────────────────────────────────────┐      │
│              │          │              Jane Smith                    │      │
│              │          │          Lead Architect                    │      │
│              │          │                                            │      │
│              │          │  "Based on historical expertise in         │      │
│              │          │   General Assembly management."            │      │
│              │          │                                            │      │
│              │          │  Assigned by: Admin   At: 11:32 AM        │      │
│              │          └───────────────────────────────────────────┘      │
│              │                                                              │
│              │          [ 📊 See on Dashboard ] [ 📥 Process Next Doc ]    │
│              │                                                              │

└──────────────┴──────────────────────────────────────────────────────────────┘
```

---
## THE GHOST TOGGLE — How It Works on Any Tab

The toggle is a small pill button in the **top-right of every tab's header bar**:

```
  [Tab Title]                      [ ⚡ Show Canvas ]  ← this button
```

**State OFF (default):**
- Shows the clean SEYON tab UI
- Toggle button is dim / ghost-styled

**State ON:**
- The ReactFlow canvas slides in as a **semi-transparent overlay** covering the tab
- The underlying tab content is still visible, dimmed behind it
- The canvas shows the live SEYON workflow with node states (pulsing/green/red)
- A `✕ Close` button in the canvas closes it

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📥 Intake — Document Processing         [ ⚡ Show Canvas ]  ← ON (glowing)│
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  ┌──────── SEYON Tab UI (dimmed, beneath) ────────┐                        │
│  │   Drag & Drop area...                           │                        │
│  └────────────────────────────────────────────────┘                        │
│                                                                             │
│  ╔════════════════ CANVAS OVERLAY (on top) ═══════════════════════╗        │
│  ║  🧠 Nervous System                               [ ✕ Close ]  ║        │
│  ║  ──────────────────────────────────────────────────────────── ║        │
│  ║                                                                ║        │
│  ║  [file_upload] ──→ [ocr] ──→ [classify] ──→ [recommend]       ║        │
│  ║       ✅              ✅          ●●●             ○             ║        │
│  ║                                                                ║        │
│  ║  [Block Palette]             [Chat Panel]       [Toolbar]      ║        │
│  ║                                                                ║        │
│  ╚════════════════════════════════════════════════════════════════╝        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete User Flow (End to End)

```
User logs in
      │
      ▼
  Opens SEYON Portal (sidebar click)
      │
      ├──► Dashboard tab ──► See KPIs, recent runs, team workloads
      │
      ├──► Intake tab
      │        │
      │        ▼
      │    Drag & drop PDF
      │        │
      │        ▼
      │    Click "Run AI Processing"
      │        │
      │        ▼
      │    Watch node pipeline tick off (live status)
      │        │
      ├──► Vault tab
      │        │
      │        ▼
      │    Click Run #43 folder
      │        │
      │        ▼
      │    See OCR text, drawing type, PO data, duplicate check
      │
      ├──► Dispatch tab ──► Admin reviews → clicks "Assign"
      │        │
      │        ▼
      ├──► Bending tab ──► Monitor live production on the shop floor
      │        │
      │        ▼
      └──► Dashboard tab ──► Workload bar for Jane Smith updates
```

---

## What IS and ISN'T in the plan (answering your question)

| Feature You Mentioned | In Plan? | Which Tab |
|---|---|---|
| Input document drag & drop | ✅ YES | Intake tab |
| File explorer (Windows-style) | ✅ YES | Vault tab |
| Team leader recommendation | ✅ YES | Dispatch tab |
| Admin can verify & allocate manually | ✅ YES | Dispatch tab (Assign button) |
| Monitoring/KPI dashboard | ✅ YES | Dashboard tab |
| Toggle to see canvas per tab | ✅ YES | Top-right of every tab |
| Canvas shows live node processing | ✅ YES | When toggle is ON |
| Real AI backend (not fake data) | ✅ YES | Same existing engine |
| Bending & Production Control | ✅ YES | Bending tab (Pending) |

