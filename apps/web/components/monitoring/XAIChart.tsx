'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MOCK_IMPORTANCES = [
    { name: 'Workload', value: 0.85, color: '#6366f1' },
    { name: 'Overtime', value: 0.72, color: '#8b5cf6' },
    { name: 'Scope Chg', value: 0.94, color: '#f59e0b' },
    { name: 'Experience', value: -0.45, color: '#10b981' },
    { name: 'Urgency', value: 0.33, color: '#06b6d4' },
];

export const XAIChart = () => {
    return (
        <div style={{ height: 260, width: '100%' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
                Explainable AI: Feature Importances (Delay Risk)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_IMPORTANCES} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ 
                            background: 'rgba(20,20,30,0.95)', 
                            border: '1px solid var(--border-default)',
                            borderRadius: 8,
                            fontSize: 12
                        }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {MOCK_IMPORTANCES.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
