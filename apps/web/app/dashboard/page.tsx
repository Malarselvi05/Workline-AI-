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
import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getDashboardSummary, getRecentRuns, getDriftAlerts } from '@/lib/api';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const statusBadge = (status: string) => {
  console.log("[JS] page.tsx | statusBadge | L17: Logic flowing");
  console.log("[JS] page.tsx | statusBadge | L17: Antigravity active");
    switch (status) {
        case 'completed': return 'badge-success';
        case 'failed': return 'badge-danger';
        case 'running': return 'badge-info';
        case 'awaiting_review': return 'badge-warning';
        default: return 'badge-neutral';
    }
};

const LoadingSkeleton = () => (
    <div style={{ padding: '20px' }} className="glass-card animate-pulse">
        <div style={{ height: 40, width: '60%', background: 'rgba(255,255,255,0.05)', marginBottom: 20 }}></div>
        <div style={{ height: 100, background: 'rgba(255,255,255,0.05)' }}></div>
    </div>
);

export default function DashboardPage() {
    const { setActiveTab, user } = useWorkspaceStore();

    useEffect(() => {
        setActiveTab('dashboard');
    }, [setActiveTab]);

    const [isMobile, setIsMobile] = React.useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Fetch Data ─────────────────────────────────────────────────────────

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['dashboard', 'summary'],
        queryFn: getDashboardSummary,
        refetchInterval: 30000, // every 30s as per plan
    });

    const { data: recentRuns, isLoading: runsLoading } = useQuery({
        queryKey: ['dashboard', 'recent-runs'],
        queryFn: getRecentRuns,
        refetchInterval: 15000, // faster update for runs
    });

    const { data: driftAlerts, isLoading: driftLoading } = useQuery({
        queryKey: ['dashboard', 'drift-alerts'],
        queryFn: getDriftAlerts,
    });

    // ── Pre-computing KPI values for display ────────────────────────────────

    const KPI_CARDS = [
        { 
            label: 'Total Runs This Week', 
            value: summary?.total_runs_week ?? '--', 
            change: '', // Can compute historical change later
            icon: Activity, 
            color: '#6366f1' 
        },
        { 
            label: 'Success Rate', 
            value: summary ? `${summary.success_rate}%` : '--%', 
            change: '', 
            icon: CheckCircle2, 
            color: '#10b981' 
        },
        { 
            label: 'Avg Processing Time', 
            value: summary ? `${summary.avg_duration}s` : '--s', 
            change: '', 
            icon: Clock, 
            color: '#06b6d4' 
        },
        { 
            label: 'Active Drift Alerts', 
            value: summary?.active_drift_alerts ?? '--', 
            change: '', 
            icon: AlertTriangle, 
            color: '#f59e0b' 
        },
    ];

    return (
        <ErrorBoundary>
            <div style={{ padding: '28px 32px', maxWidth: 1200, height: '100vh', overflowY: 'auto' }}>
                {/* ── Header ── */}
            <div style={{ marginBottom: 28 }} className="animate-fade-in">
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                    Welcome back, {user?.name || 'User'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Overview of your automation workflows for <strong>{user?.org_id ? "your Organization" : "Workline AI"}</strong>.
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
                {KPI_CARDS.map((kpi) => (
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
                            {summaryLoading ? (
                                <div style={{ height: 26, width: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}></div>
                            ) : (
                                <p style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{kpi.value}</p>
                            )}
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{kpi.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Content Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 340px', gap: 24 }}>
                
                {/* ── RECENT RUNS ── */}
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
                    {runsLoading ? (
                        <div style={{ padding: 20 }}>
                            <LoadingSkeleton />
                            <LoadingSkeleton />
                            <LoadingSkeleton />
                        </div>
                    ) : recentRuns?.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: 14 }}>No runs recorded yet.</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Start an automation flow to see activity here.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                    {['Workflow', 'Status', 'Started', 'Duration', ''].map((h) => (
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
                                {recentRuns?.map((run) => (
                                    <tr
                                        key={run.id}
                                        style={{
                                            borderBottom: '1px solid var(--border-default)',
                                            transition: 'background 0.1s',
                                        }}
                                    >
                                        <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500 }}>{run.workflow_name}</td>
                                        <td style={{ padding: '12px 20px' }}>
                                            <span className={`badge ${statusBadge(run.status)}`}>{run.status}</span>
                                        </td>
                                        <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{run.duration}s</td>
                                        <td style={{ padding: '12px 20px' }}>
                                            <button className="btn-ghost" style={{ padding: '4px 8px' }}>
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── SIDEBAR: DRIFT & ALERTS ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                            <h2 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={15} color="#f59e0b" />
                                Active Alerts
                            </h2>
                        </div>
                        <div style={{ padding: '12px' }}>
                            {driftLoading ? (
                                <div style={{ padding: '12px' }}>
                                    <LoadingSkeleton />
                                    <LoadingSkeleton />
                                </div>
                            ) : driftAlerts?.length === 0 ? (
                                <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                                    <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                    <p style={{ fontSize: 12, fontWeight: 500 }}>All Systems Healthy</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>No logic drift or bias detected.</p>
                                </div>
                            ) : (
                                driftAlerts?.map((alert) => (
                                    <div
                                        key={alert.id}
                                        style={{
                                            padding: '12px',
                                            background: 'rgba(245, 158, 11, 0.04)',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(245, 158, 11, 0.15)',
                                            marginBottom: 8
                                        }}
                                    >
                                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{alert.workflow_name}</p>
                                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                            {alert.metric} accuracy drop detected.
                                        </p>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}>View</button>
                                            <button className="btn-primary" style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}>Re-Train</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="glass-card animate-fade-in" style={{ padding: '16px 20px' }}>
                        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>System Status</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'API Gateway', status: 'online' },
                                { label: 'Execution Engine', status: 'online' },
                                { label: 'ML Inference (Groq)', status: 'online' },
                                { label: 'Object Storage (MinIO)', status: 'online' },
                            ].map(s => (
                                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></div>
                                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{s.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </ErrorBoundary>
    );
}