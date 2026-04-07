'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, GripVertical, Package, Eye, EyeOff } from 'lucide-react';
import { BLOCK_DEFINITIONS, BlockDef, CATEGORY_COLORS, useCanvasStore } from '@/stores/canvasStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const STANDARD_CATEGORIES = ['input', 'extract', 'transform', 'decide', 'ai', 'human', 'act'];

const CATEGORY_LABELS: Record<string, string> = {
    input: 'Input',
    extract: 'Extract',
    transform: 'Transform',
    decide: 'Decide',
    ai: 'AI',
    human: 'Human',
    act: 'Act',
    mechanical: 'Domain Pack — Mechanical',
};

export default function BlockPalette() {
    const [search, setSearch] = useState('');
    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(STANDARD_CATEGORIES));
    const domainPackVisible = useCanvasStore((s) => s.domainPackVisible);
    const toggleDomainPack = useCanvasStore((s) => s.toggleDomainPack);
    const installedPacks = useWorkspaceStore((s) => s.installedPacks);
    const hasMechanical = installedPacks.includes('mechanical');

    const visibleBlocks = useMemo(() => {
        return BLOCK_DEFINITIONS.filter((b) => {
            if (b.isDomainPack) {
                if (b.category === 'mechanical' && !hasMechanical) return false;
                if (!domainPackVisible) return false;
            }
            return true;
        });
    }, [domainPackVisible, hasMechanical]);

    const filtered = useMemo(() => {
        if (!search) return visibleBlocks;
        const q = search.toLowerCase();
        return visibleBlocks.filter(
            (b) => b.label.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.category.includes(q)
        );
    }, [search, visibleBlocks]);

    const grouped = useMemo(() => {
        const map: Record<string, BlockDef[]> = {};
        for (const b of filtered) {
            if (!map[b.category]) map[b.category] = [];
            map[b.category].push(b);
        }
        return map;
    }, [filtered]);

    const allCategories = useMemo(() => {
        const cats = [...STANDARD_CATEGORIES];
        if (domainPackVisible && grouped['mechanical']) cats.push('mechanical');
        return cats;
    }, [domainPackVisible, grouped]);

    const toggleCat = (cat: string) => {
      console.log("[JS] BlockPalette.tsx | toggleCat | L62: Antigravity active");
        setExpandedCats((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const onDragStart = (e: React.DragEvent, blockDef: BlockDef) => {
      console.log("[JS] BlockPalette.tsx | onDragStart | L71: Logic flowing");
        e.dataTransfer.setData('application/workline-block', JSON.stringify(blockDef));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            style={{
                width: 240,
                background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flexShrink: 0,
            }}
        >
            {/* Header */}
            <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Block Palette
                    </p>
                    {/* Domain pack toggle */}
                    {hasMechanical && (
                        <button
                            onClick={toggleDomainPack}
                            title={domainPackVisible ? 'Hide domain pack blocks' : 'Show domain pack blocks'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: domainPackVisible ? 'rgba(6,182,212,0.12)' : 'transparent',
                                border: `1px solid ${domainPackVisible ? 'rgba(6,182,212,0.3)' : 'var(--border-default)'}`,
                                borderRadius: 5,
                                padding: '3px 7px',
                                cursor: 'pointer',
                                fontSize: 10,
                                fontWeight: 600,
                                color: domainPackVisible ? '#06b6d4' : 'var(--text-muted)',
                                transition: 'all 0.15s',
                            }}
                        >
                            <Package size={10} />
                            Pack
                            {domainPackVisible ? <Eye size={9} /> : <EyeOff size={9} />}
                        </button>
                    )}
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input"
                        placeholder="Search blocks…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: 28, fontSize: 12, padding: '5px 10px 5px 28px' }}
                    />
                </div>
            </div>

            {/* Block list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                {allCategories.map((cat) => {
                    const blocks = grouped[cat];
                    if (!blocks || blocks.length === 0) return null;
                    const isExpanded = expandedCats.has(cat);
                    const color = CATEGORY_COLORS[cat] || '#6366f1';
                    const isDomainCat = cat === 'mechanical';

                    return (
                        <div key={cat} style={{ marginBottom: 2 }}>
                            <button
                                onClick={() => toggleCat(cat)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '5px 6px',
                                    width: '100%',
                                    background: isDomainCat ? 'rgba(6,182,212,0.05)' : 'none',
                                    border: 'none',
                                    borderRadius: 5,
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                }}
                            >
                                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                <span
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: color,
                                        flexShrink: 0,
                                    }}
                                />
                                {CATEGORY_LABELS[cat] || cat}
                                <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)' }}>
                                    {blocks.length}
                                </span>
                            </button>

                            {isExpanded && (
                                <div style={{ paddingLeft: 2 }}>
                                    {blocks.map((block) => (
                                        <div
                                            key={block.type}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, block)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '6px 8px',
                                                borderRadius: 6,
                                                cursor: 'grab',
                                                transition: 'background 0.1s',
                                                marginBottom: 1,
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(148,163,184,0.06)')}
                                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <GripVertical size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <div
                                                style={{
                                                    width: 7,
                                                    height: 7,
                                                    borderRadius: 2,
                                                    background: block.color,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2, color: '#e2e8f0' }}>
                                                    {block.label}
                                                </p>
                                                <p
                                                    style={{
                                                        fontSize: 10,
                                                        color: 'var(--text-muted)',
                                                        lineHeight: 1.2,
                                                        marginTop: 1,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {block.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                        No blocks match &ldquo;{search}&rdquo;
                    </div>
                )}
            </div>

            {/* Domain pack notice */}
            {hasMechanical && !domainPackVisible && (
                <div
                    style={{
                        padding: '8px 12px',
                        borderTop: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <Package size={12} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Domain pack blocks hidden.{' '}
                        <button
                            onClick={toggleDomainPack}
                            style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: 10, fontWeight: 600, padding: 0 }}
                        >
                            Show
                        </button>
                    </p>
                </div>
            )}
        </div>
    );
}