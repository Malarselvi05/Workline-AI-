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
    User as UserIcon,
    Package,
    LogOut,
    Moon,
    Sun,
    FileSearch,
    Inbox,
    UserCheck,
    Hammer,
    Cpu,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useChatStore } from '@/stores/chatStore';
import { logout as apiLogout } from '@/lib/api';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'intake', label: 'Intake', icon: Inbox, href: '/intake' },
    { id: 'vault', label: 'Vault', icon: FileSearch, href: '/vault' },
    { id: 'dispatch', label: 'Dispatch', icon: UserCheck, href: '/dispatch' },
    { id: 'bending', label: 'Bending', icon: Hammer, href: '/bending' },
];

const DEV_ITEMS = [
    { id: 'automate', label: 'Automate', icon: Zap, href: '/automate' },
    { id: 'packs', label: 'Domain Packs', icon: Package, href: '/packs' },
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
        fetchPacks,
        user,
        setUser,
    } = useWorkspaceStore();
    const isEditor = user?.role === 'admin' || user?.role === 'editor';
    const router = useRouter();

    // Helper to get the best URL for the "Automate" nav item
    const getAutomateUrl = () => {
      console.log("[JS] Sidebar.tsx | getAutomateUrl | L46: Code alive");
        // Try to load the most relevant workflow (active first, then anything)
        const firstWf = workflows.find(w => w.status === 'active') || workflows[0];
        return firstWf ? `/automate?load=${firstWf.id}` : '/automate';
    };

    const [isDark, setIsDark] = React.useState(true);

    useEffect(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDark = () => {
      console.log("[JS] Sidebar.tsx | toggleDark | L64: Logic flowing");
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            setIsDark(true);
        }
    };

    const { clearMessages } = useChatStore();

    const handleLogout = async () => {
      console.log("[JS] Sidebar.tsx | handleLogout | L78: System checking in");
        try {
            await apiLogout();
        } catch (err) {
            console.error('Logout API failed:', err);
        } finally {
            // Always clear state and redirect
            useWorkspaceStore.getState().reset();
            clearMessages();
            localStorage.removeItem('access_token');
            router.push('/login');
        }
    };

    useEffect(() => {
        fetchWorkflows();
        fetchPacks();
    }, [fetchWorkflows, fetchPacks]);

    useEffect(() => {
        const handleResize = () => {
          console.log("[JS] Sidebar.tsx | handleResize | L98: Code alive");
            if (window.innerWidth < 1024) {
                if (!useWorkspaceStore.getState().sidebarCollapsed) {
                    useWorkspaceStore.getState().toggleSidebar();
                }
            }
        };
        
        // Initial check
        handleResize();
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const statusColor = (status: string) => {
      console.log("[JS] Sidebar.tsx | statusColor | L113: Data processing");
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

                {/* ── SEYON Operations Portal ── */}
                <div style={{ marginBottom: 16 }}>
                    {!sidebarCollapsed && (
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}>
                            SEYON OPERATIONS
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

                <div style={{ marginTop: 24, marginBottom: 8 }}>
                    {!sidebarCollapsed && (
                        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}>
                            Dev Mode
                        </p>
                    )}
                    {DEV_ITEMS.map((item) => {
                        const href = item.id === 'automate' ? getAutomateUrl() : item.href;
                        const isActive = pathname === item.href || (item.id === 'automate' && pathname === '/automate');
                        return (
                            <Link
                                key={item.id}
                                href={href}
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
                                    opacity: 0.7
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
                {workflows.length > 0 ? (
                    <div style={{ marginTop: 16 }}>
                        {!sidebarCollapsed && (
                            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}>
                                Workflows
                            </p>
                        )}
                        {workflows.map((wf) => {
                            const isActive = activeWorkflowId === wf.id && pathname.startsWith('/workflow');
                            const dotColor = statusColor(wf.status);
                            // Everyone goes to canvas on primary click for speed/UX
                            const wfHref = `/automate?load=${wf.id}`;

                            return (
                                <Link
                                    key={wf.id}
                                    href={wfHref}
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
                                            {isEditor && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setActiveWorkflow(wf.id);
                                                        router.push(`/workflow/${wf.id}?tab=runs`);
                                                    }}
                                                    className="btn-icon"
                                                    style={{ width: 22, height: 22, padding: 0, opacity: isActive ? 1 : 0.5, marginLeft: 4 }}
                                                    title="Workflow Details & Runs"
                                                >
                                                    <Settings size={12} />
                                                </button>
                                            )}
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
                ) : (
                    <div style={{ marginTop: 16 }}>
                        {!sidebarCollapsed && (
                            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px', marginBottom: 6 }}>
                                Workflows
                            </p>
                        )}
                        <div style={{
                            padding: sidebarCollapsed ? '12px 4px' : '12px',
                            margin: sidebarCollapsed ? '0 4px' : '0 8px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px dashed var(--border-default)',
                            textAlign: 'center'
                        }}>
                            {sidebarCollapsed ? (
                                <Workflow size={14} color="var(--text-muted)" style={{ margin: '0 auto' }} />
                            ) : (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                    No workflows yet.<br/>Type a goal to start!
                                </p>
                            )}
                        </div>
                    </div>
                )}

                </div>
            </nav>

            {/* ── Bottom ── */}
            <div
                style={{
                    padding: sidebarCollapsed ? '12px 0' : '12px 16px',
                    borderTop: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                {!sidebarCollapsed && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-default)',
                        }}
                    >
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <UserIcon size={16} color="white" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.name || 'Loading...'}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                    {user?.role || 'user'}
                                </span>
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)' }} />
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.email || ''}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: sidebarCollapsed ? 'column' : 'row', gap: 4 }}>
                    <button
                        className="btn-ghost"
                        onClick={toggleSidebar}
                        style={{
                            justifyContent: 'center',
                            flex: sidebarCollapsed ? 'unset' : 1,
                            padding: sidebarCollapsed ? '10px 0' : '8px 10px',
                            minWidth: sidebarCollapsed ? '100%' : 'unset',
                        }}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>

                    <button
                        className="btn-ghost"
                        onClick={handleLogout}
                        style={{
                            justifyContent: 'center',
                            color: 'var(--accent-danger)',
                            flex: sidebarCollapsed ? 'unset' : 1,
                            padding: sidebarCollapsed ? '10px 0' : '8px 10px',
                            minWidth: sidebarCollapsed ? '100%' : 'unset',
                        }}
                        title="Log out"
                    >
                        <LogOut size={18} />
                    </button>

                    <button
                        className="btn-ghost"
                        onClick={toggleDark}
                        style={{
                            justifyContent: 'center',
                            flex: sidebarCollapsed ? 'unset' : 1,
                            padding: sidebarCollapsed ? '10px 0' : '8px 10px',
                            minWidth: sidebarCollapsed ? '100%' : 'unset',
                        }}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 500, alignSelf:'center', paddingLeft: 4, cursor:'pointer' }} onClick={handleLogout}>Logout</span>}
                </div>
            </div>
        </aside>
    );
}