'use client';

import React, { useState, useEffect } from 'react';
import { 
    UserCheck, 
    Zap, 
    FileText, 
    ShieldCheck, 
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    TrendingUp,
    MessageSquare,
    ChevronDown
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface Recommendation {
    id: number;
    name: string;
    role: string;
    score: number;
    reason: string;
    workload: number;
    status: string;
}

const MOCK_RECOMMENDATIONS: Recommendation[] = [
    { 
        id: 1, 
        name: 'Jane Smith', 
        role: 'Lead Architect', 
        score: 0.95, 
        reason: 'Best match — Assembly expertise · 3 yrs historical success with PO-type docs.', 
        workload: 65,
        status: 'recommended'
    },
    { 
        id: 2, 
        name: 'John Doe', 
        role: 'Production Lead', 
        score: 0.81, 
        reason: 'Good fit — strong mechanical background, but currently managing 3 other jobs.', 
        workload: 40,
        status: 'alternative'
    },
    { 
        id: 3, 
        name: 'Robert Brown', 
        role: 'Electrical Head', 
        score: 0.54, 
        reason: 'Partial match — different specialty area. Heavy current workload.', 
        workload: 90,
        status: 'unlikely'
    },
];

interface SelectedJob {
    id: string;
    docName: string;
    type: string;
    value: string;
}

export default function DispatchPage() {
    const { setActiveTab, ghostMode, setGhostMode } = useWorkspaceStore();
    const [selectedJob, setSelectedJob] = useState<SelectedJob>({
        id: 'RUN-438',
        docName: 'PO_SEYON_2024.pdf',
        type: 'Purchase Order',
        value: '$12,500'
    });
    const [assigned, setAssigned] = useState<string | null>(null);

    useEffect(() => {
        setActiveTab('dispatch');
    }, [setActiveTab]);

    return (
        <ErrorBoundary>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                {/* --- Header --- */}
                <div style={{ 
                    padding: '16px 32px', 
                    borderBottom: '1px solid var(--border-default)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'var(--bg-secondary)',
                    zIndex: 20
                }}>
                    <div>
                        <h1 style={{ fontSize: 18, fontWeight: 700 }}>🧑‍💼 Job Dispatch & Allocation</h1>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Phase 3: AI-Assisted Team Leader Assignment</p>
                    </div>
                    <button 
                        onClick={() => setGhostMode(!ghostMode)}
                        className={`btn-ghost ${ghostMode ? 'active' : ''}`}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                            background: ghostMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: ghostMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: ghostMode ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                            borderRadius: 20, fontSize: 12, fontWeight: 600
                        }}
                    >
                        <Zap size={14} fill={ghostMode ? "currentColor" : "none"} />
                        {ghostMode ? 'Logic Active' : 'Show Logic'}
                    </button>
                </div>

                {/* --- Main Content --- */}
                <div style={{ flex: 1, padding: 32, overflowY: 'auto', position: 'relative' }}>
                    
                    {/* Ghost Overlay */}
                    {ghostMode && (
                        <div style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', zIndex: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white'
                        }}>
                            <UserCheck size={48} color="var(--accent-primary)" style={{ marginBottom: 16 }} />
                            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Recommendation Engine</h2>
                            <p style={{ opacity: 0.7, marginTop: 8 }}>Visualizing Multi-Factor Matching & Ranking Logic</p>
                            <div style={{ marginTop: 40, padding: 24, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12 }}>
                                [ Skill Matching & Workload Balancing DAG ]
                            </div>
                        </div>
                    )}

                    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32 }}>
                        
                        {/* LEFT: Selected Job Card */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Pending Job</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={20} color="var(--accent-primary)" />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: 15, fontWeight: 700 }}>{selectedJob.docName}</h4>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedJob.id}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Type</span>
                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{selectedJob.type}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Value</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>{selectedJob.value}</span>
                                    </div>
                                </div>
                                <button className="btn-secondary" style={{ width: '100%', marginTop: 24, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    Change Selected Job <ChevronDown size={14} />
                                </button>
                            </div>

                            <div className="glass-card" style={{ padding: 20, background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <ShieldCheck size={16} color="#10b981" />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>AI Confidence High</span>
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    Matching score exceeds 90%. Historical data indicates Jane Smith has handled 12 similar mechanical assembly jobs with 100% success rate.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT: Recommendations */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>🤖 AI Recommendations (Ranked)</h2>
                            
                            {assigned ? (
                                <div className="glass-card animate-fade-in" style={{ padding: 40, textAlign: 'center', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                        <CheckCircle2 size={32} color="white" />
                                    </div>
                                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Assignment Confirmed!</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Job <strong>{selectedJob.docName}</strong> has been assigned to <strong>{assigned}</strong>.</p>
                                    <button onClick={() => setAssigned(null)} className="btn-primary">Process Next Job</button>
                                </div>
                            ) : (
                                MOCK_RECOMMENDATIONS.map((rec, i) => (
                                    <div key={rec.id} className="glass-card" style={{ 
                                        padding: 24, display: 'flex', gap: 20, position: 'relative',
                                        borderLeft: i === 0 ? '4px solid #10b981' : '1px solid var(--border-default)',
                                        background: i === 0 ? 'rgba(16, 185, 129, 0.02)' : 'rgba(255,255,255,0.02)'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{rec.name[0]}</span>
                                                    </div>
                                                    <div>
                                                        <h4 style={{ fontSize: 15, fontWeight: 700 }}>{rec.name}</h4>
                                                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rec.role}</p>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                                        <TrendingUp size={14} color={rec.score > 0.8 ? '#10b981' : '#f59e0b'} />
                                                        <span style={{ fontSize: 16, fontWeight: 800, color: rec.score > 0.8 ? '#10b981' : '#f59e0b' }}>{(rec.score * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Match Score</span>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                                <MessageSquare size={14} style={{ marginTop: 2, flexShrink: 0, color: 'var(--accent-primary)' }} />
                                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                    "{rec.reason}"
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Current Workload</span>
                                                        <span style={{ fontSize: 10, fontWeight: 700 }}>{rec.workload}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                                        <div style={{ width: `${rec.workload}%`, height: '100%', background: rec.workload > 80 ? '#ef4444' : '#10b981', borderRadius: 2 }} />
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setAssigned(rec.name)}
                                                    className={i === 0 ? "btn-primary" : "btn-secondary"} 
                                                    style={{ padding: '8px 20px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}
                                                >
                                                    {i === 0 ? <ShieldCheck size={14} /> : null}
                                                    {i === 0 ? 'Assign Recommended' : 'Assign'}
                                                    <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            
                            {!assigned && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 12, marginTop: 12 }}>
                                    <AlertTriangle size={18} color="#f59e0b" />
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        Manual override enabled. Admin can verify AI suggestions before final allocation.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
