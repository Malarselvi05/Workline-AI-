'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
    Upload, Webhook, ClipboardList, ScanText, FileSearch,
    Eraser, ArrowRightLeft, GitFork, Gauge, Brain, Lightbulb,
    UserCheck, Database, ListTodo, Bell, Ruler, Receipt,
    Copy, Users, Box, Info, Settings, Trash2, Copy as CopyIcon, FileCode,
    MessageCircle, Zap,
} from 'lucide-react';
import { useCanvasStore, CATEGORY_COLORS } from '@/stores/canvasStore';

const ICON_MAP: Record<string, React.ElementType> = {
    Upload, Webhook, ClipboardList, ScanText, FileSearch,
    Eraser, ArrowRightLeft, GitFork, Gauge, Brain, Lightbulb,
    UserCheck, Database, ListTodo, Bell, Ruler, Receipt,
    Copy, Users, Box, Zap,
};

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
    if (!status) return null;
    const map: Record<string, { bg: string; label: string; spin?: boolean }> = {
        pending: { bg: '#64748b', label: '●' },
        running: { bg: '#6366f1', label: '⟳', spin: true },
        success: { bg: '#10b981', label: '✓' },
        failed: { bg: '#ef4444', label: '✕' },
        skipped: { bg: '#94a3b8', label: '—' },
    };
    const s = map[status];
    if (!s) return null;
    return (
        <div
            style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: s.bg,
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #0a0e1a',
                animation: s.spin ? 'spin-slow 1s linear infinite' : undefined,
                zIndex: 10,
            }}
        >
            {s.label}
        </div>
    );
}

// ── Reasoning tooltip ───────────────────────────────────────────────────────
function ReasoningTooltip({ reasoning }: { reasoning: string }) {
    const [show, setShow] = useState(false);
    if (!reasoning) return null;
    return (
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <div
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{ cursor: 'help', color: '#64748b', display: 'flex' }}
            >
                <Info size={11} />
            </div>
            {show && (
                <div
                    style={{
                        position: 'absolute',
                        right: 18,
                        top: -4,
                        width: 220,
                        background: '#1e293b',
                        border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: 8,
                        padding: '8px 10px',
                        fontSize: 11,
                        color: '#94a3b8',
                        lineHeight: 1.5,
                        zIndex: 9999,
                        pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    }}
                >
                    <p style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>AI Reasoning</p>
                    {reasoning}
                </div>
            )}
        </div>
    );
}

// ── Context menu (portal-style, positioned absolutely in page) ───────────────
interface CtxMenuProps {
    nodeId: string;
    x: number;
    y: number;
    reasoning: string;
    onClose: () => void;
}

function ContextMenu({ nodeId, x, y, reasoning, onClose }: CtxMenuProps) {
    const { duplicateNode, deleteNode } = useCanvasStore();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent && e.key === 'Escape') { onClose(); return; }
            if (e instanceof MouseEvent && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', handler);
        };
    }, [onClose]);

    const items = [
        { icon: Settings, label: 'Configure', action: () => { onClose(); } },
        { icon: CopyIcon, label: 'Duplicate', action: () => { duplicateNode(nodeId); onClose(); } },
        { icon: Trash2, label: 'Delete', action: () => { deleteNode(nodeId); onClose(); }, danger: true },
        null, // divider
        { icon: FileCode, label: 'View Schema', action: () => { onClose(); } },
        {
            icon: MessageCircle, label: 'View Reasoning', action: () => {
                if (reasoning) alert(`Reasoning:\n\n${reasoning}`);
                onClose();
            }
        },
    ];

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                left: x,
                top: y,
                zIndex: 99999,
                background: '#1e293b',
                border: '1px solid rgba(148,163,184,0.2)',
                borderRadius: 10,
                padding: '4px',
                minWidth: 180,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                animation: 'fadeIn 0.12s ease-out',
            }}
        >
            {items.map((item, i) =>
                item === null ? (
                    <div key={i} style={{ height: 1, background: 'rgba(148,163,184,0.12)', margin: '3px 0' }} />
                ) : (
                    <button
                        key={item.label}
                        onClick={item.action}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            width: '100%',
                            padding: '7px 10px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: (item as { danger?: boolean }).danger ? '#f87171' : '#94a3b8',
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: 7,
                            textAlign: 'left',
                            transition: 'background 0.1s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(148,163,184,0.08)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <item.icon size={13} />
                        {item.label}
                    </button>
                )
            )}
        </div>
    );
}

// ── Main node component ─────────────────────────────────────────────────────
function WorkflowNode({ id, data, selected }: NodeProps) {
    const runStatus = useCanvasStore((s) => s.runStatus[id]);
    const diffState = useCanvasStore((s) => s.diffState);
    const { openContextMenu, contextMenu, closeContextMenu } = useCanvasStore();

    const Icon = ICON_MAP[data.icon] || Box;
    const color: string = data.color || CATEGORY_COLORS[data.category] || '#6366f1';

    // ── Diff visual state ─────────────────────────────────────────────────
    const isAdded = diffState.added.has(id);
    const isChanged = diffState.changed.has(id);
    const isRemoved = diffState.removed.has(id);

    let borderColor = selected ? color : 'rgba(148,163,184,0.15)';
    let bgColor = 'var(--bg-secondary)';
    let nodeOpacity = 1;

    if (isAdded) { borderColor = '#3b82f6'; bgColor = 'rgba(59,130,246,0.06)'; }
    if (isChanged) { borderColor = '#f59e0b'; bgColor = 'rgba(245,158,11,0.05)'; }
    if (isRemoved) { nodeOpacity = 0.35; borderColor = 'rgba(148,163,184,0.1)'; }

    const diffBadge = isAdded ? 'NEW' : isChanged ? 'CHANGED' : null;

    const handleRightClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openContextMenu(id, e.clientX, e.clientY);
    }, [id, openContextMenu]);

    const isMenuOpen = contextMenu?.nodeId === id;

    return (
        <>
            <div
                onContextMenu={handleRightClick}
                style={{
                    background: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    minWidth: 160,
                    maxWidth: 220,
                    boxShadow: selected
                        ? `0 0 16px ${color}30`
                        : isAdded
                            ? '0 0 12px rgba(59,130,246,0.2)'
                            : isChanged
                                ? '0 0 12px rgba(245,158,11,0.15)'
                                : '0 1px 4px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    cursor: 'grab',
                    opacity: nodeOpacity,
                    userSelect: 'none',
                }}
            >
                <StatusBadge status={runStatus} />
                <ReasoningTooltip reasoning={data.reasoning || ''} />

                {/* Diff badge */}
                {diffBadge && (
                    <div
                        style={{
                            position: 'absolute',
                            top: -10,
                            left: 8,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: isAdded ? '#3b82f6' : '#f59e0b',
                            color: 'white',
                        }}
                    >
                        {diffBadge}
                    </div>
                )}

                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        background: color,
                        width: 10,
                        height: 10,
                        border: `2px solid ${color}`,
                    }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: `${color}18`,
                            border: `1px solid ${color}30`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Icon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: '#f1f5f9',
                            }}
                        >
                            {data.label}
                        </p>
                        <p
                            style={{
                                fontSize: 10,
                                color: color,
                                textTransform: 'capitalize',
                                marginTop: 2,
                                fontWeight: 500,
                            }}
                        >
                            {data.category}
                        </p>
                    </div>
                </div>

                {/* Router node gets extra output handles */}
                {data.blockType === 'router' ? (
                    <>
                        <Handle
                            id="true"
                            type="source"
                            position={Position.Right}
                            style={{ top: '35%', background: '#10b981', width: 10, height: 10 }}
                        >
                            <span style={{ position: 'absolute', right: 14, top: -8, fontSize: 9, color: '#10b981', whiteSpace: 'nowrap', pointerEvents: 'none' }}>✓ true</span>
                        </Handle>
                        <Handle
                            id="false"
                            type="source"
                            position={Position.Right}
                            style={{ top: '65%', background: '#ef4444', width: 10, height: 10 }}
                        >
                            <span style={{ position: 'absolute', right: 14, top: -8, fontSize: 9, color: '#ef4444', whiteSpace: 'nowrap', pointerEvents: 'none' }}>✕ false</span>
                        </Handle>
                    </>
                ) : (
                    <Handle
                        type="source"
                        position={Position.Right}
                        style={{ background: color, width: 10, height: 10 }}
                    />
                )}
            </div>

            {/* Context menu rendered via portal-like fixed positioning */}
            {isMenuOpen && contextMenu && (
                <ContextMenu
                    nodeId={id}
                    x={contextMenu.x}
                    y={contextMenu.y}
                    reasoning={data.reasoning || ''}
                    onClose={closeContextMenu}
                />
            )}
        </>
    );
}

export default memo(WorkflowNode);
