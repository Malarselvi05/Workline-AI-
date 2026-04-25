# Implementation Plan: SEYON Operations Portal Pivot

This plan outlines the transformation of WorkLine AI from a generalized automation platform into the **SEYON Operations Portal**—a specialized, high-value solution for mechanical engineering job management.

## 🎯 Objectives
- [x] **Specialized UI**: Replace the generic "Automate" view with 5 distinct operational phases.
- [x] **Ghost Logic**: Implement a "Show AI Logic" toggle that reveals the underlying DAG nervous system.
- [x] **Real ML Integration**: Power each tab using existing `MLService` and `mechanical` blocks.
- [x] **Premium Aesthetics**: Use a "Product-Led" design with glassmorphism and smooth transitions.

---

## 🛠️ Phase 1: Navigation & State Overhaul (COMPLETED)
### 1.1 Update `workspaceStore.ts`
- [x] Add new tab types: `'dashboard' | 'intake' | 'vault' | 'dispatch' | 'bending'`.
- [x] Add `ghostMode: boolean` state.
- [x] Add `activeTabNodeId: string | null` to focus the canvas on specific logic per tab.

### 1.2 Redesign `Sidebar.tsx`
- [x] Group the 4 SEYON tabs at the top.
- [x] Move "Automate" (Dev Mode) to the bottom separator.
- [x] Use new SEYON-specific icons (📥, 🗂️, 🧑‍💼, 🔨).

---

## 🏗️ Phase 2: Tab Implementation (COMPLETED)

### 2.1 Tab 1: Operations Dashboard
- [x] **KPI Cards**: Success Rate, Processing Time, Active Job Alerts.
- [x] **Team Leader Workload**: Progress bars showing job count per leader.
- [x] **Recent Activity**: Live stream of processed documents.

### 2.2 Tab 2: Intake (Phase 1)
- [x] **Dropzone**: Large, glassmorphic drag-and-drop area.
- [x] **Extraction View**: Side-by-side panel showing Original File vs. Live Extracted Data (OCR + Classifier output).
- [x] **Action**: "Run SEYON Processing" button.

### 2.3 Tab 3: Knowledge Vault
- [x] **File Grid**: Windows-style explorer for documents.
- [x] **Skill Matrix**: A view for browsing the Team Leader skills database.
- [x] **Search**: Proof-of-concept keyword indexing for documents.

### 2.4 Tab 4: Job Dispatch (Phase 2)
- [x] **Recommendation Panel**: Ranked list of Team Leaders using `TeamLeaderRecommenderBlock`.
- [x] **"The Why"**: Display the reasoning/confidence score from the ML model.
- [x] **Approval Flow**: "Confirm Assignment" button to finalize the loop and update the Vault.

### 2.5 Tab 5: Bending (Production Control)
- [x] **Production Queue**: List of active fabrication jobs.
- [x] **Machine Telemetry**: Live status cards for CNC Brake Presses (Pressure, Temp, Progress).
- [x] **IoT Simulation**: Mock telemetry data streams for demo purposes.

---

## 👻 Phase 3: The Ghost Toggle (COMPLETED)
### 3.1 Overlay Component
- [x] Create a `GhostCanvasOverlay` that wraps `ReactFlow`.
- [x] Use a `backdrop-filter: blur(10px)` effect to dim the underlying tab.
- [x] Add a floating toggle in the header: `[ ⚡ View AI Logic ]`.

### 3.2 Contextual Highlighting & Editing
- [x] Allow users to edit and save the workflow graph from the Dashboard ghost mode.
- [x] Pass manual configurations back into the engine using `updateWorkflow` logic.

---

## 🔗 Phase 4: Backend & Data Hardening (COMPLETED)
- [x] **Mock DB Expansion**: Add more synthetic Team Leaders to `ml_service.py` to match real SEYON Roster.
- [x] **Folder Sync**: Ensure classification updates the "Vault" view mapping algorithms.
- [x] **Simulation**: Update the F11 generator to seed data specifically for SEYON (PO files, mechanical drawings).

---

## 🎨 Design System (Aesthetics) (COMPLETED)
- [x] **Colors**: Deep Navy (`#0f172a`), Electric Indigo (`#6366f1`), and Mint Success (`#10b981`).
- [x] **Cards**: High-transparency glassmorphism with subtle borders.
- [x] **Animations**: Custom `pulse-subtle` and spin animations for real-time states.
