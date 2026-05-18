'use client';

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface Props {
    success: number;
    failed: number;
    pending: number;
}

const COLORS = {
    success: '#10b981',
    failed:  '#ef4444',
    pending: '#f59e0b',
};

const DEMO = { success: 12, failed: 2, pending: 3 };

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    return (
        <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
        }}>
            <span style={{ fontWeight: 600 }}>{name}</span>: {value} runs
        </div>
    );
};

export const AssignmentPieChart = ({ success, failed, pending }: Props) => {
    const useDemo = success === 0 && failed === 0 && pending === 0;
    const s = useDemo ? DEMO.success : success;
    const f = useDemo ? DEMO.failed  : failed;
    const p = useDemo ? DEMO.pending : pending;
    const total = s + f + p;

    const data = [
        { name: 'Completed', value: s, color: COLORS.success },
        { name: 'Failed',    value: f, color: COLORS.failed  },
        { name: 'Pending',   value: p, color: COLORS.pending  },
    ].filter(d => d.value > 0);

    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.08) return null; // skip tiny slices
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: 11, fontWeight: 700 }}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Assignment Outcomes
                </h3>
                {useDemo && (
                    <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px',
                        background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                        borderRadius: 4, letterSpacing: '0.05em'
                    }}>DEMO</span>
                )}
            </div>

            <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={72}
                        dataKey="value"
                        labelLine={false}
                        label={renderLabel}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                            <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Summary row */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
                {[
                    { label: 'Done',    val: s, color: COLORS.success },
                    { label: 'Failed',  val: f, color: COLORS.failed  },
                    { label: 'Pending', val: p, color: COLORS.pending  },
                ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color }}>{val}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</p>
                    </div>
                ))}
            </div>

            {useDemo && (
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
                    Demo data — run a workflow to see real stats
                </p>
            )}
        </div>
    );
};
