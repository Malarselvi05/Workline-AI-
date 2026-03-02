/**
 * apps/web/lib/api.ts
 * Typed fetch wrappers for every WorkLine AI API endpoint.
 * Types mirror packages/shared-types/api_schemas.ts — keep them in sync.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────

export interface NodePosition {
    x: number;
    y: number;
}

export interface NodeData {
    label: string;
    config?: Record<string, unknown>;
    reasoning?: string;
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

export interface WorkflowCreateRequest {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface Workflow {
    id: number;
    org_id?: number;
    name: string;
    description?: string;
    status: 'draft' | 'active' | 'archived';
    version: number;
    parent_version_id?: number;
    created_at: string;
}

export interface WorkflowDetail extends Workflow {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface WorkflowRun {
    id: number;
    workflow_id: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_review';
    started_at: string;
    ended_at?: string;
    logs?: unknown;
}

export interface RunTriggerResponse {
    status: string;
    mode: 'background' | 'synchronous';
    task_id?: string;
    result?: unknown;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

// ── Internal fetch wrapper ─────────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
    const token =
        typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options?.headers,
        },
        ...options,
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
    const formData = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(error.detail);
    }
    return res.json();
}

export async function logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
    localStorage.removeItem('access_token');
}

// ── Planning ──────────────────────────────────────────────────────────────

export async function planWorkflow(body: PlanRequest): Promise<WorkflowProposal> {
    return request<WorkflowProposal>('/plan', {
        method: 'POST',
        body: JSON.stringify(body),
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

export async function deployWorkflow(id: number): Promise<Workflow> {
    return request<Workflow>(`/workflows/${id}/deploy`, { method: 'POST' });
}

export async function deleteWorkflow(id: number): Promise<Workflow> {
    return request<Workflow>(`/workflows/${id}`, { method: 'DELETE' });
}

export async function rollbackWorkflow(
    id: number,
    versionId: number
): Promise<Workflow> {
    return request<Workflow>(`/workflows/${id}/rollback/${versionId}`, {
        method: 'POST',
    });
}

// ── Runs ──────────────────────────────────────────────────────────────────

export async function runWorkflow(
    workflowId: number,
    sandbox = false
): Promise<RunTriggerResponse> {
    return request<RunTriggerResponse>(`/workflows/${workflowId}/run`, {
        method: 'POST',
        body: JSON.stringify({ sandbox }),
    });
}

export async function listWorkflowRuns(workflowId: number): Promise<WorkflowRun[]> {
    return request<WorkflowRun[]>(`/workflows/${workflowId}/runs`);
}
