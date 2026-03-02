'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { createWorkflow } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useCanvasStore } from '@/stores/canvasStore';

interface SaveModalProps {
    open: boolean;
    onClose: () => void;
    onSaved: (workflowId: number) => void;
}

export default function SaveModal({ open, onClose, onSaved }: SaveModalProps) {
    const { nodes, edges } = useCanvasStore();
    const { addWorkflowTab } = useWorkspaceStore();

    // Pre-fill name from first node label
    const defaultName = nodes[0]?.data?.label
        ? `${nodes[0].data.label} Flow`
        : 'Untitled Workflow';

    const [name, setName] = useState(defaultName);
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    // Reset + re-focus whenever modal opens
    useEffect(() => {
        if (open) {
            setName(defaultName);
            setDescription('');
            setError(null);
            setSaving(false);
            setTimeout(() => nameRef.current?.focus(), 80);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSave = async () => {
        if (!name.trim()) { setError('Workflow name is required.'); return; }
        setSaving(true);
        setError(null);
        try {
            const workflowData = {
                name: name.trim(),
                description: description.trim() || `Workflow with ${nodes.length} blocks`,
                nodes: nodes.map((n) => ({
                    id: n.id,
                    type: n.data.blockType || n.type || 'unknown',
                    position: n.position,
                    data: { label: n.data.label, config: n.data.config || {} },
                    reasoning: n.data.reasoning || '',
                })),
                edges: edges.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    edge_type: (e.data?.edge_type as 'default' | 'condition_true' | 'condition_false') || 'default',
                })),
            };
            const result = await createWorkflow(workflowData);
            addWorkflowTab({
                id: result.id,
                name: workflowData.name,
                description: workflowData.description,
                status: 'draft',
                version: result.version || 1,
                created_at: result.created_at || new Date().toISOString(),
            });
            onSaved(result.id);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed. Please try again.');
        }
        setSaving(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
        if (e.key === 'Escape') onClose();
    };

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="glass-card animate-fade-in"
                style={{ width: 440, padding: 28, position: 'relative' }}
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Save size={15} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Save Workflow</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {nodes.length} block{nodes.length !== 1 ? 's' : ''} · {edges.length} connection{edges.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        style={{ marginLeft: 'auto' }}
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                            Workflow Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            ref={nameRef}
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Document Intake Flow"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                            Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                        </label>
                        <textarea
                            className="input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this workflow do?"
                            rows={3}
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                        }}>
                            <AlertCircle size={14} color="#f87171" />
                            <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button className="btn-secondary" onClick={onClose} disabled={saving} style={{ fontSize: 13 }}>
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleSave}
                            disabled={saving || !name.trim()}
                            style={{ fontSize: 13, minWidth: 120 }}
                        >
                            {saving ? (
                                <>
                                    <span style={{ animation: 'spin-slow 1s linear infinite', display: 'inline-block' }}>⟳</span>
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Save size={13} />
                                    Save Workflow
                                </>
                            )}
                        </button>
                    </div>

                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                        Tip: Press <kbd style={{ background: 'var(--bg-primary)', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>Ctrl+Enter</kbd> to save quickly
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Mini success toast helper (used by parent after modal closes) ───────────
export function SaveSuccessToast({ name }: { name: string }) {
    return (
        <div className="toast toast-success">
            <CheckCircle size={14} />
            Workflow &quot;{name}&quot; saved! Tab added to sidebar.
        </div>
    );
}
