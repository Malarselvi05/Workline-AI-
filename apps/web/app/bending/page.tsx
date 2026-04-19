'use client';

import React, { useState, useEffect } from 'react';
import { 
    Hammer, 
    Zap, 
    Settings, 
    Activity, 
    Cpu,
    Thermometer,
    Clock,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface Job {
    id: string;
    po: string;
    machine: string;
    progress: number;
    status: 'In-Progress' | 'Pending' | 'Completed' | 'Error';
    material: string;
    thickness: string;
}

const MOCK_JOBS: Job[] = [
    { id: 'J-101', po: 'PO-2024-882', machine: 'CNC Brake Press #4', progress: 70, status: 'In-Progress', material: '3mm Alum', thickness: '3mm' },
    { id: 'J-102', po: 'PO-2024-885', machine: 'CNC Brake Press #2', progress: 0, status: 'Pending', material: '2mm Steel', thickness: '2mm' },
    { id: 'J-103', po: 'PO-2024-880', machine: 'Manual Folding M/C', progress: 100, status: 'Completed', material: '1.5mm Alum', thickness: '1.5mm' },
];

export default function BendingPage() {
    const { setActiveTab, ghostMode, setGhostMode } = useWorkspaceStore();
    const [selectedJob, setSelectedJob] = useState<Job>(MOCK_JOBS[0]);

    useEffect(() => {
        setActiveTab('bending');
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
                        <h1 style={{ fontSize: 18, fontWeight: 700 }}>🔨 Bending & Production Control</h1>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Phase 4: Shop Floor Execution Monitoring</p>
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
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 32, gap: 32 }}>
                    
                    {/* Ghost Overlay */}
                    {ghostMode && (
                        <div style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', zIndex: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white'
                        }}>
                            <Settings size={48} color="var(--accent-primary)" style={{ marginBottom: 16 }} />
                            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Production Controller</h2>
                            <p style={{ opacity: 0.7, marginTop: 8 }}>Visualizing Shop Floor Scheduling & Machine Feedback Loop</p>
                            <div style={{ marginTop: 40, padding: 24, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12 }}>
                                [ Production Scheduling & Telemetry DAG ]
                            </div>
                        </div>
                    )}

                    {/* LEFT: Jobs List */}
                    <div style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Active Production Queue</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {MOCK_JOBS.map(job => (
                                <div 
                                    key={job.id} 
                                    onClick={() => setSelectedJob(job)}
                                    className="glass-card" 
                                    style={{ 
                                        padding: 16, 
                                        cursor: 'pointer',
                                        border: selectedJob.id === job.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                                        background: selectedJob.id === job.id ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700 }}>{job.id}</span>
                                        <span style={{ 
                                            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                                            background: job.status === 'In-Progress' ? 'rgba(99, 102, 241, 0.1)' : job.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                                            color: job.status === 'In-Progress' ? 'var(--accent-primary)' : job.status === 'Completed' ? '#10b981' : 'var(--text-muted)'
                                        }}>
                                            {job.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{job.po}</h4>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{job.machine}</p>
                                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                        <div style={{ width: `${job.progress}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 2 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Live Telemetry & Simulation */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="glass-card" style={{ padding: 24, flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Hammer size={24} color="white" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Live Telemetry — {selectedJob.machine}</h3>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connected to Machine via IoT Gateway</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' }}>{selectedJob.progress}%</span>
                                    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completion</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
                                <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-muted)' }}>
                                        <Thermometer size={14} />
                                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Temp</span>
                                    </div>
                                    <span style={{ fontSize: 20, fontWeight: 700 }}>42.5°C</span>
                                    <div style={{ marginTop: 8, fontSize: 10, color: '#10b981' }}>● Optimal</div>
                                </div>
                                <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-muted)' }}>
                                        <Cpu size={14} />
                                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Pressure</span>
                                    </div>
                                    <span style={{ fontSize: 20, fontWeight: 700 }}>120 Bar</span>
                                    <div style={{ marginTop: 8, fontSize: 10, color: '#10b981' }}>● Within Spec</div>
                                </div>
                                <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-muted)' }}>
                                        <Activity size={14} />
                                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Bends</span>
                                    </div>
                                    <span style={{ fontSize: 20, fontWeight: 700 }}>4 / 6</span>
                                    <div style={{ marginTop: 8, fontSize: 10, color: 'var(--accent-primary)' }}>● Next: 90° Fold</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700 }}>Verification Checks</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                        <CheckCircle2 size={16} color="#10b981" />
                                        <span style={{ fontSize: 13 }}>Material Verification: <strong>{selectedJob.material}</strong> matched drawing spec.</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                        <CheckCircle2 size={16} color="#10b981" />
                                        <span style={{ fontSize: 13 }}>Bend Sequence: AI-Optimized path validated by operator.</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                                        <Clock size={16} color="var(--text-muted)" />
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Final Quality Inspection: <span style={{ opacity: 0.6 }}>Pending (Estimated in 12m)</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div className="glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertCircle size={20} color="#f59e0b" />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: 13, fontWeight: 700 }}>Maintenance Alert</h4>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Press #4 requires tooling check in 48h.</p>
                                </div>
                            </div>
                            <button className="btn-primary" style={{ height: '100%', fontSize: 14, fontWeight: 600 }}>
                                Update Production Status
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
