# Future Works & Project Roadmap

The immediate SEYON Operations Portal pivot has been successfully completed, providing a powerful, specialized AI-driven workflow for mechanical engineering job management.

Moving forward, the focus will shift towards enhancing the multi-tenant architecture, expanding the AI capabilities, and preparing the platform for production-grade deployment.

## 🚀 Near-Term Priorities (v1.1)

### 1. Robust Multi-Tenancy Expansion
- [ ] **Organization Boundaries**: Enforce strict data isolation for `WorkflowRun`, `RunNodeState`, and `Document` models across multiple organizations.
- [ ] **Role-Based Access Control (RBAC)**: Implement granular permissions (Admin vs Editor vs Viewer) affecting the visibility of the "Ghost Canvas" and "Settings" tabs.
- [ ] **Cross-Tenant Telemetry**: Improve the dashboard to support global and per-tenant KPI analytics.

### 2. Machine Learning Enhancements
- [ ] **Advanced OCR**: Move beyond `pytesseract` to a more robust, layout-aware OCR engine (e.g., Azure Document Intelligence or AWS Textract) to better parse complex engineering drawings.
- [ ] **Self-Learning Classifier**: Allow the `MLService` classifier to learn from manual routing corrections in the Knowledge Vault (human-in-the-loop training).
- [ ] **Capacity Planning Models**: Upgrade the Team Leader recommender to factor in real-time factory floor scheduling data (Bending machine queues).

### 3. Workflow Engine Upgrades
- [ ] **Parallel Execution**: Enable true parallel node execution in the `WorkflowEngine` to dramatically speed up multi-stage pipelines.
- [ ] **Version Control & Rollbacks**: Fully operationalize the DAG versioning system so admins can safely trial new AI logic and revert if success rates drop.
- [ ] **Automated Retries**: Implement exponential backoff for external API calls inside blocks (e.g., email dispatch or cloud storage).

## 🔮 Long-Term Vision (v2.0+)

### 1. IoT Factory Floor Integration
- [ ] **Real CNC Telemetry**: Replace the F11 simulated IoT metrics on the "Bending" tab with live MQTT streams from actual Brake Presses and Laser Cutters.
- [ ] **Predictive Maintenance**: Use machine learning to monitor the telemetry and trigger automated maintenance workflows when machine anomalies are detected.

### 2. Supplier Portals
- [ ] **External Vendor Access**: Create a simplified portal for suppliers to upload Purchase Orders directly, bypassing the internal "Intake" dropzone and automating the ingestion entirely.

### 3. Voice & Chat Interfaces
- [ ] **Conversational Automation**: Allow shop floor managers to query job statuses or reassign work via natural language prompts using the integrated ChatPanel.
