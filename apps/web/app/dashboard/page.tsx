'use client';

import React, { useEffect } from 'react';
import {
    Activity,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowUpRight,
    TrendingUp,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

// Mock dashboard data for MVP (will wire to real API in Phase 2)
const MOCK_KPIS = [
    { label: 'Total Runs This Week', value: '47', change: '+12%', icon: Activity, color: '#6366f1' },
    { label: 'Success Rate', value: '94.2%', change: '+2.1%', icon: CheckCircle2, color: '#10b981' },
    { label: 'Avg Processing Time', value: '3.2s', change: '-0.8s', icon: Clock, color: '#06b6d4' },
    { label: 'Active Drift Alerts', value: '1', change: '', icon: AlertTriangle, color: '#f59e0b' },
];

const MOCK_RUNS = [
    { id: 1, workflow: 'Reference Document Classification', triggeredBy: 'Admin User', status: 'completed', startedAt: '2 min ago', duration: '3.1s' },
    { id: 2, workflow: 'Invoice Processing', triggeredBy: 'Admin User', status: 'completed', startedAt: '15 min ago', duration: '5.4s' },
    { id: 3, workflow: 'Drawing Classification', triggeredBy: 'Admin User', status: 'failed', startedAt: '1 hour ago', duration: '1.2s' },
    { id: 4, workflow: 'Resume Screening', triggeredBy: 'Admin User', status: 'completed', startedAt: '3 hours ago', duration: '8.7s' },
    { id: 5, workflow: 'Support Ticket Routing', triggeredBy: 'Admin User', status: 'completed', startedAt: '5 hours ago', duration: '2.3s' },
];

const statusBadge = (status: string) => {
    switch (status) {
        case 'completed': return 'badge-success';
        case 'failed': return 'badge-danger';
        case 'running': return 'badge-info';
        default: return 'badge-neutral';
    }
};

export default function DashboardPage() {
    const { setActiveTab, user } = useWorkspaceStore();

    useEffect(() => {
        setActiveTab('dashboard');
    }, [setActiveTab]);

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1200, height: '100vh', overflowY: 'auto' }}>
            {/* ── Header ── */}
            <div style={{ marginBottom: 28 }} className="animate-fade-in">
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                    Welcome back, {user?.name || 'User'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Overview of your automation workflows for <strong>{user?.name || 'your'}&apos;s Organization</strong>.
                </p>
            </div>

            {/* ── KPI Cards ── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                    marginBottom: 28,
                }}
                className="animate-fade-in"
            >
                {MOCK_KPIS.map((kpi) => (
                    <div
                        key={kpi.label}
                        className="glass-card"
                        style={{
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: 80,
                                height: 80,
                                background: `radial-gradient(circle at top right, ${kpi.color}15, transparent)`,
                                borderRadius: '0 var(--radius-lg) 0 0',
                            }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: `${kpi.color}18`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <kpi.icon size={18} color={kpi.color} />
                            </div>
                            {kpi.change && (
                                <span style={{ fontSize: 11, color: kpi.change.startsWith('+') ? '#10b981' : '#06b6d4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <TrendingUp size={12} />
                                    {kpi.change}
                                </span>
                            )}
                        </div>
                        <div>
                            <p style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{kpi.value}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{kpi.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Recent Runs Table ── */}
            <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Runs</h2>
                    <button className="btn-ghost" style={{ fontSize: 12 }}>
                        View All <ArrowUpRight size={12} />
                    </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                            {['Workflow', 'Triggered By', 'Status', 'Started', 'Duration', ''].map((h) => (
                                <th
                                    key={h}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textAlign: 'left',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_RUNS.map((run) => (
                            <tr
                                key={run.id}
                                style={{
                                    borderBottom: '1px solid var(--border-default)',
                                    transition: 'background 0.1s',
                                    cursor: 'pointer',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500 }}>{run.workflow}</td>
                                <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{run.triggeredBy}</td>
                                <td style={{ padding: '12px 20px' }}>
                                    <span className={`badge ${statusBadge(run.status)}`}>{run.status}</span>
                                </td>
                                <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{run.startedAt}</td>
                                <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{run.duration}</td>
                                <td style={{ padding: '12px 20px' }}>
                                    <button className="btn-ghost" style={{ padding: '4px 8px' }}>
                                        <ArrowUpRight size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Drift Alerts ── */}
            <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <h2 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={16} color="#f59e0b" />
                        Drift Alerts
                    </h2>
                </div>
                <div style={{ padding: '16px 20px' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(245, 158, 11, 0.06)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(245, 158, 11, 0.15)',
                        }}
                    >
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Drawing Classification</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                Classification accuracy dropped from <strong style={{ color: '#10b981' }}>94.2%</strong> to <strong style={{ color: '#ef4444' }}>83.7%</strong>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>View Workflow</button>
                            <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>Rollback</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
