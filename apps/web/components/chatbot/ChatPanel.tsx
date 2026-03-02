'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    X, Send, ChevronDown, ChevronRight, Sparkles, Loader2,
    Paperclip, History, Hash, AlertCircle, Box,
    Upload, Webhook, ClipboardList, ScanText, FileSearch,
    Eraser, ArrowRightLeft, GitFork, Gauge, Brain, Lightbulb,
    UserCheck, Database, ListTodo, Bell, Ruler, Receipt, Copy, Users,
} from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useCanvasStore, CATEGORY_COLORS } from '@/stores/canvasStore';
import { WorkflowProposal, WorkflowNode as ApiNode } from '@/lib/api';


const ICON_MAP: Record<string, React.ElementType> = {
    Upload, Webhook, ClipboardList, ScanText, FileSearch,
    Eraser, ArrowRightLeft, GitFork, Gauge, Brain, Lightbulb,
    UserCheck, Database, ListTodo, Bell, Ruler, Receipt, Copy, Users, Box,
};

const BLOCK_ICON_MAP: Record<string, { icon: string; color: string; category: string }> = {
    file_upload: { icon: 'Upload', color: '#3b82f6', category: 'input' },
    api_trigger: { icon: 'Webhook', color: '#3b82f6', category: 'input' },
    form_input: { icon: 'ClipboardList', color: '#3b82f6', category: 'input' },
    ocr: { icon: 'ScanText', color: '#a855f7', category: 'extract' },
    parse: { icon: 'FileSearch', color: '#a855f7', category: 'extract' },
    clean: { icon: 'Eraser', color: '#eab308', category: 'transform' },
    map_fields: { icon: 'ArrowRightLeft', color: '#eab308', category: 'transform' },
    router: { icon: 'GitFork', color: '#f97316', category: 'decide' },
    score: { icon: 'Gauge', color: '#f97316', category: 'decide' },
    classify: { icon: 'Brain', color: '#6366f1', category: 'ai' },
    recommend: { icon: 'Lightbulb', color: '#6366f1', category: 'ai' },
    human_review: { icon: 'UserCheck', color: '#ef4444', category: 'human' },
    store: { icon: 'Database', color: '#10b981', category: 'act' },
    create_task: { icon: 'ListTodo', color: '#10b981', category: 'act' },
    notify: { icon: 'Bell', color: '#10b981', category: 'act' },
    drawing_classifier: { icon: 'Ruler', color: '#06b6d4', category: 'mechanical' },
    po_extractor: { icon: 'Receipt', color: '#06b6d4', category: 'mechanical' },
    duplicate_detector: { icon: 'Copy', color: '#06b6d4', category: 'mechanical' },
    team_leader_recommender: { icon: 'Users', color: '#06b6d4', category: 'mechanical' },
};

// ── Proposal Renderer ─────────────────────────────────────────────────────────
function ProposalCard({
    msgId,
    proposal,
    onApply,
}: {
    msgId: string;
    proposal: WorkflowProposal;
    onApply: () => void;
}) {

    const [expanded, setExpanded] = useState(false);

    return (
        <div
            style={{
                marginTop: 10,
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 10,
                overflow: 'hidden',
            }}
        >
            {/* Proposal header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(99,102,241,0.06)',
                    borderBottom: expanded ? '1px solid rgba(99,102,241,0.15)' : 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={12} color="#818cf8" />
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#818cf8' }}>
                        {proposal.title || 'Workflow Proposal'}
                    </p>
                    <span
                        style={{
                            fontSize: 9,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'rgba(99,102,241,0.2)',
                            color: '#a5b4fc',
                            fontWeight: 600,
                        }}
                    >
                        {proposal.nodes.length} blocks
                    </span>
                </div>
                <button
                    onClick={() => setExpanded((p) => !p)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
            </div>

            {/* Per-block reasoning list */}
            {expanded && (
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {proposal.nodes.map((node: ApiNode, i: number) => {

                        const blockMeta = BLOCK_ICON_MAP[node.type];
                        const color = blockMeta?.color || '#6366f1';
                        const IconComp = ICON_MAP[blockMeta?.icon || ''] || Box;
                        return (
                            <div
                                key={node.id}
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    padding: '7px 8px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 7,
                                    borderLeft: `3px solid ${color}`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 6,
                                        background: `${color}18`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: 1,
                                    }}
                                >
                                    <IconComp size={12} color={color} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>
                                            {i + 1}. {node.data.label}
                                        </p>
                                        <span
                                            style={{
                                                fontSize: 9,
                                                color,
                                                background: `${color}18`,
                                                padding: '0 4px',
                                                borderRadius: 3,
                                                fontWeight: 600,
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {node.type}
                                        </span>
                                    </div>
                                    {node.data.reasoning && (
                                        <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
                                            {node.data.reasoning}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Apply button */}
            <div style={{ padding: '8px 10px', background: 'rgba(99,102,241,0.04)', borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                <button
                    className="btn-primary"
                    onClick={onApply}
                    style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '7px 12px' }}
                >
                    <Sparkles size={13} />
                    Apply to Canvas
                </button>
            </div>
        </div>
    );
}

// ── Restore dialog ────────────────────────────────────────────────────────────
function RestoreDialog({ onRestore, onClose }: { onRestore: (id: number) => void; onClose: () => void }) {
    const [value, setValue] = useState('');
    return (
        <div
            style={{
                position: 'absolute',
                bottom: 80,
                left: 12,
                right: 12,
                background: '#1e293b',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 10,
                padding: 12,
                zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                animation: 'fadeIn 0.15s ease-out',
            }}
        >
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#94a3b8' }}>Restore Conversation</p>
            <input
                className="input"
                type="number"
                placeholder="Conversation ID"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={{ fontSize: 12, marginBottom: 8 }}
                autoFocus
            />
            <div style={{ display: 'flex', gap: 6 }}>
                <button
                    className="btn-primary"
                    disabled={!value}
                    onClick={() => { onRestore(parseInt(value)); onClose(); }}
                    style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                >
                    Restore
                </button>
                <button className="btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ── Main ChatPanel ────────────────────────────────────────────────────────────
export default function ChatPanel() {
    const {
        messages, isLoading, isOpen, toggleChat, sendMessage, loadConversation, conversationId, clearMessages,
    } = useChatStore();
    const { importFromProposal } = useCanvasStore();
    const [input, setInput] = useState('');
    const [showRestore, setShowRestore] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    if (!isOpen) return null;

    const handleSend = async () => {
        const goal = input.trim();
        if (!goal || isLoading) return;
        setInput('');
        await sendMessage(goal);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    const handleApply = (proposal: NonNullable<(typeof messages)[number]['proposal']>) => {
        importFromProposal(proposal);
    };

    const EXAMPLE_PROMPTS = [
        'Classify PDFs and store by job number',
        'Review resumes and match to interviewers',
        'Extract invoice data with human approval',
    ];

    return (
        <div
            className="animate-slide-in-right"
            style={{
                width: 380,
                height: '100%',
                background: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                position: 'relative',
            }}
        >
            {/* ── Header ── */}
            <div
                style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Sparkles size={14} color="white" />
                    </div>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>AI Architect</p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Describe your automation goal</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Conversation ID badge */}
                    {conversationId && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 10,
                                color: '#818cf8',
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: 5,
                                padding: '2px 7px',
                                fontWeight: 600,
                            }}
                        >
                            <Hash size={9} />
                            {conversationId}
                        </div>
                    )}
                    {/* Restore button */}
                    <button
                        className="btn-icon"
                        onClick={() => setShowRestore((v) => !v)}
                        title="Restore conversation from DB"
                        style={{ width: 28, height: 28 }}
                    >
                        <History size={13} />
                    </button>
                    <button className="btn-icon" onClick={toggleChat} style={{ width: 28, height: 28, border: 'none' }}>
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Restore dialog */}
            {showRestore && (
                <RestoreDialog
                    onRestore={(id) => loadConversation(id)}
                    onClose={() => setShowRestore(false)}
                />
            )}

            {/* ── Messages ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
                {messages.length === 0 && !isLoading && (
                    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <Sparkles size={28} color="#818cf8" style={{ margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#f1f5f9' }}>How can I help you automate?</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
                            Describe your goal in plain English and I&apos;ll design a workflow graph for you.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {EXAMPLE_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    className="btn-secondary"
                                    onClick={() => setInput(prompt)}
                                    style={{ fontSize: 11, textAlign: 'left', padding: '8px 12px', width: '100%' }}
                                >
                                    &ldquo;{prompt}&rdquo;
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: 14, animation: 'fadeIn 0.25s ease-out' }}>
                        {msg.role === 'user' ? (
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div
                                    style={{
                                        background: '#6366f1',
                                        color: 'white',
                                        padding: '9px 13px',
                                        borderRadius: '12px 12px 3px 12px',
                                        maxWidth: '85%',
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-default)',
                                        padding: '12px 13px',
                                        borderRadius: '12px 12px 12px 3px',
                                        maxWidth: '100%',
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {/* Show error icon if content starts with "Sorry" */}
                                    {msg.content.startsWith('Sorry') ? (
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                            <AlertCircle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                                            <span>{msg.content}</span>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}

                                    {/* Proposal card */}
                                    {msg.proposal && msg.proposal.nodes.length > 0 && (
                                        <ProposalCard
                                            msgId={msg.id}
                                            proposal={msg.proposal}
                                            onApply={() => handleApply(msg.proposal!)}
                                        />
                                    )}
                                </div>
                                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, marginLeft: 4 }}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '4px 0' }}>
                        <Loader2 size={15} style={{ animation: 'spin-slow 1s linear infinite', color: '#818cf8' }} />
                        <span>Designing your workflow<span style={{ animation: 'fadeIn 0.5s infinite alternate' }}>…</span></span>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* ── Input area ── */}
            <div
                style={{
                    padding: '10px 12px',
                    borderTop: '1px solid var(--border-default)',
                    flexShrink: 0,
                    background: 'var(--bg-secondary)',
                }}
            >
                {/* Hidden file input */}
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.xlsx,.csv"
                    style={{ display: 'none' }}
                    onChange={() => {/* file attach UI only — no backend in J3 */ }}
                />

                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    {/* File attach button */}
                    <button
                        className="btn-icon"
                        onClick={() => fileRef.current?.click()}
                        title="Attach file (UI preview)"
                        style={{ flexShrink: 0, alignSelf: 'flex-end', marginBottom: 1 }}
                    >
                        <Paperclip size={14} />
                    </button>

                    <textarea
                        className="input"
                        placeholder="Describe your automation goal… (Ctrl+Enter to send)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        style={{ resize: 'none', fontSize: 13, flex: 1 }}
                    />
                    <button
                        className="btn-primary"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        style={{ padding: '8px 12px', alignSelf: 'flex-end', flexShrink: 0 }}
                    >
                        {isLoading ? <Loader2 size={14} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Send size={14} />}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                        Ctrl+Enter to send · AI will not auto-execute
                    </p>
                    {messages.length > 0 && (
                        <button
                            onClick={clearMessages}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: 9,
                                padding: 0,
                            }}
                        >
                            Clear chat
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
