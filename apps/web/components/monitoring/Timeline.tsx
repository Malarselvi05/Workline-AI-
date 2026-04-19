'use client';

import React from 'react';
import { CheckCircle2, Clock, Play, AlertCircle } from 'lucide-react';

const MOCK_EVENTS = [
    { id: 1, type: 'start', title: 'Workflow Triggered', time: '10:00 AM', status: 'completed' },
    { id: 2, type: 'ocr', title: 'OCR Extraction', time: '10:01 AM', status: 'completed' },
    { id: 3, type: 'ml', title: 'Document Classified: Drawing', time: '10:01 AM', status: 'completed' },
    { id: 4, type: 'risk', title: 'Delay Risk: HIGH (0.83)', time: '10:02 AM', status: 'failed' },
    { id: 5, type: 'review', title: 'Awaiting Human Review', time: '10:02 AM', status: 'pending' },
];

export const Timeline = () => {
    return (
        <div style={{ padding: '4px 0' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
                Live Execution Timeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {MOCK_EVENTS.map((event, idx) => (
                    <div key={event.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                        {/* Line */}
                        {idx !== MOCK_EVENTS.length - 1 && (
                            <div style={{ 
                                position: 'absolute', 
                                left: 9, 
                                top: 24, 
                                bottom: -8, 
                                width: 2, 
                                background: 'rgba(255,255,255,0.05)' 
                            }} />
                        )}
                        
                        {/* Icon */}
                        <div style={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: '50%', 
                            background: event.status === 'completed' ? '#10b98120' : '#f59e0b20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                            marginTop: 2
                        }}>
                            {event.status === 'completed' ? (
                                <CheckCircle2 size={12} color="#10b981" />
                            ) : event.status === 'failed' ? (
                                <AlertCircle size={12} color="#ef4444" />
                            ) : (
                                <Clock size={12} color="#f59e0b" />
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ paddingBottom: 20 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{event.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{event.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
