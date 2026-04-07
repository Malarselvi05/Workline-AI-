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
import { getWorkflow, runWorkflow, rollbackWorkflow, getWorkflowVersions, Workflow, WorkflowDetail, approveNode, rejectNode } from '@/lib/api';
import DeployModal from '@/components/canvas/DeployModal';
import { useQuery } from '@tanstack/react-query';
import { getWorkflowRuns, getRunDetail } from '@/lib/api';

const TABS = [
    { id: 'runs', label: 'Runs', icon: Activity },
    { id: 'results', label: 'Results', icon: FileText },
    { id: 'edit', label: 'Edit', icon: Zap },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
];

// MOCK_DETAIL_RUNS removed

const statusBadge = (status: string) => {
  console.log("[JS] page.tsx | statusBadge | L39: System checking in");
    switch (status) {
        case 'completed': return 'badge-success';
        case 'failed': return 'badge-danger';
        case 'running': return 'badge-info';
        case 'awaiting_review': return 'badge-warning';
        case 'waiting': return 'badge-warning';
        case 'skipped': return 'badge-neutral';
        default: return 'badge-neutral';
    }
};

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
    const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

    // Real API data
    const [workflowDetail, setWorkflowDetail] = useState<WorkflowDetail | null>(null);
    const [versionHistory, setVersionHistory] = useState<Workflow[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(true);

    const { setActiveWorkflow, workflows, updateWorkflowStatus, user } = useWorkspaceStore();
    const isEditor = user?.role === 'admin' || user?.role === 'editor';

    // Prefer real detail from API; fall back to workspaceStore
    const workflow = workflowDetail ?? workflows.find((w) => w.id === workflowId);


    const showToast = (message: string, type: 'success' | 'error') => {
      console.log("[JS] page.tsx | showToast | L75: Data processing");
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
      console.log("[JS] page.tsx | handleRun | L102: Antigravity active");
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
      console.log("[JS] page.tsx | handleDeployed | L114: Keep it up");
        // DeployModal already called deployWorkflow(); now refresh detail
        updateWorkflowStatus(workflowId, 'active');
        await fetchDetail();
        showToast('Workflow is now Active!', 'success');
    };

    // ── Rollback ──────────────────────────────────────────────────────────────
    const handleRollback = async (versionId: number) => {
      console.log("[JS] page.tsx | handleRollback | L122: System checking in");
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

    // ── Runs Data ─────────────────────────────────────────────────────────────
    const { data: runs, isLoading: runsLoading, refetch: refetchRuns } = useQuery({
        queryKey: ['workflow', workflowId, 'runs'],
        queryFn: () => getWorkflowRuns(workflowId),
        enabled: !!workflowId,
    });

    const { data: runDetail, isLoading: detailLoading, refetch: refetchRunDetail } = useQuery({
        queryKey: ['run', selectedRunId],
        queryFn: () => getRunDetail(selectedRunId!),
        enabled: !!selectedRunId,
    });

    // ── Approval Handlers ────────────────────────────────────────────────────
    const handleApprove = async (nodeId: string) => {
      console.log("[JS] page.tsx | handleApprove | L150: Data processing");
        if (!selectedRunId) return;
        try {
            await approveNode(selectedRunId, nodeId);
            showToast('Decision approved! Workflow is resuming...', 'success');
            await refetchRunDetail();
            await refetchRuns();
        } catch (err) {
            showToast('Failed to approve', 'error');
        }
    };

    const handleReject = async (nodeId: string) => {
      console.log("[JS] page.tsx | handleReject | L162: Keep it up");
        if (!selectedRunId) return;
        try {
            await rejectNode(selectedRunId, nodeId);
            showToast('Decision rejected. Workflow failed.', 'success');
            await refetchRunDetail();
            await refetchRuns();
        } catch (err) {
            showToast('Failed to reject', 'error');
        }
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
                    <div style={{ display: 'grid', gridTemplateColumns: selectedRunId ? '350px 1fr' : '1fr', gap: 20 }}>
                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 13, fontWeight: 600 }}>Run History</h3>
                                <button className="btn-ghost" onClick={() => refetchRuns()} style={{ padding: 4 }}>
                                    <RefreshCw size={12} />
                                </button>
                            </div>
                            {runsLoading ? (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                            ) : runs?.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No runs yet</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                            {['ID', 'Status', 'Started'].map((h) => (
                                                <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase' }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {runs?.map((run) => (
                                            <tr 
                                                key={run.id} 
                                                onClick={() => setSelectedRunId(run.id)}
                                                style={{ 
                                                    borderBottom: '1px solid var(--border-default)', 
                                                    cursor: 'pointer',
                                                    background: selectedRunId === run.id ? 'rgba(99,102,241,0.08)' : 'transparent'
                                                }}
                                            >
                                                <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 500 }}>#{run.id}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span className={`badge ${statusBadge(run.status)}`} style={{ fontSize: 9, padding: '2px 6px' }}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-secondary)' }}>
                                                    {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {selectedRunId && (
                            <div className="glass-card animate-fade-in" style={{ padding: 20 }}>
                                {detailLoading ? (
                                    <div style={{ textAlign: 'center', padding: 40 }}>Loading run details...</div>
                                ) : runDetail ? (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                            <div>
                                                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Run #{selectedRunId}</h3>
                                                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    Executed on {new Date(runDetail.run.started_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <button className="btn-secondary" onClick={() => setSelectedRunId(null)} style={{ padding: '4px 8px' }}>Close</button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Execution Timeline</h4>
                                            {runDetail.node_states.map((state: any, idx: number) => (
                                                <div key={state.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                                                    {/* Vertical Line */}
                                                    {idx < runDetail.node_states.length - 1 && (
                                                        <div style={{ position: 'absolute', top: 16, left: 7, bottom: -16, width: 2, background: 'var(--border-default)' }}></div>
                                                    )}
                                                    
                                                    <div style={{ 
                                                        width: 16, height: 16, borderRadius: '50%', 
                                                        background: state.status === 'completed' ? '#10b981' : state.status === 'failed' ? '#ef4444' : 'var(--border-default)',
                                                        zIndex: 1, marginTop: 2, border: '3px solid var(--bg-card)'
                                                    }}></div>
                                                    
                                                    <div style={{ flex: 1, paddingBottom: 16 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{workflowDetail?.nodes.find(n => n.id === state.node_id)?.data.label || state.node_id}</span>
                                                            <span className={`badge ${statusBadge(state.status)}`} style={{ fontSize: 9 }}>{state.status}</span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                            {state.started_at && new Date(state.started_at).toLocaleTimeString()} 
                                                            {state.ended_at && state.started_at && ` · ${( (new Date(state.ended_at).getTime() - new Date(state.started_at).getTime()) / 1000 ).toFixed(1)}s`}
                                                        </div>
                                                        {state.error && (
                                                            <div style={{ marginTop: 8, padding: 8, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 4, color: '#ef4444', fontSize: 11, fontFamily: 'monospace' }}>
                                                                {state.error}
                                                            </div>
                                                        )}
                                                        {state.status === 'awaiting_review' && (
                                                            <div style={{ 
                                                                marginTop: 12, padding: '14px', 
                                                                background: 'rgba(245, 158, 11, 0.05)', 
                                                                border: '1px solid rgba(245, 158, 11, 0.2)', 
                                                                borderRadius: 8 
                                                            }}>
                                                                <p style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 10 }}>Action Required: Human Review</p>
                                                                <div style={{ display: 'flex', gap: 8 }}>
                                                                    <button className="btn-primary" onClick={() => handleApprove(state.node_id)} style={{ flex: 1, background: '#10b981', fontSize: 11 }}>Approve & Resume</button>
                                                                    <button className="btn-secondary" onClick={() => handleReject(state.node_id)} style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444', fontSize: 11 }}>Reject</button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {state.output_json && (
                                                            <details style={{ marginTop: 6 }}>
                                                                <summary style={{ fontSize: 11, color: 'var(--accent-primary)', cursor: 'pointer' }}>View Output</summary>
                                                                <pre style={{ marginTop: 4, padding: 8, background: 'var(--bg-primary)', borderRadius: 4, fontSize: 10, overflowX: 'auto' }}>
                                                                    {JSON.stringify(state.output_json, null, 2)}
                                                                </pre>
                                                            </details>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 40 }}>Run details not found</div>
                                )}
                            </div>
                        )}
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