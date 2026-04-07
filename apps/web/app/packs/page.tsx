'use client';

import React, { useEffect, useState } from 'react';
import { Package, CheckCircle2, Circle, Settings, Boxes } from 'lucide-react';
import { listPacks, installPack, uninstallPack, DomainPack } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function PacksPage() {
    const [packs, setPacks] = useState<DomainPack[]>([]);
    const [loading, setLoading] = useState(true);
    const { fetchPacks, user } = useWorkspaceStore();
    const isEditor = user?.role === 'admin' || user?.role === 'editor';

    const loadData = async () => {
      console.log("[JS] page.tsx | loadData | L14: Keep it up");
      console.log("[JS] page.tsx | loadData | L14: Keep it up");
        setLoading(true);
        try {
            const data = await listPacks();
            setPacks(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleInstall = async (name: string) => {
      console.log("[JS] page.tsx | handleInstall | L31: Antigravity active");
      console.log("[JS] page.tsx | handleInstall | L30: Code alive");
        if (!isEditor) return;
        try {
            await installPack(name);
            await loadData();
            await fetchPacks(); // sync sidebar / workspace store
        } catch (err) {
            console.error(err);
        }
    };

    const handleUninstall = async (name: string) => {
      console.log("[JS] page.tsx | handleUninstall | L43: Logic flowing");
      console.log("[JS] page.tsx | handleUninstall | L41: Keep it up");
        if (!isEditor) return;
        try {
            await uninstallPack(name);
            await loadData();
            await fetchPacks();
        } catch (err) {
            console.error(err);
        }
    };

    const packDetails: Record<string, { title: string; description: string; blocks: string[] }> = {
        mechanical: {
            title: 'Mechanical Engineering Pack',
            description: 'Advanced vision and matching capabilities for mechanical drawings and purchase orders.',
            blocks: ['Drawing Classifier', 'PO Extractor', 'Duplicate Detector', 'Leader Recommender']
        }
    };

    if (loading) {
        return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading packs...</div>;
    }

    return (
        <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Package size={24} color="var(--text-secondary)" /> Domain Packs
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Extend your workflows with industry-specific AI capabilities and specialized blocks.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                {packs.map((pack) => {
                    const details = packDetails[pack.name] || {
                        title: pack.name,
                        description: 'Specialized domain capabilities.',
                        blocks: []
                    };
                    const isInstalled = pack.status === 'installed';

                    return (
                        <div key={pack.name} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Boxes size={20} color="#06b6d4" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 15, fontWeight: 600 }}>{details.title}</h3>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                            {isInstalled ? <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12}/> Installed</span> : 'Available'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body" style={{ flex: 1, padding: '0 20px 20px', display: 'flex', flexDirection: 'column' }}>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                                    {details.description}
                                </p>
                                
                                <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 6, marginBottom: 20 }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                                        Included Blocks
                                    </p>
                                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {details.blocks.map(b => (
                                            <li key={b} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Circle size={4} fill="currentColor" stroke="none" /> {b}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                                    {isInstalled ? (
                                        <button 
                                            className="btn-ghost" 
                                            style={{ color: 'var(--accent-danger)' }}
                                            onClick={() => handleUninstall(pack.name)}
                                            disabled={!isEditor}
                                        >
                                            Uninstall
                                        </button>
                                    ) : (
                                        <button 
                                            className="btn-primary"
                                            onClick={() => handleInstall(pack.name)}
                                            disabled={!isEditor}
                                        >
                                            Install Pack
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {packs.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px dashed var(--border-default)' }}>
                    <Package size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No domain packs available.</p>
                </div>
            )}
        </div>
    );
}