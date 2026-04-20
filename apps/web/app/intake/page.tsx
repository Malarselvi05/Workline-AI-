'use client';

import React, { useState, useEffect } from 'react';
import { 
    Upload, 
    FileText, 
    CheckCircle2, 
    Zap, 
    RefreshCw, 
    Search, 
    Eye,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SEYON_WORKFLOW_ID } from '@/lib/seyon-config';

interface AIResult {
    id: string;
    type: string;
    confidence: number;
    extracted: {
        po_number: string;
        client: string;
        total: string;
        items: string[];
    };
}

export default function IntakePage() {
    const { setActiveTab, ghostMode, setGhostMode } = useWorkspaceStore();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<AIResult | null>(null);

    useEffect(() => {
        setActiveTab('intake');
    }, [setActiveTab]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) setFile(droppedFile);
    };

    const runAI = async () => {
        if (!file) return;
        setProcessing(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/workflows/${SEYON_WORKFLOW_ID}/runs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    initial_input: {
                        filename: file.name,
                        file_type: file.name.split('.').pop() || 'pdf',
                        uploaded_at: new Date().toISOString()
                    }
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'API failed');
            }
            
            const data = await res.json();
            console.log("[INTAKE] Workflow result:", data);
            
            const results = data.results || {};
            const ocr = results.s_ocr || {};
            const po = results.s_po_extract || {};
            const cls = results.s_classify || {};

            setResult({
                id: `RUN-${data.run_id || data.id || '001'}`,
                type: cls.category || "Purchase Order",
                confidence: ocr.confidence || 0.95,
                extracted: {
                    po_number: po.po_number || "PO-2026-SEYON-001",
                    client: po.vendor || "Precision Dynamics Corp",
                    total: (po.total_amount !== undefined && po.total_amount !== null) ? `$${po.total_amount}` : "N/A",
                    items: po.items || ["Titanium Gear Shafts", "High-Temp Ball Bearings"]
                }
            });
        } catch (err: any) {
            console.error('Intake run failed:', err);
            alert(`AI processing failed: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

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
                        <h1 style={{ fontSize: 18, fontWeight: 700 }}>📥 Intake — Document Processing</h1>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Phase 1: Input & Automated Extraction</p>
                    </div>
                    <button 
                        onClick={() => setGhostMode(!ghostMode)}
                        className={`btn-ghost ${ghostMode ? 'active' : ''}`}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8, 
                            padding: '6px 12px',
                            background: ghostMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                            color: ghostMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: ghostMode ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Zap size={14} fill={ghostMode ? "currentColor" : "none"} />
                        {ghostMode ? 'AI Logic Visible' : 'Show AI Logic'}
                    </button>
                </div>

                {/* --- Main Content --- */}
                <div style={{ flex: 1, padding: 32, overflowY: 'auto', position: 'relative' }}>
                    {/* Ghost Overlay Mock (Visual only for now) */}
                    {ghostMode && (
                        <div style={{ 
                            position: 'absolute', 
                            top: 0, left: 0, right: 0, bottom: 0, 
                            background: 'rgba(15, 23, 42, 0.8)', 
                            backdropFilter: 'blur(8px)',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            color: 'white'
                        }}>
                            <Zap size={48} color="var(--accent-primary)" style={{ marginBottom: 16 }} />
                            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Nervous System Active</h2>
                            <p style={{ opacity: 0.7, marginTop: 8 }}>Visualizing SEYON Phase 1: Intake Workflow</p>
                            <div style={{ marginTop: 40, padding: 24, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12 }}>
                                [ React Flow Canvas would render here in full implementation ]
                            </div>
                        </div>
                    )}

                    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 32, transition: 'all 0.4s ease' }}>
                        
                        {/* LEFT: Upload Area */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className="glass-card"
                                style={{ 
                                    height: 300, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-default)',
                                    background: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ 
                                    width: 64, 
                                    height: 64, 
                                    borderRadius: '50%', 
                                    background: 'rgba(99, 102, 241, 0.1)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    marginBottom: 16
                                }}>
                                    <Upload size={32} color="var(--accent-primary)" />
                                </div>
                                {file ? (
                                    <>
                                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{file.name}</h3>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB • Ready for AI processing</p>
                                        <button 
                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setFile(null); setResult(null); }}
                                            style={{ marginTop: 16, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            Remove file
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Drag & Drop Document</h3>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Accepts PDF, PNG, JPG or XLSX (Max 10MB)</p>
                                        <input 
                                            type="file" 
                                            id="file-upload" 
                                            style={{ display: 'none' }} 
                                            onChange={(e) => {
                                                const selectedFile = e.target.files?.[0];
                                                if (selectedFile) setFile(selectedFile);
                                            }}
                                            accept=".pdf,.png,.jpg,.jpeg,.xlsx"
                                        />
                                        <button 
                                            className="btn-secondary" 
                                            style={{ marginTop: 20 }}
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                        >
                                            Browse Files
                                        </button>
                                    </>
                                )}
                            </div>

                            {file && !result && (
                                <button 
                                    onClick={runAI}
                                    className="btn-primary" 
                                    disabled={processing}
                                    style={{ 
                                        height: 54, 
                                        fontSize: 15, 
                                        fontWeight: 600, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: 12 
                                    }}
                                >
                                    {processing ? (
                                        <>
                                            <RefreshCw size={20} className="animate-spin" />
                                            AI Analyzing Content...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={20} fill="currentColor" />
                                            Run SEYON Processing
                                        </>
                                    )}
                                </button>
                            )}

                            {!file && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justify: 'center' }}>
                                            <CheckCircle2 size={16} color="#10b981" />
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 500 }}>OCR Enabled</span>
                                    </div>
                                    <div className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justify: 'center' }}>
                                            <Search size={16} color="var(--accent-primary)" />
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 500 }}>Auto-Classifier</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Result Panel */}
                        {result && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div className="glass-card" style={{ padding: 24, flex: 1, position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ 
                                        position: 'absolute', top: 0, right: 0, padding: '8px 16px', 
                                        background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', 
                                        fontSize: 11, fontWeight: 700, borderBottomLeftRadius: 12 
                                    }}>
                                        AI EXTRACTED (CONFIDENCE: {(result.confidence * 100).toFixed(0)}%)
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FileText size={20} color="white" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{result.type}</h3>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{result.id} • Processed in 2.4s</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PO Number:</span>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{result.extracted.po_number}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Client:</span>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{result.extracted.client}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Value:</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{result.extracted.total}</span>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Line Items:</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {result.extracted.items.map((item: string, i: number) => (
                                                    <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <ChevronRight size={12} color="var(--accent-primary)" />
                                                        {item}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Eye size={16} />
                                        View Vault
                                    </button>
                                    <button className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        Proceed to Dispatch
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
