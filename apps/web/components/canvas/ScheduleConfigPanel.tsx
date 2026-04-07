'use client';

/**
 * ScheduleConfigPanel.tsx
 * Cron-schedule configuration panel for the workflow Settings tab.
 * Calls PUT /workflows/{id}/schedule to save, DELETE to remove.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Trash2, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getSchedule, setSchedule, deleteSchedule, ScheduledTrigger } from '../../lib/api';

// ── Minimal human-readable cron description ─────────────────────────────────

function describeCron(cron: string): string {
  console.log("[JS] ScheduleConfigPanel.tsx | describeCron | L15: Logic flowing");
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return 'Invalid expression (needs 5 fields: min hour dom mon dow)';
    const [min, hour, dom, , dow] = parts;

    const days: Record<string, string> = {
        '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat',
        '*': 'every day',
        '1-5': 'Mon–Fri',
        '1,2,3,4,5': 'Mon–Fri',
        '0,6': 'weekends',
    };

    const timeStr =
        min === '*' && hour === '*'
            ? 'every minute'
            : min === '0' && hour !== '*'
                ? `at ${hour.padStart(2, '0')}:00`
                : min !== '*' && hour !== '*'
                    ? `at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
                    : `at min ${min} of hour ${hour}`;

    const dayStr = dow !== '*' ? (days[dow] ?? `dow ${dow}`) : dom !== '*' ? `on day ${dom}` : 'every day';

    return `${dayStr === 'every day' ? 'Every day ' : `Every ${dayStr} `}${timeStr}`;
}

// ── Time-until helper ────────────────────────────────────────────────────────

function timeUntil(isoDate?: string): string {
  console.log("[JS] ScheduleConfigPanel.tsx | timeUntil | L44: Antigravity active");
    if (!isoDate) return '';
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff < 0) return 'overdue';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
    workflowId: number;
}

export default function ScheduleConfigPanel({ workflowId }: Props) {
    const [trigger, setTrigger] = useState<ScheduledTrigger | null>(null);
    const [cronInput, setCronInput] = useState('0 9 * * *');
    const [enabled, setEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const preview = describeCron(cronInput);
    const isValidCron = cronInput.trim().split(/\s+/).length === 5;

    // Load existing schedule
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSchedule(workflowId);
            setTrigger(data);
            setCronInput(data.cron_expr);
            setEnabled(data.enabled);
        } catch {
            setTrigger(null); // 404 → no schedule set yet
        } finally {
            setLoading(false);
        }
    }, [workflowId]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
      console.log("[JS] ScheduleConfigPanel.tsx | handleSave | L90: Logic flowing");
      console.log("[JS] ScheduleConfigPanel.tsx | handleSave | L90: Keep it up");
        if (!isValidCron) { setError('Enter a valid 5-field cron expression'); return; }
        setSaving(true); setError(null); setSuccess(null);
        try {
            const saved = await setSchedule(workflowId, { cron_expr: cronInput, enabled });
            setTrigger(saved);
            setSuccess('Schedule saved successfully');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message ?? 'Failed to save schedule');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
      console.log("[JS] ScheduleConfigPanel.tsx | handleDelete | L106: Antigravity active");
      console.log("[JS] ScheduleConfigPanel.tsx | handleDelete | L105: Code alive");
        if (!window.confirm('Remove this schedule?')) return;
        setDeleting(true); setError(null);
        try {
            await deleteSchedule(workflowId);
            setTrigger(null);
            setCronInput('0 9 * * *');
            setEnabled(true);
            setSuccess('Schedule removed');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message ?? 'Failed to remove schedule');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div
            id="schedule-config-panel"
            style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '20px',
                color: '#e2e8f0',
                fontFamily: 'Inter, system-ui, sans-serif',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <Clock size={18} color="#818cf8" />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Scheduled Trigger</span>
                {trigger && (
                    <span
                        style={{
                            marginLeft: 'auto',
                            fontSize: '12px',
                            background: trigger.enabled ? 'rgba(52,211,153,0.15)' : 'rgba(148,163,184,0.15)',
                            color: trigger.enabled ? '#34d399' : '#94a3b8',
                            padding: '2px 10px',
                            borderRadius: '20px',
                        }}
                    >
                        {trigger.enabled ? 'Active' : 'Disabled'}
                    </span>
                )}
                <button
                    onClick={load}
                    title="Refresh"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', marginLeft: trigger ? '4px' : 'auto' }}
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Loading schedule…</p>
            ) : (
                <>
                    {/* Current schedule info */}
                    {trigger && (
                        <div
                            style={{
                                background: 'rgba(99,102,241,0.08)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                                marginBottom: '16px',
                                fontSize: '13px',
                            }}
                        >
                            <div><strong>Next run:</strong> {trigger.next_run_at ? `${new Date(trigger.next_run_at).toLocaleString()} (${timeUntil(trigger.next_run_at)})` : '—'}</div>
                            {trigger.last_run_at && <div style={{ marginTop: '4px' }}><strong>Last run:</strong> {new Date(trigger.last_run_at).toLocaleString()}</div>}
                        </div>
                    )}

                    {/* Cron input */}
                    <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                        Cron Expression <span style={{ color: '#64748b' }}>( min hour dom mon dow )</span>
                    </label>
                    <input
                        id="cron-expression-input"
                        value={cronInput}
                        onChange={e => setCronInput(e.target.value)}
                        placeholder="0 9 * * *"
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'rgba(255,255,255,0.06)',
                            border: `1px solid ${isValidCron ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.4)'}`,
                            borderRadius: '8px',
                            padding: '9px 12px',
                            color: '#e2e8f0',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            marginBottom: '6px',
                        }}
                    />
                    {/* Human-readable preview */}
                    <p style={{ fontSize: '12px', color: '#818cf8', marginBottom: '14px', marginTop: 0 }}>
                        {preview}
                    </p>

                    {/* Common presets */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                        {[
                            ['Every minute', '* * * * *'],
                            ['Hourly', '0 * * * *'],
                            ['Daily 9 AM', '0 9 * * *'],
                            ['Weekdays 9 AM', '0 9 * * 1-5'],
                            ['Weekly Mon', '0 9 * * 1'],
                        ].map(([label, expr]) => (
                            <button
                                key={expr}
                                onClick={() => setCronInput(expr)}
                                style={{
                                    background: cronInput === expr ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    color: '#cbd5e1',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Enabled toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}>
                        <input
                            id="schedule-enabled-toggle"
                            type="checkbox"
                            checked={enabled}
                            onChange={e => setEnabled(e.target.checked)}
                            style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
                        />
                        Enable this schedule
                    </label>

                    {/* Feedback */}
                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '13px', marginBottom: '12px' }}>
                            <CheckCircle size={14} /> {success}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            id="save-schedule-btn"
                            onClick={handleSave}
                            disabled={saving || !isValidCron}
                            style={{
                                flex: 1,
                                background: saving || !isValidCron ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '9px',
                                color: '#fff',
                                cursor: saving || !isValidCron ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                fontWeight: 500,
                            }}
                        >
                            <Save size={14} />
                            {saving ? 'Saving…' : 'Save Schedule'}
                        </button>
                        {trigger && (
                            <button
                                id="delete-schedule-btn"
                                onClick={handleDelete}
                                disabled={deleting}
                                style={{
                                    background: 'rgba(239,68,68,0.15)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '8px',
                                    padding: '9px 14px',
                                    color: '#f87171',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '13px',
                                }}
                            >
                                <Trash2 size={14} />
                                {deleting ? '…' : 'Remove'}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}