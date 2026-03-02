'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Zap,
    ChevronLeft,
    ChevronRight,
    Workflow,
    User,
    Package,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'automate', label: 'Automate', icon: Zap, href: '/automate' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const {
        workflows,
        activeWorkflowId,
        sidebarCollapsed,
        toggleSidebar,
        setActiveWorkflow,
        fetchWorkflows,
    } = useWorkspaceStore();

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    const statusColor = (status: string) => {
        if (status === 'active') return '#10b981';
        if (status === 'archived') return '#6b7280';
        return '#f59e0b'; // draft
    };

    return (
        <aside
            className="sidebar"
            style={{
                width: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
                minWidth: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
                height: '100vh',
                background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.2s ease, min-width 0.2s ease',
                position: 'relative',
                zIndex: 40,
            }}
        >
            {/* ── Header ── */}
            <div
                style={{
                    padding: sidebarCollapsed ? '16px 12px' : '16px 20px',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 'var(--header-height)',
                }}
            >
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Zap size={16} color="white" />
                </div>
                {!sidebarCollapsed && (
                    <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
                        WorkLine AI
                    </span>
                )}
            </div>

            {/* ── Nav ── */}
            <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
                <div style={{ marginBottom: 8 }}>
                    {!sidebarCollapsed && (
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}>
                            Navigation
                        </p>
                    )}
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                    borderRadius: 'var(--radius-sm)',
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                    textDecoration: 'none',
                                    fontSize: 13,
                                    fontWeight: isActive ? 600 : 500,
                                    transition: 'all 0.15s ease',
                                    marginBottom: 2,
                                }}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <item.icon size={18} style={{ flexShrink: 0 }} />
                                {!sidebarCollapsed && item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* ── Workflow Tabs ── */}
                {workflows.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        {!sidebarCollapsed && (
                            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}>
                                Workflows
                            </p>
                        )}
                        {workflows.map((wf) => {
                            const isActive = activeWorkflowId === wf.id && pathname.startsWith('/workflow');
                            const dotColor = statusColor(wf.status);
                            return (
                                <Link
                                    key={wf.id}
                                    href={`/workflow/${wf.id}`}
                                    onClick={() => setActiveWorkflow(wf.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                        borderRadius: 'var(--radius-sm)',
                                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                                        textDecoration: 'none',
                                        fontSize: 13,
                                        fontWeight: isActive ? 600 : 400,
                                        transition: 'all 0.15s ease',
                                        marginBottom: 2,
                                        position: 'relative',
                                    }}
                                    title={sidebarCollapsed ? `${wf.name} (${wf.status})` : undefined}
                                >
                                    {/* Workflow icon with status dot */}
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <Workflow size={16} />
                                        <span
                                            style={{
                                                position: 'absolute',
                                                bottom: -2,
                                                right: -2,
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: dotColor,
                                                border: '1px solid var(--bg-secondary)',
                                            }}
                                        />
                                    </div>
                                    {!sidebarCollapsed && (
                                        <>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                {wf.name}
                                            </span>
                                            <span
                                                className={`badge ${wf.status === 'active' ? 'badge-success' : wf.status === 'archived' ? 'badge-neutral' : 'badge-warning'}`}
                                                style={{ marginLeft: 'auto', fontSize: 9, flexShrink: 0 }}
                                            >
                                                {wf.status}
                                            </span>
                                        </>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* ── Domain Pack Manager link ── */}
                <div style={{ marginTop: 16 }}>
                    {!sidebarCollapsed && (
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}>
                            Extensions
                        </p>
                    )}
                    <Link
                        href="/packs"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)',
                            background: 'transparent',
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 500,
                            transition: 'all 0.15s ease',
                        }}
                        title={sidebarCollapsed ? 'Domain Pack Manager' : undefined}
                    >
                        <Package size={18} style={{ flexShrink: 0 }} />
                        {!sidebarCollapsed && 'Domain Packs'}
                    </Link>
                </div>
            </nav>

            {/* ── Bottom ── */}
            <div
                style={{
                    padding: sidebarCollapsed ? '12px 8px' : '12px 16px',
                    borderTop: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                }}
            >
                <button
                    className="btn-ghost"
                    onClick={toggleSidebar}
                    style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', width: '100%' }}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Collapse</>}
                </button>
                {!sidebarCollapsed && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                        }}
                    >
                        <div
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <User size={14} color="white" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>Admin User</p>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>admin@workline.ai</p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
