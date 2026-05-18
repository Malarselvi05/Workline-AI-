'use client';

import React, { useState, useEffect } from 'react';
import {
    UserCheck, Zap, FileText, ShieldCheck, AlertTriangle,
    CheckCircle2, ArrowRight, TrendingUp, MessageSquare,
    ChevronDown, RefreshCw, Sparkles, Users
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getWorkflowRuns, listTeamLeaders, type TeamLeader } from '@/lib/api';
import { SEYON_WORKFLOW_ID } from '@/lib/seyon-config';
import { useRouter } from 'next/navigation';

interface Recommendation {
    leader: TeamLeader;
    score: number;
    reason: string;
    isAiHint: boolean;
}

interface SelectedJob {
    id: string;
    docName: string;
    type: string;
    value: string;
    items: string[];          // extracted line items from PO (e.g. ["Brochure Design", "Web Design"])
    aiHint: string | null;   // recommended_leader from workflow engine, if any
}

// ── Client-side scoring ────────────────────────────────────────────────────
function scoreLeader(leader: TeamLeader, docType: string, items: string[], aiHint: string | null): number {
    // Build a combined word set from document type + all extracted item descriptions
    const allText = [docType, ...items].join(' ').toLowerCase().replace(/[_\-/]/g, ' ');
    const allWords = allText.split(/\s+/).filter(w => w.length > 2);

    // Skill match: how many of the leader's skills overlap with extracted item descriptions
    const matched = leader.skills.filter(skill =>
        allWords.some(w => skill.toLowerCase().includes(w))
    ).length;
    const skillScore = leader.skills.length > 0 ? matched / leader.skills.length : 0;

    // Role match: does the leader's role title match any extracted item words?
    const roleWords = (leader.role || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const roleMatch = roleWords.some(rw => allWords.some(aw => rw.includes(aw) || aw.includes(rw))) ? 1 : 0;

    const workloadPenalty = leader.workload_pct / 200;   // max 0.5
    const aiBoost = aiHint &&
        leader.name.toLowerCase().includes(aiHint.toLowerCase().split(' ')[0])
        ? 0.18 : 0;

    // Weighted: 0.15 base + 0.50 skill + 0.20 role - workload + AI
    return Math.min(0.99, Math.max(0.05, 0.15 + skillScore * 0.50 + roleMatch * 0.20 - workloadPenalty + aiBoost));
}

function buildReason(rec: Recommendation, docType: string, items: string[]): string {
    const { leader, score, isAiHint } = rec;
    if (isAiHint) return `*Selected based on speciality alignment.*`;
    const matchedSkills = leader.skills.filter(skill =>
        items.some(item => item.toLowerCase().includes(skill.toLowerCase().split(' ')[0]) ||
                         skill.toLowerCase().includes(item.toLowerCase().split(' ')[0]))
    );
    if (score >= 0.80) return `Strong match — skills [${matchedSkills.join(', ')}] align with items like "${items[0] || docType}". Workload: ${leader.workload_pct}%.`;
    if (score >= 0.60) return `Moderate match — ${leader.skills.slice(0, 2).join(', ')} partially overlaps with job items.`;
    return `Low match — specialty area differs from extracted items. Current workload ${leader.workload_pct}%.`;
}

// ──────────────────────────────────────────────────────────────────────────

export default function DispatchPage() {
    const router = useRouter();
    const { setActiveTab, ghostMode, setGhostMode } = useWorkspaceStore();

    const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [recsVisible, setRecsVisible] = useState(false);
    const [recsLoading, setRecsLoading] = useState(false);
    const [recsError, setRecsError] = useState<string | null>(null);

    const [assigned, setAssigned] = useState<string | null>(null);

    useEffect(() => {
        setActiveTab('dispatch');
        fetchLiveJob();
    }, [setActiveTab]);

    const fetchLiveJob = async () => {
        try {
            setPageLoading(true);
            const runs = await getWorkflowRuns(SEYON_WORKFLOW_ID);
            const sorted = runs.sort((a, b) =>
                new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            );
            const latest = sorted[0];
            if (latest?.logs?.results) {
                const r = latest.logs.results;
                setSelectedJob({
                    id: `RUN-${latest.id}`,
                    docName: r.s_ocr?.filename || 'Document',
                    type: r.s_classify?.category || r.s_classify?.type || 'General',
                    value: r.s_po_extract?.total_amount ? `$${r.s_po_extract.total_amount}` : 'N/A',
                    items: r.s_po_extract?.items || [],
                    aiHint: r.s_recommender?.recommended_leader || null,
                });
            }
        } catch (err) {
            console.error('Failed to fetch live job', err);
        } finally {
            setPageLoading(false);
        }
    };

    const handleRecommend = async () => {
        if (!selectedJob) return;
        setRecsLoading(true);
        setRecsVisible(true);
        setRecsError(null);
        try {
            const leaders = await listTeamLeaders();
            if (leaders.length === 0) {
                setRecsError('No employees in the Skill Database yet. Add team leaders in the Vault → Skill Database tab first.');
                setRecsLoading(false);
                return;
            }
            const scored: Recommendation[] = leaders
                .filter(l => l.is_active)
                .map(leader => {
                    const score = scoreLeader(leader, selectedJob.type, selectedJob.items, selectedJob.aiHint);
                    const isAiHint = !!(selectedJob.aiHint &&
                        leader.name.toLowerCase().includes(selectedJob.aiHint.toLowerCase().split(' ')[0]));
                    const rec: Recommendation = { leader, score, reason: '', isAiHint };
                    rec.reason = buildReason(rec, selectedJob.type, selectedJob.items);
                    return rec;
                })
                .sort((a, b) => {
                    if (a.isAiHint !== b.isAiHint) return a.isAiHint ? -1 : 1;
                    return b.score - a.score;
                });
            setRecommendations(scored);
        } catch (err: any) {
            setRecsError(err.message || 'Failed to load team leaders.');
        } finally {
            setRecsLoading(false);
        }
    };

    // ── Loading / empty states ─────────────────────────────────────────────

    if (pageLoading) {
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <RefreshCw size={32} className="animate-spin" color="var(--accent-primary)" />
                <p style={{ color: 'var(--text-muted)' }}>Fetching latest extraction job...</p>
            </div>
        );
    }

    if (!selectedJob) {
        return (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <AlertTriangle size={32} color="#ef4444" />
                <p style={{ color: 'var(--text-muted)' }}>No recent jobs found. Run a document through Intake first.</p>
            </div>
        );
    }

    const topRec = recommendations[0] ?? null;

    return (
        <ErrorBoundary>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

                {/* Header */}
                <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', zIndex: 20 }}>
                    <div>
                        <h1 style={{ fontSize: 18, fontWeight: 700 }}>🧑‍💼 Job Dispatch &amp; Allocation</h1>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Phase 3: AI-Assisted Team Leader Assignment</p>
                    </div>
                    <button
                        onClick={() => setGhostMode(!ghostMode)}
                        className={`btn-ghost ${ghostMode ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: ghostMode ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: ghostMode ? 'var(--accent-primary)' : 'var(--text-secondary)', border: ghostMode ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)', borderRadius: 20, fontSize: 12, fontWeight: 600 }}
                    >
                        <Zap size={14} fill={ghostMode ? 'currentColor' : 'none'} />
                        {ghostMode ? 'Logic Active' : 'Show Logic'}
                    </button>
                </div>

                {/* Main */}
                <div style={{ flex: 1, padding: 32, overflowY: 'auto', position: 'relative' }}>

                    {ghostMode && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white' }}>
                            <UserCheck size={48} color="var(--accent-primary)" style={{ marginBottom: 16 }} />
                            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Recommendation Engine</h2>
                            <p style={{ opacity: 0.7, marginTop: 8 }}>Visualizing Multi-Factor Matching &amp; Ranking Logic</p>
                            <div style={{ marginTop: 40, padding: 24, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12 }}>
                                [ Skill Matching &amp; Workload Balancing DAG ]
                            </div>
                        </div>
                    )}

                    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32 }}>

                        {/* LEFT: Job card */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Pending Job</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                                {/* Extracted line items */}
                                {selectedJob.items.length > 0 && (
                                    <div style={{ marginTop: 16 }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Extracted Items</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {selectedJob.items.map((item, i) => (
                                                <div key={i} style={{ padding: '6px 10px', background: 'rgba(99,102,241,0.06)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button className="btn-secondary" style={{ width: '100%', marginTop: 24, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    Change Selected Job <ChevronDown size={14} />
                                </button>
                            </div>

                            {/* AI Confidence card — only shown after recommendations load */}
                            {recsVisible && !recsLoading && topRec && (
                                <div className="glass-card animate-fade-in" style={{ padding: 20, background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <ShieldCheck size={16} color="#10b981" />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                                            {topRec.score >= 0.8 ? 'AI Confidence High' : 'AI Confidence Moderate'}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        Matching score <strong>{(topRec.score * 100).toFixed(0)}%</strong>. Live data from Skill Database indicates <strong>{topRec.leader.name}</strong> is the best match for this document type.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Recommendations panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <h2 style={{ fontSize: 16, fontWeight: 700 }}>🤖 AI Recommendations</h2>
                                {recsVisible && !recsLoading && (
                                    <button
                                        id="re-recommend-btn"
                                        onClick={handleRecommend}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
                                    >
                                        <RefreshCw size={13} /> Refresh
                                    </button>
                                )}
                            </div>

                            {/* ── State: assigned ── */}
                            {assigned ? (
                                <div className="glass-card animate-fade-in" style={{ padding: 40, textAlign: 'center', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                        <CheckCircle2 size={32} color="white" />
                                    </div>
                                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Assignment Confirmed!</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
                                        Job <strong>{selectedJob.docName}</strong> has been assigned to <strong>{assigned}</strong>.
                                    </p>
                                    <button onClick={() => router.push('/intake')} className="btn-primary">Process Next Job</button>
                                </div>

                            ) : !recsVisible ? (
                                /* ── State: not yet triggered ── */
                                <div className="glass-card" style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center', border: '1px dashed rgba(99,102,241,0.25)' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Users size={28} color="var(--accent-primary)" />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Ready to find the best match</p>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Clicking below will score your live team against this job type using skill matching + workload balancing.</p>
                                    </div>
                                    <button
                                        id="recommend-btn"
                                        onClick={handleRecommend}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                            background: 'var(--accent-primary)', color: 'white',
                                            fontSize: 14, fontWeight: 700,
                                            boxShadow: '0 0 24px rgba(99,102,241,0.4)',
                                        }}
                                    >
                                        <Sparkles size={16} /> Recommend Employee
                                    </button>
                                </div>

                            ) : recsLoading ? (
                                /* ── State: loading ── */
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 48 }}>
                                    <RefreshCw size={28} className="animate-spin" color="var(--accent-primary)" />
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Scoring team leaders from DB...</p>
                                </div>

                            ) : recsError ? (
                                /* ── State: error / empty ── */
                                <div style={{ padding: 32, textAlign: 'center', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, background: 'rgba(245,158,11,0.04)' }}>
                                    <AlertTriangle size={28} color="#f59e0b" style={{ marginBottom: 12 }} />
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{recsError}</p>
                                </div>

                            ) : (
                                /* ── State: results ── */
                                <>
                                    {recommendations.map((rec, i) => (
                                        <div key={rec.leader.id} className="glass-card" style={{
                                            padding: 24, display: 'flex', gap: 20, position: 'relative',
                                            borderLeft: i === 0 ? '4px solid #10b981' : '1px solid var(--border-default)',
                                            background: i === 0 ? 'rgba(16,185,129,0.02)' : 'rgba(255,255,255,0.02)'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{rec.leader.name[0]}</span>
                                                        </div>
                                                        <div>
                                                            <h4 style={{ fontSize: 15, fontWeight: 700 }}>{rec.leader.name}</h4>
                                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rec.isAiHint ? 'Assigned by AI Engine' : rec.leader.role || 'Team Leader'}</p>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                                            <TrendingUp size={14} color={rec.score > 0.8 ? '#10b981' : '#f59e0b'} />
                                                            <span style={{ fontSize: 16, fontWeight: 800, color: rec.score > 0.8 ? '#10b981' : '#f59e0b' }}>
                                                                {(rec.score * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Match Score</span>
                                                    </div>
                                                </div>

                                                {/* Skill tags */}
                                                {rec.leader.skills.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                                                        {rec.leader.skills.map(s => (
                                                            <span key={s} style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: 10, fontWeight: 600, borderRadius: 100 }}>{s}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                                    <MessageSquare size={14} style={{ marginTop: 2, flexShrink: 0, color: 'var(--accent-primary)' }} />
                                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>"{rec.reason}"</p>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Current Workload</span>
                                                            <span style={{ fontSize: 10, fontWeight: 700 }}>{rec.leader.workload_pct}%</span>
                                                        </div>
                                                        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                                            <div style={{ width: `${rec.leader.workload_pct}%`, height: '100%', background: rec.leader.workload_pct > 80 ? '#ef4444' : '#10b981', borderRadius: 2 }} />
                                                        </div>
                                                    </div>
                                                    <button
                                                        id={`assign-leader-${rec.leader.id}`}
                                                        onClick={() => {
                                                            setAssigned(rec.leader.name);
                                                            const runId = selectedJob.id.replace('RUN-', '');
                                                            useWorkspaceStore.getState().assignJob(runId, rec.leader.name);
                                                        }}
                                                        className={i === 0 ? 'btn-primary' : 'btn-secondary'}
                                                        style={{ padding: '8px 20px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                                                    >
                                                        {i === 0 ? <ShieldCheck size={14} /> : null}
                                                        {i === 0 ? 'Assign Recommended' : 'Assign'}
                                                        <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginTop: 4 }}>
                                        <AlertTriangle size={18} color="#f59e0b" />
                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            Manual override enabled. Admin can verify AI suggestions before final allocation.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
