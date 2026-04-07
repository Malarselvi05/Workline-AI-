/**
 * apps/web/lib/api.ts
 * Typed fetch wrappers for every WorkLine AI API endpoint.
 * Types mirror packages/shared-types/api_schemas.ts — keep them in sync.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// ── Types ─────────────────────────────────────────────────────────────────

export interface NodePosition {
    x: number;
    y: number;
}

export interface NodeData {
    label: string;
    config?: Record<string, unknown>;
    reasoning?: string;
    color?: string;
}

export interface WorkflowNode {
    id: string;
    type: string;
    position: NodePosition;
    data: NodeData;
    reasoning?: string;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    edge_type?: 'default' | 'condition_true' | 'condition_false';
}

export interface PlanRequest {
    goal: string;
    conversation_id?: number;
}

export interface WorkflowProposal {
    title: string;
    reasoning: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    conversation_id: number;
}

export interface ConversationTurn {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    proposal_json?: WorkflowProposal;
    created_at: string;
}

export interface Conversation {
    id: number;
    org_id?: number;
    workflow_id?: number;
    created_at: string;
    turns: ConversationTurn[];
}

export interface Workflow {
    id: number;
    name: string;
    description?: string;
    status: 'draft' | 'active' | 'archived';
    version: number;
    parent_version_id?: number;
    created_at: string;
    org_id: number;
}

export interface WorkflowDetail extends Workflow {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface WorkflowCreateRequest {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    refresh_token: string;
}

export interface User {
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'editor' | 'viewer';
    org_id?: number;
}

export interface WorkflowRun {
    id: number;
    workflow_id: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_review';
    started_at: string;
    ended_at?: string;
}

export interface RunNodeState {
    id: number;
    run_id: number;
    node_id: string;
    status: string;
    started_at: string;
    ended_at?: string;
    output_json?: any;
    error?: string;
}

export interface RunDetail {
    run: WorkflowRun;
    node_states: RunNodeState[];
}

export interface DashboardSummary {
    total_runs_week: number;
    success_rate: number;
    avg_duration: number;
    active_drift_alerts: number;
}

export interface RecentRun {
    id: number;
    workflow_name: string;
    triggered_by: string;
    status: string;
    started_at: string;
    duration: number;
}

export interface DriftAlert {
    id: number;
    workflow_name: string;
    metric: string;
    baseline_val: number;
    current_val: number;
    created_at: string;
}

export interface DomainPack {
    name: string;
    status: 'installed' | 'available';
}

// ── Internal fetch wrapper ─────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
    const token =
        typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options?.headers,
        },
        ...options,
    }).catch(err => {
        console.error(`[API Fetch Error] ${url}:`, err);
        throw err;
    });

    if (res.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) return request<T>(path, options);
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || `API error: ${res.status}`);
    }
    return res.json();
}

async function tryRefreshToken(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        return true;
    } catch {
        return false;
    }
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(error.detail);
    }
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    return data;
}

export async function signup(name: string, email: string, password: string): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Signup failed' }));
        throw new Error(error.detail);
    }
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    return data;
}

export async function logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User> {
    return request<User>('/auth/me');
}

// ── AI Planner ────────────────────────────────────────────────────────────

export async function planWorkflow(data: PlanRequest): Promise<WorkflowProposal> {
    return request<WorkflowProposal>('/plan', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getConversation(conversationId: number): Promise<Conversation> {
    return request<Conversation>(`/conversations/${conversationId}`);
}

// ── Workflows ─────────────────────────────────────────────────────────────

export async function listWorkflows(): Promise<Workflow[]> {
    return request<Workflow[]>('/workflows');
}

export async function getWorkflow(id: number): Promise<WorkflowDetail> {
    return request<WorkflowDetail>(`/workflows/${id}`);
}

export async function createWorkflow(data: WorkflowCreateRequest): Promise<Workflow> {
    return request<Workflow>('/workflows', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateWorkflow(
    id: number,
    data: { name: string; description?: string }
): Promise<Workflow> {
    return request<Workflow>(`/workflows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function deleteWorkflow(id: number): Promise<void> {
    await request(`/workflows/${id}`, { method: 'DELETE' });
}

export async function deployWorkflow(id: number): Promise<Workflow> {
    return request<Workflow>(`/workflows/${id}/deploy`, { method: 'POST' });
}

export async function runWorkflow(id: number): Promise<{ task_id?: string; status: string; mode: string, result?: unknown }> {
    return request(`/workflows/${id}/run`, { method: 'POST' });
}

export async function getWorkflowRuns(id: number): Promise<WorkflowRun[]> {
    return request<WorkflowRun[]>(`/workflows/${id}/runs`);
}

export async function getRunDetail(runId: number): Promise<RunDetail> {
    return request<RunDetail>(`/runs/${runId}`);
}

export async function approveNode(runId: number, nodeId: string): Promise<any> {
    return request(`/runs/${runId}/nodes/${nodeId}/approve`, { method: 'POST' });
}

export async function rejectNode(runId: number, nodeId: string): Promise<any> {
    return request(`/runs/${runId}/nodes/${nodeId}/reject`, { method: 'POST' });
}

export async function getWorkflowVersions(id: number): Promise<Workflow[]> {
    return request<Workflow[]>(`/workflows/${id}/versions`);
}

export async function rollbackWorkflow(workflowId: number, versionId: number): Promise<Workflow> {
    return request<Workflow>(`/workflows/${workflowId}/rollback/${versionId}`, { method: 'POST' });
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/api/dashboard/summary');
}

export async function getRecentRuns(): Promise<RecentRun[]> {
    const data = await request<{ runs: RecentRun[] }>('/api/dashboard/recent-runs');
    return data.runs;
}

export async function getDriftAlerts(): Promise<DriftAlert[]> {
    const data = await request<{ alerts: DriftAlert[] }>('/api/dashboard/drift-alerts');
    return data.alerts;
}

// ── Scheduled Triggers ────────────────────────────────────────────────────

export interface ScheduledTrigger {
    id: number;
    workflow_id: number;
    org_id?: number;
    cron_expr: string;
    enabled: boolean;
    next_run_at?: string;   // ISO datetime string
    last_run_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ScheduleUpsertRequest {
    cron_expr: string;
    enabled?: boolean;
}

export async function getSchedule(workflowId: number): Promise<ScheduledTrigger> {
    return request<ScheduledTrigger>(`/workflows/${workflowId}/schedule`);
}

export async function setSchedule(
    workflowId: number,
    data: ScheduleUpsertRequest
): Promise<ScheduledTrigger> {
    return request<ScheduledTrigger>(`/workflows/${workflowId}/schedule`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteSchedule(workflowId: number): Promise<void> {
    await request(`/workflows/${workflowId}/schedule`, { method: 'DELETE' });
}

// ── Domain Packs ──────────────────────────────────────────────────────────

export async function listPacks(): Promise<DomainPack[]> {
    return request<DomainPack[]>('/packs');
}

export async function installPack(name: string): Promise<any> {
    return request(`/packs/${name}/install`, { method: 'POST' });
}

export async function uninstallPack(name: string): Promise<any> {
    return request(`/packs/${name}/uninstall`, { method: 'POST' });
}
