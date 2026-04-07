'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Rocket, X, AlertCircle, ShieldCheck } from 'lucide-react';
import { deployWorkflow } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface DeployModalProps {
    open: boolean;
    workflowId: number;
    workflowName: string;
    onClose: () => void;
    onDeployed: () => void;
}

export default function DeployModal({
    open,
    workflowId,
    workflowName,
    onClose,
    onDeployed,
}: DeployModalProps) {
    const { updateWorkflowStatus } = useWorkspaceStore();
    const [deploying, setDeploying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) { 
            setError(null); 
            setDeploying(false); 
            setTimeout(() => modalRef.current?.focus(), 80);
        }
    }, [open]);

    const handleDeploy = async () => {
        setDeploying(true);
        setError(null);
        try {
            await deployWorkflow(workflowId);
            updateWorkflowStatus(workflowId, 'active');
            onDeployed();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Deploy failed. Please try again.');
        }
        setDeploying(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleDeploy();
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
                style={{ width: 420, padding: 28, position: 'relative', outline: 'none' }}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                ref={modalRef}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Rocket size={15} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Deploy Workflow</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            This action cannot be undone
                        </p>
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ marginLeft: 'auto' }} title="Close">
                        <X size={16} />
                    </button>
                </div>

                {/* Warning card */}
                <div style={{
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px 16px',
                    marginBottom: 20,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <ShieldCheck size={18} color="#818cf8" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                                Deploy &quot;{workflowName}&quot;?
                            </p>
                            <ul style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 0, listStyle: 'none' }}>
                                <li>✓ Workflow status will change to <strong>Active</strong></li>
                                <li>✓ An audit log entry will be written</li>
                                <li>✓ The previous version will be archived</li>
                                <li>✓ The workflow can be rolled back from Settings</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 14,
                    }}>
                        <AlertCircle size={14} color="#f87171" />
                        <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={onClose} disabled={deploying} style={{ fontSize: 13 }}>
                        Cancel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleDeploy}
                        disabled={deploying}
                        style={{ fontSize: 13, minWidth: 130 }}
                    >
                        {deploying ? (
                            <>
                                <span style={{ animation: 'spin-slow 1s linear infinite', display: 'inline-block' }}>⟳</span>
                                Deploying…
                            </>
                        ) : (
                            <>
                                <Rocket size={13} />
                                Confirm Deploy
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
