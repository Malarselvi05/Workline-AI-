# Implementation Plan: SEYON Operations Portal Pivot

This plan outlines the transformation of WorkLine AI from a generalized automation platform into the **SEYON Operations Portal**—a specialized, high-value solution for mechanical engineering job management.

## 🎯 Objectives
- **Specialized UI**: Replace the generic "Automate" view with 5 distinct operational phases.
- **Ghost Logic**: Implement a "Show AI Logic" toggle that reveals the underlying DAG nervous system.
- **Real ML Integration**: Power each tab using existing `MLService` and `mechanical` blocks.
- **Premium Aesthetics**: Use a "Product-Led" design with glassmorphism and smooth transitions.

---

## 🛠️ Phase 1: Navigation & State Overhaul
### 1.1 Update `workspaceStore.ts`
- Add new tab types: `'dashboard' | 'intake' | 'vault' | 'dispatch' | 'bending'`.
- Add `ghostMode: boolean` state.
- Add `activeTabNodeId: string | null` to focus the canvas on specific logic per tab.

### 1.2 Redesign `Sidebar.tsx`
- Group the 4 SEYON tabs at the top.
- Move "Automate" (Dev Mode) to the bottom separator.
- Use new SEYON-specific icons (📥, 🗂️, 🧑‍💼, 🔨).

---

## 🏗️ Phase 2: Tab Implementation

### 2.1 Tab 1: Operations Dashboard
- **KPI Cards**: Success Rate, Processing Time, Active Job Alerts.
- **Team Leader Workload**: Progress bars showing job count per leader.
- **Recent Activity**: Live stream of processed documents.

### 2.2 Tab 2: Intake (Phase 1)
- **Dropzone**: Large, glassmorphic drag-and-drop area.
- **Extraction View**: Side-by-side panel showing Original File vs. Live Extracted Data (OCR + Classifier output).
- **Action**: "Run SEYON Processing" button.

### 2.3 Tab 3: Knowledge Vault
- **File Grid**: Windows-style explorer for documents.
- **Skill Matrix**: A view for browsing the Team Leader skills database.
- **Search**: Proof-of-concept keyword indexing for documents.

### 2.4 Tab 4: Job Dispatch (Phase 2)
- **Recommendation Panel**: Ranked list of Team Leaders using `TeamLeaderRecommenderBlock`.
- **"The Why"**: Display the reasoning/confidence score from the ML model.
- **Approval Flow**: "Confirm Assignment" button to finalize the loop.

### 2.5 Tab 5: Bending (Production Control)
- **Production Queue**: List of active fabrication jobs.
- **Machine Telemetry**: Live status cards for CNC Brake Presses (Pressure, Temp, Progress).
- **IoT Simulation**: Mock telemetry data streams for demo purposes.

---

## 👻 Phase 3: The Ghost Toggle
### 3.1 Overlay Component
- Create a `GhostCanvasOverlay` that wraps `ReactFlow`.
- Use a `backdrop-filter: blur(10px)` effect to dim the underlying tab.
- Add a floating toggle in the header: `[ ⚡ View AI Logic ]`.

### 3.2 Contextual Highlighting
- When toggled on the **Intake** tab, auto-zoom to the `OCR` and `Classifier` nodes.
- When toggled on the **Dispatch** tab, auto-zoom to the `Recommender` and `HumanReview` nodes.

---

## 🔗 Phase 4: Backend & Data Hardening
- **Mock DB Expansion**: Add more synthetic Team Leaders to `ml_service.py`.
- **Folder Sync**: Ensure `StoreFileBlock` (F9) correctly updates the "Vault" view.
- **Simulation**: Update the F11 generator to seed data specifically for SEYON (PO files, mechanical drawings).

---

## 🎨 Design System (Aesthetics)
- **Colors**: Deep Navy (`#0f172a`), Electric Indigo (`#6366f1`), and Mint Success (`#10b981`).
- **Cards**: High-transparency glassmorphism with subtle borders.
- **Animations**: `framer-motion` for tab sliding and ghost overlay transitions.
