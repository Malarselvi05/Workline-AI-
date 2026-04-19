'use client';

import React, { useState, useEffect } from 'react';
import { 
    File, 
    Folder, 
    Search, 
    Zap, 
    MoreVertical, 
    Download, 
    Trash2,
    Database,
    Users,
    ChevronRight,
    LayoutGrid,
    List as ListIcon
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface VaultFile {
    id: number;
    name: string;
    type: string;
    size: string;
    date: string;
    category: string;
}

const MOCK_FILES: VaultFile[] = [
    { id: 1, name: 'PO_SEYON_2024.pdf', type: 'Purchase Order', size: '1.2 MB', date: '2m ago', category: 'drawings' },
    { id: 2, name: 'Assembly_DRG_114.pdf', type: 'Engineering Drawing', size: '4.5 MB', date: '15m ago', category: 'drawings' },
    { id: 3, name: 'Schematic_Rev3.pdf', type: 'Circuit Diagram', size: '840 KB', date: '1h ago', category: 'specs' },
    { id: 4, name: 'BOM_Mechanical.xlsx', type: 'Bill of Materials', size: '120 KB', date: '3h ago', category: 'calculations' },
    { id: 5, name: 'MSDS_Coolant_V2.pdf', type: 'Safety Document', size: '2.1 MB', date: 'Yesterday', category: 'safety' },
];

interface TeamLeader {
    name: string;
    skills: string[];
    jobs: number;
}

const MOCK_TEAM_LEADERS: TeamLeader[] = [
    { name: 'Jane Smith', skills: ['CAD', 'Assembly', 'Thermal'], jobs: 4 },
    { name: 'John Doe', skills: ['Production', 'CNC', 'QC'], jobs: 3 },
    { name: 'Robert Brown', skills: ['Electrical', 'PLC', 'Safety'], jobs: 2 },
];

export default function VaultPage() {
    const { setActiveTab, ghostMode, setGhostMode } = useWorkspaceStore();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeSection, setActiveSection] = useState<'files' | 'db'>('files');

    useEffect(() => {
        setActiveTab('vault');
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div>
                            <h1 style={{ fontSize: 18, fontWeight: 700 }}>🗂️ Knowledge Vault</h1>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Phase 2: Indexed Storage & Knowledge Base</p>
                        </div>
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 8 }}>
                            <button 
                                onClick={() => setActiveSection('files')}
                                style={{ 
                                    padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                                    background: activeSection === 'files' ? 'var(--accent-primary)' : 'transparent',
                                    color: activeSection === 'files' ? 'white' : 'var(--text-secondary)'
                                }}
                            >
                                File Explorer
                            </button>
                            <button 
                                onClick={() => setActiveSection('db')}
                                style={{ 
                                    padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                                    background: activeSection === 'db' ? 'var(--accent-primary)' : 'transparent',
                                    color: activeSection === 'db' ? 'white' : 'var(--text-secondary)'
                                }}
                            >
                                Skill Database
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                placeholder="Search indexed docs..." 
                                style={{ 
                                    padding: '8px 12px 8px 36px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-default)', 
                                    borderRadius: 8, fontSize: 12, width: 240, color: 'white', outline: 'none'
                                }} 
                            />
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
                </div>

                {/* --- Main Content --- */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    
                    {/* Ghost Overlay */}
                    {ghostMode && (
                        <div style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                            background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', zIndex: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white'
                        }}>
                            <Database size={48} color="var(--accent-primary)" style={{ marginBottom: 16 }} />
                            <h2 style={{ fontSize: 24, fontWeight: 700 }}>Data Indexing Layer</h2>
                            <p style={{ opacity: 0.7, marginTop: 8 }}>Visualizing Metadata Extraction & Vector Storage</p>
                            <div style={{ marginTop: 40, padding: 24, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12 }}>
                                [ Storage & Indexing DAG Logic ]
                            </div>
                        </div>
                    )}

                    {/* Sidebar: Folders */}
                    <div style={{ width: 240, borderRight: '1px solid var(--border-default)', background: 'var(--bg-secondary)', padding: '24px 16px' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Categories</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                                { name: 'All Documents', icon: Folder, active: true },
                                { name: 'Purchase Orders', icon: Folder, active: false },
                                { name: 'Engineering Drawings', icon: Folder, active: false },
                                { name: 'Calculations', icon: Folder, active: false },
                                { name: 'Safety Docs', icon: Folder, active: false },
                            ].map((f, i) => (
                                <div key={i} style={{ 
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                                    background: f.active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                    color: f.active ? 'var(--accent-primary)' : 'var(--text-secondary)'
                                }}>
                                    <f.icon size={16} />
                                    {f.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Explorer View */}
                    <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
                        {activeSection === 'files' ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <h2 style={{ fontSize: 16, fontWeight: 700 }}>Current Files <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400, marginLeft: 8 }}>({MOCK_FILES.length} items)</span></h2>
                                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 6 }}>
                                        <button onClick={() => setViewMode('grid')} style={{ padding: 6, background: viewMode === 'grid' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}><LayoutGrid size={14} /></button>
                                        <button onClick={() => setViewMode('list')} style={{ padding: 6, background: viewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}><ListIcon size={14} /></button>
                                    </div>
                                </div>

                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(200px, 1fr))' : '1fr', 
                                    gap: 16 
                                }}>
                                    {MOCK_FILES.map(file => (
                                        <div key={file.id} className="glass-card" style={{ 
                                            padding: 16, display: 'flex', 
                                            flexDirection: viewMode === 'grid' ? 'column' : 'row',
                                            alignItems: viewMode === 'grid' ? 'center' : 'center',
                                            gap: 12,
                                            position: 'relative'
                                        }}>
                                            <div style={{ 
                                                width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.03)', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                            }}>
                                                <File size={24} color="var(--accent-primary)" />
                                            </div>
                                            <div style={{ flex: 1, textAlign: viewMode === 'grid' ? 'center' : 'left' }}>
                                                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{file.name}</h4>
                                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.type} • {file.size}</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn-icon" style={{ padding: 6 }}><Download size={14} /></button>
                                                <button className="btn-icon" style={{ padding: 6 }}><MoreVertical size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="animate-fade-in">
                                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Team Leader Skill Matrix</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                                    {MOCK_TEAM_LEADERS.map((leader, i) => (
                                        <div key={i} className="glass-card" style={{ padding: 20 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Users size={20} color="white" />
                                                </div>
                                                <div>
                                                    <h4 style={{ fontSize: 14, fontWeight: 700 }}>{leader.name}</h4>
                                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{leader.jobs} Active Jobs</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {leader.skills.map(skill => (
                                                    <span key={skill} style={{ padding: '4px 10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontSize: 10, fontWeight: 600, borderRadius: 100 }}>
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
