'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Upload, FolderOpen, Users,
  Zap, X, CheckCircle, XCircle, Clock, Loader,
  FileText, ChevronRight, RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  getDashboardSummary, getRecentRuns, getRunDetail,
  getAllRuns, triggerSeyonRun, getLatestRun,
  approveNode, WorkflowRun, RunDetail,
} from '@/lib/api';
import {
  SEYON_WORKFLOW_ID, SEYON_NODE_IDS, NODE_LABELS,
  SEYON_PHASE1_NODES, SEYON_PHASE2_NODES,
} from '@/lib/seyon-config';

// ── Types ─────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'intake' | 'vault' | 'dispatch';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'intake',    label: 'Intake',     icon: Upload },
  { id: 'vault',     label: 'Vault',      icon: FolderOpen },
  { id: 'dispatch',  label: 'Dispatch',   icon: Users },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    completed:      { cls: 'badge-success',  label: '✅ Done' },
    running:        { cls: 'badge-info',     label: '⏳ Running' },
    pending:        { cls: 'badge-neutral',  label: '○ Pending' },
    failed:         { cls: 'badge-danger',   label: '❌ Failed' },
    awaiting_review:{ cls: 'badge-warning',  label: '⌛ Review' },
    skipped:        { cls: 'badge-neutral',  label: '– Skipped' },
  };
  const { cls, label } = map[status] || { cls: 'badge-neutral', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
}

function timeAgo(isoDate?: string) {
  if (!isoDate) return '—';
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ── Ghost Overlay ─────────────────────────────────────────────────────────
function GhostToggle({ ghost, setGhost }: { ghost: boolean; setGhost: (v: boolean) => void }) {
  return (
    <button
      onClick={() => setGhost(!ghost)}
      title={ghost ? 'Hide canvas' : 'Show AI nervous system'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px',
        borderRadius: 20,
        border: `1px solid ${ghost ? 'var(--accent-primary)' : 'var(--border-default)'}`,
        background: ghost ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: ghost ? 'var(--accent-primary-hover)' : 'var(--text-muted)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <Zap size={13} />
      {ghost ? 'Hide Canvas' : '⚡ Show Canvas'}
    </button>
  );
}

function GhostOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,14,26,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(17,24,39,0.95)',
        borderBottom: '1px solid var(--border-default)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-primary-hover)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} /> Nervous System — Live SEYON DAG
        </span>
        <button className="btn-icon" onClick={onClose} title="Close canvas">
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <iframe
          src={`/automate?load=${SEYON_WORKFLOW_ID}`}
          style={{ width: '100%', height: '100%', border: 'none', opacity: 0.92 }}
          title="SEYON Canvas"
        />
      </div>
    </div>
  );
}

// ── Tab: Dashboard ────────────────────────────────────────────────────────
function DashboardTab() {
  const [summary, setSummary] = useState<any>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, r] = await Promise.all([
          getDashboardSummary().catch(() => null),
          getAllRuns(SEYON_WORKFLOW_ID).catch(() => []),
        ]);
        setSummary(s);
        setRuns(r);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpis = [
    { label: 'Docs Processed', value: summary?.total_runs_week ?? runs.filter(r => r.status === 'completed').length, sub: 'this session', color: 'var(--accent-primary)' },
    { label: 'Success Rate',   value: summary ? `${(summary.success_rate * 100).toFixed(0)}%` : runs.length ? `${Math.round((runs.filter(r=>r.status==='completed').length/runs.length)*100)}%` : '—', sub: 'of all runs', color: 'var(--accent-success)' },
    { label: 'Avg Duration',   value: summary ? `${summary.avg_duration.toFixed(1)}s` : '—', sub: 'per document', color: 'var(--accent-secondary)' },
    { label: 'Pending Review', value: runs.filter(r => r.status === 'awaiting_review').length, sub: 'need action', color: 'var(--accent-warning)' },
  ];

  if (loading) return <CenterSpinner label="Loading dashboard…" />;

  return (
    <div style={{ padding: 28, overflowY: 'auto', height: '100%' }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {kpis.map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Runs table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Recent Processing Runs</h3>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{runs.length} total</span>
        </div>
        {runs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No runs yet — upload a document from the Intake tab.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Run ID', 'Status', 'Started', 'Ended'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 12).map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>#{r.id}</td>
                  <td style={{ padding: '12px 20px' }}>{statusBadge(r.status)}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>{timeAgo(r.started_at)}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{r.ended_at ? timeAgo(r.ended_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: Intake ───────────────────────────────────────────────────────────
const ALL_NODE_IDS = Object.values(SEYON_NODE_IDS);

function IntakeTab() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<number | null>(null);
  const [nodeStates, setNodeStates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback((rid: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const detail = await getRunDetail(rid);
        const states: Record<string, string> = {};
        for (const ns of detail.node_states) states[ns.node_id] = ns.status;
        setNodeStates(states);
        const done = ['completed', 'failed', 'awaiting_review'].includes(detail.run.status);
        if (done && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setRunning(false);
        }
      } catch { /* silent */ }
    }, 2000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleFile = (f: File) => setFile(f);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleRun = async () => {
    if (!file) return;
    setError(null);
    setRunning(true);
    setNodeStates({});
    setRunId(null);
    const payload = { filename: file.name, file_type: file.name.split('.').pop() || 'unknown', size: file.size, uploaded_at: new Date().toISOString() };
    try {
      const res = await triggerSeyonRun(SEYON_WORKFLOW_ID, payload);
      // Get the run_id — may come directly or via latest run poll
      let rid: number | null = (res as any).run_id ?? null;
      if (!rid) {
        await new Promise(r => setTimeout(r, 1200));
        const latest = await getLatestRun(SEYON_WORKFLOW_ID);
        rid = latest?.id ?? null;
      }
      if (rid) { setRunId(rid); startPolling(rid); }
      else setRunning(false);
    } catch (e: any) {
      setError(e.message || 'Failed to start run');
      setRunning(false);
    }
  };

  const allDone = runId && !running && Object.values(nodeStates).some(s => s !== 'pending');

  return (
    <div style={{ padding: 28, overflowY: 'auto', height: '100%', maxWidth: 760, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Document Intake</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Phase 1 — AI will OCR, classify, extract PO data, and check for duplicates.</p>

      {/* Drop zone */}
      {!runId && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('seyon-file-input')?.click()}
          style={{
            border: `2px dashed ${dragging || file ? 'var(--accent-primary)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '48px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(99,102,241,0.06)' : 'transparent',
            transition: 'all 0.2s ease',
            marginBottom: 24,
          }}
        >
          <input id="seyon-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.dxf,.xlsx,.docx" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          <FileText size={40} color={file ? 'var(--accent-primary)' : 'var(--text-muted)'} style={{ margin: '0 auto 16px' }} />
          {file ? (
            <>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{file.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB — click to change</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Drag & Drop your document here</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, PNG, JPG, DXF, XLSX — or click to browse</p>
            </>
          )}
        </div>
      )}

      {error && <div className="badge badge-danger" style={{ marginBottom: 16, padding: '8px 16px', borderRadius: 8 }}><AlertCircle size={14} /> {error}</div>}

      {!runId && (
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={!file || running} onClick={handleRun}>
          {running ? <><Loader size={15} style={{ animation: 'spin-slow 1s linear infinite' }} /> Processing…</> : '🚀  Run AI Processing'}
        </button>
      )}

      {/* Pipeline progress */}
      {runId && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>AI Pipeline — Run #{runId}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {allDone && <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setRunId(null); setFile(null); setNodeStates({}); }}>Process Another</button>}
              {running && <span className="badge badge-info"><Loader size={11} style={{ animation: 'spin-slow 1s linear infinite' }} /> Live</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ALL_NODE_IDS.map(nid => {
              const st = nodeStates[nid] || 'pending';
              const icon = st === 'completed' ? <CheckCircle size={16} color="var(--accent-success)" /> : st === 'running' ? <Loader size={16} color="var(--accent-primary)" style={{ animation: 'spin-slow 1s linear infinite' }} /> : st === 'failed' ? <XCircle size={16} color="var(--accent-danger)" /> : st === 'awaiting_review' ? <Clock size={16} color="var(--accent-warning)" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-hover)' }} />;
              return (
                <div key={nid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: st === 'running' ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${st === 'running' ? 'rgba(99,102,241,0.3)' : 'transparent'}` }}>
                  {icon}
                  <span style={{ fontSize: 13, flex: 1, color: st === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{NODE_LABELS[nid] ?? nid}</span>
                  {statusBadge(st)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Vault ────────────────────────────────────────────────────────────
function VaultTab() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selected, setSelected] = useState<RunDetail | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    getAllRuns(SEYON_WORKFLOW_ID).then(r => { setRuns(r); setLoadingRuns(false); });
  }, []);

  const selectRun = async (run: WorkflowRun) => {
    setLoadingDetail(true);
    try {
      const detail = await getRunDetail(run.id);
      setSelected(detail);
    } finally { setLoadingDetail(false); }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: run list */}
      <div style={{ width: 220, borderRight: '1px solid var(--border-default)', overflowY: 'auto', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📁 SEYON Storage</h3>
        </div>
        {loadingRuns ? <CenterSpinner label="Loading…" /> : runs.length === 0 ? (
          <p style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)' }}>No runs yet.</p>
        ) : runs.map(r => (
          <button key={r.id} onClick={() => selectRun(r)} style={{
            width: '100%', textAlign: 'left', padding: '10px 16px',
            background: selected?.run.id === r.id ? 'rgba(99,102,241,0.12)' : 'transparent',
            border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: 8,
            borderBottom: '1px solid var(--border-default)',
          }}>
            <FolderOpen size={14} /> <span style={{ flex: 1 }}>Run #{r.id}</span>
            <ChevronRight size={12} />
          </button>
        ))}
      </div>

      {/* Right: node outputs */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {loadingDetail && <CenterSpinner label="Loading outputs…" />}
        {!loadingDetail && !selected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 12 }}>
            <FolderOpen size={40} />
            <p style={{ fontSize: 14 }}>Select a run from the left panel</p>
          </div>
        )}
        {!loadingDetail && selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Run #{selected.run.id}</h2>
              {statusBadge(selected.run.status)}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(selected.run.started_at)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selected.node_states
                .sort((a, b) => ALL_NODE_IDS.indexOf(a.node_id as any) - ALL_NODE_IDS.indexOf(b.node_id as any))
                .map(ns => (
                  <NodeOutputCard key={ns.node_id} ns={ns} />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NodeOutputCard({ ns }: { ns: any }) {
  const [open, setOpen] = useState(ns.status === 'completed' || ns.status === 'awaiting_review');
  const label = NODE_LABELS[ns.node_id] ?? ns.node_id;
  const isPhase2 = SEYON_PHASE2_NODES.includes(ns.node_id);
  return (
    <div className="glass-card-sm" style={{ borderLeft: `3px solid ${isPhase2 ? 'var(--accent-warning)' : 'var(--accent-primary)'}`, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }}>
        {statusBadge(ns.status)}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</span>
        <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', color: 'var(--text-muted)' }} />
      </div>
      {open && ns.output_json && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-default)' }}>
          <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg-primary)', padding: 12, borderRadius: 6, marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
            {JSON.stringify(ns.output_json, null, 2)}
          </pre>
        </div>
      )}
      {ns.error && <p style={{ fontSize: 12, color: 'var(--accent-danger)', padding: '0 16px 12px' }}>⚠ {ns.error}</p>}
    </div>
  );
}

// ── Tab: Dispatch ─────────────────────────────────────────────────────────
function DispatchTab() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selected, setSelected] = useState<RunDetail | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(true);

  useEffect(() => {
    getAllRuns(SEYON_WORKFLOW_ID).then(r => {
      setRuns(r);
      setLoadingRuns(false);
      // Pre-select the latest awaiting_review or completed run
      const needle = r.find(x => x.status === 'awaiting_review') || r.find(x => x.status === 'completed');
      if (needle) loadDispatch(needle.id);
    });
  }, []);

  const loadDispatch = async (runId: number) => {
    const detail = await getRunDetail(runId);
    setSelected(detail);
    setAssigned(false);
  };

  const recommenderOutput = selected?.node_states.find(n => n.node_id === SEYON_NODE_IDS.recommender)?.output_json as any;
  const hrState = selected?.node_states.find(n => n.node_id === SEYON_NODE_IDS.human_review);

  const handleAssign = async () => {
    if (!selected || !hrState) return;
    setAssigning(true);
    try {
      await approveNode(selected.run.id, SEYON_NODE_IDS.human_review);
      setAssigned(true);
    } catch (e: any) {
      alert(`Could not assign: ${e.message}`);
    } finally { setAssigning(false); }
  };

  if (loadingRuns) return <CenterSpinner label="Loading runs…" />;

  return (
    <div style={{ padding: 28, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Dispatch — Team Allocation</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Phase 2 — Review AI recommendation and assign a team leader.</p>
        </div>
        <select style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}
          onChange={e => loadDispatch(Number(e.target.value))}
          value={selected?.run.id ?? ''}
        >
          <option value="">— Select Run —</option>
          {runs.map(r => <option key={r.id} value={r.id}>Run #{r.id} ({r.status})</option>)}
        </select>
      </div>

      {!selected && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', gap: 12 }}>
          <Users size={40} />
          <p>Select a run above or process a document first.</p>
        </div>
      )}

      {selected && (
        <div style={{ maxWidth: 680 }}>
          {/* Job summary */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Summary — Run #{selected.run.id}</h3>
            <JobSummaryRows nodeStates={selected.node_states} />
          </div>

          {/* Recommender output */}
          {recommenderOutput ? (
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🤖 AI Recommendation
              </h3>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{recommenderOutput.recommended_leader ?? '—'}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{recommenderOutput.reasoning ?? ''}</p>
                  <p style={{ fontSize: 11, color: 'var(--accent-success)' }}>{recommenderOutput.available ? '🟢 Available' : '🔴 Busy'}</p>
                </div>
              </div>

              {assigned ? (
                <div style={{ padding: '16px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                  <CheckCircle size={24} color="var(--accent-success)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: 15 }}>Assignment Confirmed!</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{recommenderOutput.recommended_leader} has been assigned to this job.</p>
                </div>
              ) : (
                hrState?.status === 'awaiting_review' ? (
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} onClick={handleAssign} disabled={assigning}>
                    {assigning ? <><Loader size={14} style={{ animation: 'spin-slow 1s linear infinite' }} /> Assigning…</> : '✅ Confirm Assignment'}
                  </button>
                ) : hrState?.status === 'completed' ? (
                  <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: 13 }}>✅ Already assigned</div>
                ) : (
                  <div className="badge badge-neutral" style={{ padding: '8px 16px', fontSize: 12 }}>Waiting for AI to reach review step…</div>
                )
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} style={{ margin: '0 auto 12px' }} />
              <p>No recommendation yet. Process a document from the Intake tab first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JobSummaryRows({ nodeStates }: { nodeStates: any[] }) {
  const po = nodeStates.find(n => n.node_id === SEYON_NODE_IDS.po_extract)?.output_json as any;
  const cls = nodeStates.find(n => n.node_id === SEYON_NODE_IDS.drawing_cls)?.output_json as any;
  const dup = nodeStates.find(n => n.node_id === SEYON_NODE_IDS.dup_detect)?.output_json as any;
  const rows = [
    { key: 'Drawing Type',  val: cls?.drawing_type ?? '—' },
    { key: 'PO Number',     val: po?.po_number ?? '—' },
    { key: 'Vendor',        val: po?.vendor ?? '—' },
    { key: 'Value',         val: po?.total_value ? `${po.currency ?? 'USD'} ${Number(po.total_value).toLocaleString()}` : '—' },
    { key: 'Duplicate',     val: dup?.is_duplicate ? `⚠ Yes (${dup.match_id})` : '✅ No duplicate found' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => (
        <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)' }}>{r.key}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.val}</span>
        </div>
      ))}
    </div>
  );
}

// ── Shared: spinner ───────────────────────────────────────────────────────
function CenterSpinner({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12, color: 'var(--text-muted)' }}>
      <Loader size={24} style={{ animation: 'spin-slow 1s linear infinite' }} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function SeyonPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [ghost, setGhost] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header / Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 20px',
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-secondary)',
        gap: 4,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.02em' }}>SEYON</span>
          <span className="badge badge-info" style={{ fontSize: 9 }}>AI Portal</span>
        </div>

        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 14px', borderRadius: 6,
                background: active ? 'rgba(99,102,241,0.14)' : 'transparent',
                border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: active ? 700 : 500, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          );
        })}

        <div style={{ marginLeft: 'auto' }}>
          <GhostToggle ghost={ghost} setGhost={setGhost} />
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'intake'    && <IntakeTab />}
        {tab === 'vault'     && <VaultTab />}
        {tab === 'dispatch'  && <DispatchTab />}
      </div>

      {/* Ghost overlay */}
      {ghost && <GhostOverlay onClose={() => setGhost(false)} />}
    </div>
  );
}
