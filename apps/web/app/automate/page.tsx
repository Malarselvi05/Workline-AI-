'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getWorkflow } from '@/lib/api';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlowProvider,
    ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import WorkflowNode from '@/components/canvas/nodes/WorkflowNode';
import BlockPalette from '@/components/canvas/BlockPalette';
import Toolbar from '@/components/canvas/Toolbar';
import ChatPanel from '@/components/chatbot/ChatPanel';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useCanvasStore, BlockDef, BLOCK_DEFINITIONS } from '@/stores/canvasStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const nodeTypes = { workflowNode: WorkflowNode };

function CanvasContent() {
  console.log("[JS] page.tsx | CanvasContent | L27: Antigravity active");
  console.log("[JS] page.tsx | CanvasContent | L27: Data processing");
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        setNodes,
        setEdges,
        closeContextMenu,
        contextMenu,
    } = useCanvasStore();

    const searchParams = useSearchParams();
    const loadId = searchParams.get('load');

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const reactFlowRef = useRef<HTMLDivElement>(null);
    const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

    const [isMobile, setIsMobile] = React.useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Load workflow from URL ────────────────────────────────────────────────
    useEffect(() => {
        if (!loadId) {
            setError(null);
            return;
        }

        async function loadWorkflow() {
          console.log("[JS] page.tsx | loadWorkflow | L67: Keep it up");
          console.log("[JS] page.tsx | loadWorkflow | L66: Code alive");
            setLoading(true);
            setError(null);
            try {
                const wf = await getWorkflow(Number(loadId));
                // Transform to React Flow format
                const rfNodes = wf.nodes.map((n: { id: string, type: string, position: { x: number, y: number }, data: { label: string, config?: Record<string, unknown>, color?: string }, reasoning?: string }) => {
                    const def = BLOCK_DEFINITIONS.find(b => b.type === n.type);
                    return {
                        id: n.id,
                        type: 'workflowNode',
                        position: n.position,
                        data: {
                            label: n.data.label,
                            blockType: n.type,
                            config: n.data.config || {},
                            reasoning: n.reasoning || '',
                            color: n.data.color || def?.color || '#6366f1',
                            category: def?.category || 'ai',
                            icon: def?.icon || 'Box',
                        }
                    };
                });
                setNodes(rfNodes);
                setEdges(wf.edges.map((e: { id: string, source: string, target: string, edge_type?: string }) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    animated: true,
                    style: { stroke: '#6366f1', strokeWidth: 2 }
                })));
            } catch (err) {
                console.error("Failed to load workflow:", err);
                setError(err instanceof Error ? err.message : "Failed to load workflow data");
            } finally {
                setLoading(false);
            }
        }
        loadWorkflow();
    }, [loadId, setNodes, setEdges]);

    // ── Zoom to Fit ───────────────────────────────────────────────────────────
    const handleZoomFit = useCallback(() => {
        rfInstanceRef.current?.fitView({ padding: 0.15, duration: 400 });
    }, []);

    // ── Drag & Drop ───────────────────────────────────────────────────────────
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('application/workline-block');
            if (!data) return;

            const blockDef: BlockDef = JSON.parse(data);
            const rfInstance = rfInstanceRef.current;
            if (!rfInstance || !reactFlowRef.current) return;

            const bounds = reactFlowRef.current.getBoundingClientRect();
            const position = rfInstance.project({
                x: e.clientX - bounds.left,
                y: e.clientY - bounds.top,
            });
            // Snap to 20px grid
            position.x = Math.round(position.x / 20) * 20;
            position.y = Math.round(position.y / 20) * 20;

            addNode(blockDef, position);
        },
        [addNode]
    );

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const { undo, redo } = useCanvasStore.getState();
        const handler = (e: KeyboardEvent) => {
          console.log("[JS] page.tsx | handler | L147: Code alive");
          console.log("[JS] page.tsx | handler | L145: Data processing");
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
            if (e.key === 'Escape') { closeContextMenu(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [closeContextMenu]);

    // ── Suppress native context menu on canvas ────────────────────────────────
    const suppressNativeCtxMenu = useCallback((e: React.MouseEvent) => {
        // Only suppress if not on an input element
        if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
        }
    }, []);

    const { user } = useWorkspaceStore();
    const isEditor = user?.role === 'admin' || user?.role === 'editor';

    return (
        <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
            {isMobile && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-primary)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                    <AlertCircle size={48} color="var(--accent-warning)" style={{ marginBottom: 16 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Desktop Required</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Canvas editing is available on desktop only.<br/>Please rotate your device or use a larger screen (1024px+).</p>
                </div>
            )}

            {isEditor && <BlockPalette />}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <Toolbar onZoomFit={handleZoomFit} />

                <div
                    ref={reactFlowRef}
                    style={{ flex: 1, background: 'var(--bg-primary)' }}
                    onContextMenu={suppressNativeCtxMenu}
                    onClick={() => { if (contextMenu) closeContextMenu(); }}
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onInit={(instance) => { rfInstanceRef.current = instance; }}
                        nodeTypes={nodeTypes}
                        fitView
                        snapToGrid
                        snapGrid={[20, 20]}
                        defaultEdgeOptions={{
                            animated: true,
                            style: { stroke: '#6366f1', strokeWidth: 2 },
                        }}
                        proOptions={{ hideAttribution: true }}
                        deleteKeyCode={isEditor ? ['Backspace', 'Delete'] : []}
                        nodesDraggable={isEditor}
                        nodesConnectable={isEditor}
                        elementsSelectable={isEditor}
                        onNodeContextMenu={(event) => {
                            if (!isEditor) return;
                            event.preventDefault();
                        }}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            color="rgba(148,163,184,0.08)"
                            gap={20}
                            size={1}
                        />
                        <Controls position="bottom-right" />
                        <MiniMap
                            nodeColor={(n) => n.data?.color || '#6366f1'}
                            style={{ background: '#111827' }}
                        />

                        {loading && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17, 24, 39, 0.4)', zIndex: 10, backdropFilter: 'blur(4px)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                    <RefreshCw size={32} color="var(--accent-primary)" style={{ animation: 'spin-slow 1s linear infinite' }} />
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Fetching workflow logic...</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17, 24, 39, 0.7)', zIndex: 11, backdropFilter: 'blur(8px)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 400, textAlign: 'center', padding: 32 }} className="glass-card">
                                    <AlertCircle size={48} color="#ef4444" />
                                    <div>
                                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Denied or Error</h3>
                                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{error}</p>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, marginTop: 8 }}>
                                        This workflow may belong to another organization. Please ensure you are logged into the correct account.
                                    </div>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="btn-primary"
                                        style={{ marginTop: 8 }}
                                    >
                                        Try Refreshing
                                    </button>
                                </div>
                            </div>
                        )}
                    </ReactFlow>
                </div>
            </div>

            <ErrorBoundary>
                <ChatPanel />
            </ErrorBoundary>
        </div>
    );
}

export default function AutomatePage() {
    return (
        <React.Suspense fallback={<div style={{ padding: 20 }}>Loading Workspace...</div>}>
            <AutomatePageContent />
        </React.Suspense>
    );
}

function AutomatePageContent() {
  console.log("[JS] page.tsx | AutomatePageContent | L278: Keep it up");
  console.log("[JS] page.tsx | AutomatePageContent | L275: Keep it up");
    const { setActiveTab, user, workflows } = useWorkspaceStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const loadId = searchParams.get('load');

    useEffect(() => {
        setActiveTab('automate');

        // If landing on an empty automate page, redirect to first workflow if one exists
        if (user && !loadId && (workflows?.length || 0) > 0) {
            const firstWf = workflows.find((w: { status: string; id: number }) => w.status === 'active') || workflows[0];
            if (firstWf) {
                router.replace(`/automate?load=${firstWf.id}`);
            }
        }
    }, [setActiveTab, user, loadId, workflows, router]);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ErrorBoundary>
                <ReactFlowProvider>
                    <CanvasContent />
                </ReactFlowProvider>
            </ErrorBoundary>
        </div>
    );
}