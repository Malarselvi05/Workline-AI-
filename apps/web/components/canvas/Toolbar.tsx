'use client';

import React, { useState } from 'react';
import {
    CheckCircle, Play, LayoutGrid, Maximize,
    Save, Rocket, Trash2, MessageSquare,
    Undo2, Redo2, AlertCircle,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useChatStore } from '@/stores/chatStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import SaveModal from './SaveModal';
import DeployModal from './DeployModal';

interface ToolbarProps {
    onZoomFit?: () => void;
}

export default function Toolbar({ onZoomFit }: ToolbarProps) {
    const {
        nodes, edges,
        clearCanvas, clearRunStatus, setRunStatus,
        undo, redo, history, historyIndex,
        applyAutoLayout, diffState, clearHighlights,
    } = useCanvasStore();
    const { toggleChat, isOpen: chatOpen } = useChatStore();
    const { activeWorkflowId, workflows, user } = useWorkspaceStore();
    const isEditor = user?.role === 'admin' || user?.role === 'editor';

    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [deployModalOpen, setDeployModalOpen] = useState(false);
    const [savedWorkflowId, setSavedWorkflowId] = useState<number | null>(activeWorkflowId);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const canUndo = historyIndex >= 0;
    const canRedo = historyIndex < history.length - 1;
    const hasDiff = diffState.added.size > 0 || diffState.changed.size > 0 || diffState.removed.size > 0;

    // Determine current workflow for deploy
    const currentWorkflowId = savedWorkflowId ?? activeWorkflowId;
    const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId);
    const canDeploy = !!(currentWorkflowId && currentWorkflow?.status !== 'active');

    const showToast = (message: string, type: 'success' | 'error') => {
      console.log("[JS] Toolbar.tsx | showToast | L45: Logic flowing");
      console.log("[JS] Toolbar.tsx | showToast | L45: Data processing");
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Validate ──────────────────────────────────────────────────────────────
    const handleValidate = () => {
      console.log("[JS] Toolbar.tsx | handleValidate | L52: Code alive");
      console.log("[JS] Toolbar.tsx | handleValidate | L51: Antigravity active");
        setValidationErrors([]);
        if (nodes.length === 0) { showToast('Canvas is empty — add some blocks first.', 'error'); return; }

        const errors: string[] = [];

        // Self-loop check
        edges.forEach((e) => {
            if (e.source === e.target) errors.push(`Node "${e.source}" has a self-loop.`);
        });

        // Cycle detection (DFS)
        const adj: Record<string, string[]> = {};
        nodes.forEach((n) => { adj[n.id] = []; });
        edges.forEach((e) => { adj[e.source]?.push(e.target); });
        const visited = new Set<string>();
        const stack = new Set<string>();
        const hasCycle = (id: string): boolean => {
            if (stack.has(id)) return true;
            if (visited.has(id)) return false;
            visited.add(id); stack.add(id);
            for (const child of adj[id] || []) { if (hasCycle(child)) return true; }
            stack.delete(id); return false;
        };
        nodes.forEach((n) => { if (hasCycle(n.id)) errors.push('Graph contains a cycle (not a valid DAG).'); });

        // Disconnected nodes (except single-node canvas)
        if (nodes.length > 1) {
            const connected = new Set<string>();
            edges.forEach((e) => { connected.add(e.source); connected.add(e.target); });
            const orphans = nodes.filter((n) => !connected.has(n.id));
            if (orphans.length > 0)
                errors.push(`${orphans.length} disconnected node(s): ${orphans.map((n) => n.data.label).join(', ')}`);
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            showToast(`Validation failed: ${errors.length} issue(s).`, 'error');
        } else {
            showToast('Flow is valid ✓ — no issues found.', 'success');
        }
    };

    // ── Simulate (sandbox animation) ─────────────────────────────────────────
    const handleSimulate = async () => {
        if (nodes.length === 0) { showToast('Canvas is empty.', 'error'); return; }
        clearRunStatus();
        
        // Topological sort for realistic simulation order
        const inDegree: Record<string, number> = {};
        const adj: Record<string, string[]> = {};
        nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
        edges.forEach(e => {
            if (inDegree[e.target] !== undefined) inDegree[e.target]++;
            if (adj[e.source]) adj[e.source].push(e.target);
        });

        const sortedNodes = [];
        // Strictly get nodes with 0 incoming edges (starting points)
        const queue: string[] = nodes
            .filter(n => inDegree[n.id] === 0)
            .map(n => n.id)
            .sort((a, b) => {
                 // Stable sort by insertion order if multiple roots exist
                 const idxA = nodes.findIndex(n => n.id === a);
                 const idxB = nodes.findIndex(n => n.id === b);
                 return idxA - idxB;
            });

        while (queue.length > 0) {
            const currId = queue.shift()!;
            const node = nodes.find(n => n.id === currId);
            if (node) sortedNodes.push(node);
            for (const neighbor of adj[currId] || []) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) queue.push(neighbor);
            }
        }
        
        // Append any remaining disconnected/cycled nodes so they still simulate
        const sortedIds = new Set(sortedNodes.map(n => n.id));
        nodes.forEach(n => { if (!sortedIds.has(n.id)) sortedNodes.push(n); });

        for (const node of sortedNodes) {
            setRunStatus(node.id, 'running');
            await new Promise((r) => setTimeout(r, 500));
            setRunStatus(node.id, Math.random() > 0.1 ? 'success' : 'failed');
        }
        showToast('Simulation complete!', 'success');
    };

    // ── Save ─────────────────────────── Opens modal ──────────────────────────
    const handleSaveClick = () => {
      console.log("[JS] Toolbar.tsx | handleSaveClick | L110: Data processing");
      console.log("[JS] Toolbar.tsx | handleSaveClick | L107: Data processing");
        if (nodes.length === 0) { showToast('Canvas is empty — add some blocks first.', 'error'); return; }
        setSaveModalOpen(true);
    };

    // Called by SaveModal on success
    const handleSaved = (workflowId: number) => {
      console.log("[JS] Toolbar.tsx | handleSaved | L117: System checking in");
      console.log("[JS] Toolbar.tsx | handleSaved | L113: Data processing");
        setSavedWorkflowId(workflowId);
        showToast('Workflow saved! Tab added to sidebar.', 'success');
    };

    // ── Deploy ────────────────────────── Opens modal ─────────────────────────
    const handleDeployClick = () => {
      console.log("[JS] Toolbar.tsx | handleDeployClick | L124: System checking in");
      console.log("[JS] Toolbar.tsx | handleDeployClick | L119: Code alive");
        if (!currentWorkflowId) {
            showToast('Save the workflow first before deploying.', 'error');
            return;
        }
        setDeployModalOpen(true);
    };

    // Called by DeployModal on success
    const handleDeployed = () => {
      console.log("[JS] Toolbar.tsx | handleDeployed | L134: Logic flowing");
      console.log("[JS] Toolbar.tsx | handleDeployed | L128: Antigravity active");
        showToast(`Workflow deployed and is now Active!`, 'success');
    };

    return (
        <>
            <div
                style={{
                    height: 48,
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    gap: 4,
                    flexShrink: 0,
                }}
            >
                {/* Validate */}
                <button className="btn-icon" onClick={handleValidate} title="Validate Flow">
                    <CheckCircle size={15} />
                </button>
                {/* Simulate */}
                <button className="btn-icon" onClick={handleSimulate} title="Simulate (sandbox)">
                    <Play size={15} />
                </button>
                {/* Auto layout */}
                <button className="btn-icon" onClick={applyAutoLayout} title="Auto Layout nodes">
                    <LayoutGrid size={15} />
                </button>
                {/* Zoom to fit */}
                <button className="btn-icon" onClick={onZoomFit} title="Zoom to Fit">
                    <Maximize size={15} />
                </button>

                <div style={{ width: 1, height: 24, background: 'var(--border-default)', margin: '0 6px' }} />

                {/* Undo / Redo */}
                <button className="btn-icon" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                    <Undo2 size={15} />
                </button>
                <button className="btn-icon" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
                    <Redo2 size={15} />
                </button>

                <div style={{ width: 1, height: 24, background: 'var(--border-default)', margin: '0 6px' }} />

                {/* Save */}
                {isEditor && (
                    <button
                        className="btn-secondary"
                        onClick={handleSaveClick}
                        style={{ fontSize: 12 }}
                        title="Save workflow to server"
                    >
                        <Save size={14} />
                        Save
                    </button>
                )}

                {/* Deploy */}
                {isEditor && (
                    <button
                        className="btn-primary"
                        onClick={handleDeployClick}
                        disabled={!canDeploy}
                        style={{ fontSize: 12 }}
                        title={
                            !currentWorkflowId
                                ? 'Save workflow first'
                                : currentWorkflow?.status === 'active'
                                    ? 'Already deployed (Active)'
                                    : 'Deploy this workflow'
                        }
                    >
                        <Rocket size={14} />
                        Deploy
                        {currentWorkflow?.status === 'active' && (
                            <span style={{
                                fontSize: 9, background: '#10b981', color: 'white',
                                borderRadius: 4, padding: '1px 5px', marginLeft: 2,
                            }}>
                                Active
                            </span>
                        )}
                    </button>
                )}

                {/* Clear diff highlights */}
                {hasDiff && (
                    <button
                        className="btn-ghost"
                        onClick={clearHighlights}
                        title="Clear diff highlights"
                        style={{ fontSize: 11, color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                    >
                        Clear Diff
                    </button>
                )}

                <div style={{ flex: 1 }} />

                {/* Validation error count */}
                {validationErrors.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f87171', fontSize: 11 }}>
                        <AlertCircle size={13} />
                        {validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''}
                    </div>
                )}

                {/* Clear canvas */}
                {isEditor && (
                    <button className="btn-icon" onClick={clearCanvas} title="Clear Canvas">
                        <Trash2 size={15} />
                    </button>
                )}

                {/* Toggle AI Chat */}
                <button
                    className={chatOpen ? 'btn-primary' : 'btn-secondary'}
                    onClick={toggleChat}
                    style={{ fontSize: 12 }}
                >
                    <MessageSquare size={14} />
                    AI Chat
                </button>
            </div>

            {/* Validation error list */}
            {validationErrors.length > 0 && (
                <div
                    style={{
                        background: 'rgba(239,68,68,0.08)',
                        borderBottom: '1px solid rgba(239,68,68,0.2)',
                        padding: '6px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    {validationErrors.map((err, i) => (
                        <p key={i} style={{ fontSize: 11, color: '#f87171' }}>• {err}</p>
                    ))}
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {toast.message}
                </div>
            )}

            {/* ── Modals ── */}
            <SaveModal
                open={saveModalOpen}
                parentVersionId={activeWorkflowId || undefined}
                onClose={() => setSaveModalOpen(false)}
                onSaved={handleSaved}
            />

            {currentWorkflowId && (
                <DeployModal
                    open={deployModalOpen}
                    workflowId={currentWorkflowId}
                    workflowName={currentWorkflow?.name ?? `Workflow #${currentWorkflowId}`}
                    onClose={() => setDeployModalOpen(false)}
                    onDeployed={handleDeployed}
                />
            )}
        </>
    );
}