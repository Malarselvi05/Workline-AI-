'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
    Play,
    FileText,
    Settings,
    Activity,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    RefreshCw,
    History,
    RotateCcw,
    Rocket,
    AlertCircle,
    CheckCircle,
    Clock,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getWorkflow, runWorkflow, rollbackWorkflow, getWorkflowVersions, Workflow, WorkflowDetail } from '@/lib/api';
import DeployModal from '@/components/canvas/DeployModal';

const TABS = [
    { id: 'runs', label: 'Runs', icon: Activity },
    { id: 'results', label: 'Results', icon: FileText },
    { id: 'edit', label: 'Edit', icon: Zap },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const MOCK_DETAIL_RUNS = [
    { id: 1, status: 'completed', startedAt: '2026-03-03 10:01:23', duration: '3.1s', blocks: 3, triggeredBy: 'Admin' },
    { id: 2, status: 'completed', startedAt: '2026-03-03 09:45:12', duration: '5.4s', blocks: 3, triggeredBy: 'Admin' },
    { id: 3, status: 'failed', startedAt: '2026-03-03 08:30:00', duration: '1.2s', blocks: 2, triggeredBy: 'API' },
];

export default function WorkflowDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const workflowId = Number(params.id);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'runs');
    const [running, setRunning] = useState(false);
    const [rolling, setRolling] = useState<number | null>(null);
    const [deployModalOpen, setDeployModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Real API data
    const [workflowDetail, setWorkflowDetail] = useState<WorkflowDetail | null>(null);
    const [versionHistory, setVersionHistory] = useState<Workflow[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(true);

    const { setActiveWorkflow, workflows, updateWorkflowStatus, user } = useWorkspaceStore();
    const isEditor = user?.role === 'admin' || user?.role === 'editor';

    // Prefer real detail from API; fall back to workspaceStore
    const workflow = workflowDetail ?? workflows.find((w) => w.id === workflowId);


    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Fetch workflow detail + version history ────────────────────────────────
    const fetchDetail = useCallback(async () => {
        setLoadingDetail(true);
        try {
            const detail = await getWorkflow(workflowId);
            setWorkflowDetail(detail);

            const history = await getWorkflowVersions(workflowId);
            // Show all versions except this one (historic)
            setVersionHistory(history.filter(w => w.id !== workflowId));
        } catch {
            // Silently fall back to store data
        }
        setLoadingDetail(false);
    }, [workflowId]);

    useEffect(() => {
        setActiveWorkflow(workflowId);
        fetchDetail();
    }, [workflowId, setActiveWorkflow, fetchDetail]);

    // ── Run ───────────────────────────────────────────────────────────────────
    const handleRun = async () => {
        setRunning(true);
        try {
            const result = await runWorkflow(workflowId);
            showToast(`Run ${result.mode}: ${result.status}`, 'success');
        } catch (err) {
            showToast(`Run failed: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
        }
        setRunning(false);
    };

    // ── Deploy (from detail page) ─────────────────────────────────────────────
    const handleDeployed = async () => {
        // DeployModal already called deployWorkflow(); now refresh detail
        updateWorkflowStatus(workflowId, 'active');
        await fetchDetail();
        showToast('Workflow is now Active!', 'success');
    };

    // ── Rollback ──────────────────────────────────────────────────────────────
    const handleRollback = async (versionId: number) => {
        if (!confirm(`Roll back to version #${versionId}? A new draft will be created.`)) return;
        setRolling(versionId);
        try {
            const result = await rollbackWorkflow(workflowId, versionId);
            showToast('Rollback successful! A new draft version has been created.', 'success');
            // Redirect to the NEW workflow ID
            router.push(`/workflow/${result.id}?tab=settings`);
        } catch (err) {
            showToast(`Rollback failed: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
        }
        setRolling(null);
    };

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1000, height: '100vh', overflowY: 'auto' }}>
            {/* ── Header ── */}
            <div className="animate-fade-in" style={{ marginBottom: 24 }}>
                <Link href="/automate" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                    <ArrowLeft size={14} /> Back to Canvas
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700 }}>
                            {loadingDetail && !workflow ? `Workflow #${workflowId}` : workflow?.name || `Workflow #${workflowId}`}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                            {workflow?.description || 'Workflow details and run history.'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className={`badge ${workflow?.status === 'active' ? 'badge-success' :
                            workflow?.status === 'archived' ? 'badge-neutral' : 'badge-warning'
                            }`}>
                            {workflow?.status || 'draft'}
                        </span>

                        {/* Deploy from detail page */}
                        {isEditor && workflow?.status !== 'active' && (
                            <button
                                className="btn-secondary"
                                onClick={() => setDeployModalOpen(true)}
                                style={{ fontSize: 12 }}
                            >
                                <Rocket size={13} />
                                Deploy
                            </button>
                        )}

                        <button className="btn-primary" onClick={handleRun} disabled={running}>
                            {running ? <RefreshCw size={14} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Play size={14} />}
                            {running ? 'Running...' : 'Run Now'}
                        </button>
                    </div>
                </div>
                {!loadingDetail && workflow && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Version {workflow.version}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Created {new Date(workflow.created_at).toLocaleString()}
                        </span>
                        {workflowDetail?.nodes && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {workflowDetail.nodes.length} nodes · {workflowDetail.edges.length} edges
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)', marginBottom: 24 }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 18px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ── */}
            <div className="animate-fade-in">
                {/* RUNS TAB */}
                {activeTab === 'runs' && (
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                    {['Run ID', 'Status', 'Started At', 'Duration', 'Blocks', 'Triggered By'].map((h) => (
                                        <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_DETAIL_RUNS.map((run) => (
                                    <tr key={run.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>#{run.id}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span className={`badge ${run.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                                                {run.status === 'completed' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                {run.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{run.startedAt}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{run.duration}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{run.blocks}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{run.triggeredBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* RESULTS TAB */}
                {activeTab === 'results' && (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No Results Yet</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Run the workflow to see results here.</p>
                    </div>
                )}

                {/* EDIT TAB */}
                {activeTab === 'edit' && (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                        <Zap size={40} color="var(--accent-primary)" style={{ margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Interactive Canvas</p>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 20px' }}>
                            View and edit your workflow logic directly on the 2D graph canvas. Add new blocks, change connections, and re-simulate.
                        </p>
                        {isEditor ? (
                            <Link href={`/automate?load=${workflowId}`} className="btn-primary" style={{ display: 'inline-flex', width: 'auto' }}>
                                Open in Editor
                            </Link>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300 }}>
                                    You have read-only access to this workflow. You can view the logic on the canvas but cannot make changes.
                                </p>
                                <Link href={`/automate?load=${workflowId}`} className="btn-secondary" style={{ display: 'inline-flex', width: 'auto' }}>
                                    View in Canvas
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* LOGS TAB */}
                {activeTab === 'logs' && (
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                            <p><span style={{ color: '#10b981' }}>[INFO]</span> Workflow #{workflowId} started</p>
                            <p><span style={{ color: '#06b6d4' }}>[EXEC]</span> Node 1: File Upload → <span style={{ color: '#10b981' }}>OK</span> (1.2s)</p>
                            <p><span style={{ color: '#06b6d4' }}>[EXEC]</span> Node 2: Document Classification → <span style={{ color: '#10b981' }}>OK</span> (0.8s)</p>
                            <p><span style={{ color: '#06b6d4' }}>[EXEC]</span> Node 3: Secure Storage → <span style={{ color: '#10b981' }}>OK</span> (1.1s)</p>
                            <p><span style={{ color: '#10b981' }}>[DONE]</span> Workflow completed in 3.1s</p>
                        </div>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Workflow settings */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Workflow Settings</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Workflow Name</label>
                                    <input className="input" defaultValue={workflow?.name || ''} style={{ maxWidth: 400 }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
                                    <textarea className="input" defaultValue={workflow?.description || ''} rows={3} style={{ maxWidth: 400, resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn-primary">Save Changes</button>
                                    <button className="btn-secondary" style={{ color: '#ef4444' }}>Delete Workflow</button>
                                </div>
                            </div>
                        </div>

                        {/* ── Version History ── */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <History size={16} color="var(--text-secondary)" />
                                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Version History</h3>
                            </div>

                            {/* Current version */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: 'rgba(99,102,241,0.06)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: 8,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>v{workflow?.version ?? 1}</span>
                                    <span className="badge badge-success">Current</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {workflow?.created_at ? new Date(workflow.created_at).toLocaleString() : '—'}
                                    </span>
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status: {workflow?.status || 'draft'}</span>
                            </div>

                            {/* Historical versions */}
                            {versionHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                    <Clock size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>No previous versions</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Deploy this workflow to create a version snapshot that you can roll back to.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {versionHistory.map((v) => (
                                        <div
                                            key={v.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 16px',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: 'var(--radius-sm)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: 13, fontWeight: 500 }}>v{v.version}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {new Date(v.created_at).toLocaleString()}
                                                </span>
                                                <span className={`badge ${v.status === 'active' ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 9 }}>
                                                    {v.status}
                                                </span>
                                            </div>
                                            {isEditor && (
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => handleRollback(v.id)}
                                                    disabled={rolling === v.id}
                                                    style={{ fontSize: 11 }}
                                                >
                                                    {rolling === v.id ? (
                                                        <RefreshCw size={12} style={{ animation: 'spin-slow 1s linear infinite' }} />
                                                    ) : (
                                                        <RotateCcw size={12} />
                                                    )}
                                                    {rolling === v.id ? 'Rolling back…' : 'Rollback to this version'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {toast.message}
                </div>
            )}

            {/* Deploy Modal */}
            <DeployModal
                open={deployModalOpen}
                workflowId={workflowId}
                workflowName={workflow?.name ?? `Workflow #${workflowId}`}
                onClose={() => setDeployModalOpen(false)}
                onDeployed={handleDeployed}
            />
        </div>
    );
}
