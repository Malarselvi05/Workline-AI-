'use client';

import React, { useCallback, useRef, useEffect } from 'react';
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
import { useCanvasStore, BlockDef } from '@/stores/canvasStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const nodeTypes = { workflowNode: WorkflowNode };

function CanvasContent() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        closeContextMenu,
        contextMenu,
    } = useCanvasStore();

    const reactFlowRef = useRef<HTMLDivElement>(null);
    const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

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

    return (
        <div style={{ display: 'flex', height: '100%' }}>
            <BlockPalette />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                        deleteKeyCode={['Backspace', 'Delete']}
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
                    </ReactFlow>
                </div>
            </div>

            <ChatPanel />
        </div>
    );
}

export default function AutomatePage() {
    const { setActiveTab } = useWorkspaceStore();

    useEffect(() => {
        setActiveTab('automate');
    }, [setActiveTab]);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ReactFlowProvider>
                <CanvasContent />
            </ReactFlowProvider>
        </div>
    );
}
