/**
 * packages/shared-types/api_schemas.ts
 * Shared TypeScript request/response types for every WorkLine AI endpoint.
 * Import from here in api.ts and all frontend stores.
 *
 * Keep in sync with api_schemas.py (Python side).
 */

// ── Block / Node / Edge ───────────────────────────────────────────────────

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

// ── Planning ──────────────────────────────────────────────────────────────

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

// ── Workflows ─────────────────────────────────────────────────────────────

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

// ── Domain Packs ──────────────────────────────────────────────────────────

export interface DomainPack {
    name: string;
    status: 'installed' | 'available';
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface LoginRequest {
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

// ── Runs ──────────────────────────────────────────────────────────────────

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