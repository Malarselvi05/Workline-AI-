# WorkLine AI: SEYON Operations UI Walkthrough

Welcome to the **SEYON Operations Portal**, an end-to-end mechanical engineering operations manager powered by the WorkLine AI workflow engine.

This walkthrough describes the 5 primary tabs and how they connect to the underlying AI pipeline.

## 1. 📊 Operations Dashboard
The nerve center of the factory. 
- **KPIs**: Displays live metrics pulled directly from the backend, including Total Docs Processed, Success Rate, and active Drift Alerts.
- **Team Workloads**: Shows a live progress bar representing the number of open jobs assigned to each Team Leader.
- **⚡ View AI Logic (Ghost Mode)**: Toggling this button dims the screen and reveals the **Master DAG Visualizer**. You can see the real `ReactFlow` logic engine hovering over the dashboard, drag the nodes around to restructure the pipeline, and save your changes.

## 2. 📥 Intake (Phase 1)
The ingestion point for all factory documents.
- **Dropzone**: Drag and drop Purchase Orders, CAD files, or Engineering Drawings here.
- **AI Extraction**: Once uploaded, the F11 Simulation engine instantly processes the document. 
- **What Happens**: The underlying workflow's `OCRBlock` extracts text, and the `ClassifyBlock` determines if it is a Purchase Order or an Engineering Drawing.

## 3. 🗂️ Knowledge Vault
The central repository for all classified assets.
- **Intelligent Routing**: Documents are automatically sorted into "Purchase Orders" or "Engineering Drawings" folders based on the classifier output.
- **Team Leader Skill Database**: A view into the system's human resource pool. It tracks how many jobs are currently assigned to experts like Arun Kumar and Priya Nair. As you manually assign jobs in the Dispatch tab, this database automatically updates.

## 4. 🧑‍💼 Job Dispatch (Phase 2)
The AI-assisted assignment hub.
- **Pending Jobs**: Shows documents that have successfully passed through intake but need human oversight.
- **Recommendation Engine**: The `TeamLeaderRecommenderBlock` analyzes the document type and recommends the best engineer based on historical data and current workload.
- **Manual Override**: While the AI provides a ranked list with confidence scores, you have the final say. Clicking "Assign" commits the job to that leader, instantly updating their profile in the Vault.

## 5. 🔨 Bending (Production)
The factory floor monitor.
- **Live Telemetry**: Monitors simulated data for active Brake Presses (Pressure, Temperature, Progress).
- **Production Queue**: Displays the jobs that have passed Dispatch and are currently being fabricated on the floor.

---
*The entire UI is built with Next.js and styled using modern glassmorphism principles (Deep Navy, Electric Indigo, Mint Green) to provide a premium, state-of-the-art experience.*
