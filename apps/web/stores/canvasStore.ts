import { create } from 'zustand';
import {
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    applyNodeChanges,
    applyEdgeChanges,
    Connection,
    addEdge,
} from 'reactflow';
import { WorkflowProposal } from '@/lib/api';

// ── Block type definitions ──────────────────────────────────────────────────
export interface BlockDef {
    type: string;
    label: string;
    category: 'input' | 'extract' | 'transform' | 'decide' | 'ai' | 'human' | 'act' | 'output' | 'mechanical';
    icon: string; // lucide icon name
    description: string;
    color: string;
    isDomainPack?: boolean;
}

export const BLOCK_DEFINITIONS: BlockDef[] = [
    // Input
    { type: 'file_upload', label: 'File Upload', category: 'input', icon: 'Upload', description: 'Upload files to start processing', color: '#3b82f6' },
    { type: 'api_trigger', label: 'API Trigger', category: 'input', icon: 'Webhook', description: 'Trigger workflow via API call', color: '#3b82f6' },
    { type: 'form_input', label: 'Form Input', category: 'input', icon: 'ClipboardList', description: 'Trigger from a form submission', color: '#3b82f6' },
    // Extract
    { type: 'ocr', label: 'OCR Extract', category: 'extract', icon: 'ScanText', description: 'Extract text from documents using OCR', color: '#a855f7' },
    { type: 'parse', label: 'Field Parser', category: 'extract', icon: 'FileSearch', description: 'Parse structured fields from text', color: '#a855f7' },
    // Transform
    { type: 'clean', label: 'Text Cleaner', category: 'transform', icon: 'Eraser', description: 'Clean and normalize extracted text', color: '#eab308' },
    { type: 'map_fields', label: 'Field Mapper', category: 'transform', icon: 'ArrowRightLeft', description: 'Map fields to a target schema', color: '#eab308' },
    // Decide
    { type: 'router', label: 'Router', category: 'decide', icon: 'GitFork', description: 'Route based on conditions (if/else)', color: '#f97316' },
    { type: 'score', label: 'Scorer', category: 'decide', icon: 'Gauge', description: 'Score data against criteria', color: '#f97316' },
    // AI
    { type: 'classify', label: 'Classifier', category: 'ai', icon: 'Brain', description: 'AI-powered document classification', color: '#6366f1' },
    { type: 'recommend', label: 'Recommender', category: 'ai', icon: 'Lightbulb', description: 'AI-based recommendations', color: '#6366f1' },
    // Human
    { type: 'human_review', label: 'Human Review', category: 'human', icon: 'UserCheck', description: 'Pause for human approval', color: '#ef4444' },
    // Act
    { type: 'store', label: 'Store File', category: 'act', icon: 'Database', description: 'Store file in structured storage', color: '#10b981' },
    { type: 'create_task', label: 'Create Task', category: 'act', icon: 'ListTodo', description: 'Create a task in project management', color: '#10b981' },
    { type: 'notify', label: 'Notify', category: 'act', icon: 'Bell', description: 'Send notification via email/Slack', color: '#10b981' },
    // Mechanical Domain Packs
    { type: 'drawing_classifier', label: 'Drawing Classifier', category: 'mechanical', icon: 'Ruler', description: 'Classify mechanical drawings', color: '#06b6d4', isDomainPack: true },
    { type: 'po_extractor', label: 'PO Extractor', category: 'mechanical', icon: 'Receipt', description: 'Extract purchase order data', color: '#06b6d4', isDomainPack: true },
    { type: 'duplicate_detector', label: 'Duplicate Detector', category: 'mechanical', icon: 'Copy', description: 'Detect duplicate documents', color: '#06b6d4', isDomainPack: true },
    { type: 'team_leader_recommender', label: 'Leader Recommender', category: 'mechanical', icon: 'Users', description: 'Recommend team leader for a job', color: '#06b6d4', isDomainPack: true },
];

export const CATEGORY_COLORS: Record<string, string> = {
    input: '#3b82f6',
    extract: '#a855f7',
    transform: '#eab308',
    decide: '#f97316',
    ai: '#6366f1',
    human: '#ef4444',
    act: '#10b981',
    output: '#06b6d4',
    mechanical: '#06b6d4',
};

// ── Context menu ────────────────────────────────────────────────────────────
export interface ContextMenuState {
    nodeId: string;
    x: number;
    y: number;
}

// ── Diff state ──────────────────────────────────────────────────────────────
export interface DiffState {
    changed: Set<string>;   // amber border
    added: Set<string>;     // blue highlight
    removed: Set<string>;   // ghost (low opacity)
}

// ── History snapshot ────────────────────────────────────────────────────────
interface HistoryEntry {
    nodes: Node[];
    edges: Edge[];
}

const MAX_HISTORY = 50;

// ── Store interface ─────────────────────────────────────────────────────────
interface CanvasState {
    nodes: Node[];
    edges: Edge[];
    runStatus: Record<string, 'pending' | 'running' | 'success' | 'failed' | 'skipped'>;
    diffState: DiffState;
    contextMenu: ContextMenuState | null;
    domainPackVisible: boolean;

    // undo/redo
    history: HistoryEntry[];
    historyIndex: number;

    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (connection: Connection) => void;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    importFromProposal: (proposal: WorkflowProposal) => void;
    addNode: (blockDef: BlockDef, position: { x: number; y: number }) => void;
    duplicateNode: (nodeId: string) => void;
    deleteNode: (nodeId: string) => void;
    clearCanvas: () => void;

    // run status
    setRunStatus: (nodeId: string, status: 'pending' | 'running' | 'success' | 'failed' | 'skipped') => void;
    clearRunStatus: () => void;

    // diff / highlights
    highlightChanges: (changedIds: string[], newIds: string[], removedIds: string[]) => void;
    clearHighlights: () => void;

    // context menu
    openContextMenu: (nodeId: string, x: number, y: number) => void;
    closeContextMenu: () => void;

    // domain packs
    toggleDomainPack: () => void;

    // undo/redo
    undo: () => void;
    redo: () => void;
    pushHistory: () => void;

    // auto-layout
    applyAutoLayout: () => void;
}

let nodeIdCounter = 100;

function makeEmptyDiff(): DiffState {
    return { changed: new Set(), added: new Set(), removed: new Set() };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    nodes: [],
    edges: [],
    runStatus: {},
    diffState: makeEmptyDiff(),
    contextMenu: null,
    domainPackVisible: false,
    history: [],
    historyIndex: -1,

    // ── onChange handlers (do NOT push history — too noisy for drag moves) ──
    onNodesChange: (changes) =>
        set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

    onEdgesChange: (changes) =>
        set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

    onConnect: (connection) => {
        get().pushHistory();
        set((state) => ({
            edges: addEdge(
                { ...connection, id: `e-${Date.now()}`, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
                state.edges
            ),
        }));
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    // ── Import from AI proposal ─────────────────────────────────────────────
    importFromProposal: (proposal) => {
        get().pushHistory();
        const blockMap = Object.fromEntries(BLOCK_DEFINITIONS.map((b) => [b.type, b]));
        const currentIds = new Set(get().nodes.map((n) => n.id));
        const newIds: string[] = [];
        const changedIds: string[] = [];

        const nodes: Node[] = proposal.nodes.map((n) => {
            const def = blockMap[n.type];
            if (currentIds.has(n.id)) changedIds.push(n.id);
            else newIds.push(n.id);
            return {
                id: n.id,
                type: 'workflowNode',
                position: n.position,
                data: {
                    label: n.data.label,
                    blockType: n.type,
                    config: n.data.config || {},
                    reasoning: n.data.reasoning || '',
                    color: def?.color || '#6366f1',
                    category: def?.category || 'ai',
                    icon: def?.icon || 'Box',
                },
            };
        });
        const edges: Edge[] = proposal.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
        }));

        // compute removed ids (in current but NOT in proposal)
        const proposalIds = new Set(proposal.nodes.map((n) => n.id));
        const removedIds = get().nodes.map((n) => n.id).filter((id) => !proposalIds.has(id));

        set({
            nodes,
            edges,
            runStatus: {},
            diffState: {
                changed: new Set(changedIds),
                added: new Set(newIds),
                removed: new Set(removedIds),
            },
        });
    },

    // ── Add node from palette ───────────────────────────────────────────────
    addNode: (blockDef, position) => {
        get().pushHistory();
        const id = `node_${++nodeIdCounter}`;
        const newNode: Node = {
            id,
            type: 'workflowNode',
            position,
            data: {
                label: blockDef.label,
                blockType: blockDef.type,
                config: {},
                reasoning: '',
                color: blockDef.color,
                category: blockDef.category,
                icon: blockDef.icon,
            },
        };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
    },

    // ── Duplicate a node ────────────────────────────────────────────────────
    duplicateNode: (nodeId) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        if (!node) return;
        get().pushHistory();
        const id = `node_${++nodeIdCounter}`;
        const newNode: Node = {
            ...node,
            id,
            position: { x: node.position.x + 40, y: node.position.y + 40 },
            selected: false,
        };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
    },

    // ── Delete a node (and its edges) ───────────────────────────────────────
    deleteNode: (nodeId) => {
        get().pushHistory();
        set((state) => ({
            nodes: state.nodes.filter((n) => n.id !== nodeId),
            edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        }));
    },

    clearCanvas: () => {
        get().pushHistory();
        set({ nodes: [], edges: [], runStatus: {}, diffState: makeEmptyDiff() });
    },

    // ── Run status ──────────────────────────────────────────────────────────
    setRunStatus: (nodeId, status) =>
        set((state) => ({ runStatus: { ...state.runStatus, [nodeId]: status } })),

    clearRunStatus: () => set({ runStatus: {} }),

    // ── Diff highlights ─────────────────────────────────────────────────────
    highlightChanges: (changedIds, newIds, removedIds) =>
        set({
            diffState: {
                changed: new Set(changedIds),
                added: new Set(newIds),
                removed: new Set(removedIds),
            },
        }),

    clearHighlights: () => set({ diffState: makeEmptyDiff() }),

    // ── Context menu ────────────────────────────────────────────────────────
    openContextMenu: (nodeId, x, y) => set({ contextMenu: { nodeId, x, y } }),
    closeContextMenu: () => set({ contextMenu: null }),

    // ── Domain pack toggle ──────────────────────────────────────────────────
    toggleDomainPack: () => set((state) => ({ domainPackVisible: !state.domainPackVisible })),

    // ── Undo / Redo ─────────────────────────────────────────────────────────
    pushHistory: () => {
        const { nodes, edges, history, historyIndex } = get();
        const snapshot: HistoryEntry = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
        };
        const trimmed = history.slice(0, historyIndex + 1);
        const next = [...trimmed, snapshot].slice(-MAX_HISTORY);
        set({ history: next, historyIndex: next.length - 1 });
    },

    undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < 0) return;
        const entry = history[historyIndex];
        set({ nodes: entry.nodes, edges: entry.edges, historyIndex: historyIndex - 1 });
    },

    redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;
        const entry = history[historyIndex + 1];
        set({ nodes: entry.nodes, edges: entry.edges, historyIndex: historyIndex + 1 });
    },

    // ── Auto-layout (Dagre-style BFS topo sort) ─────────────────────────────
    applyAutoLayout: () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        // Build adjacency and in-degree maps
        const adj: Record<string, string[]> = {};
        const inDeg: Record<string, number> = {};
        nodes.forEach((n) => { adj[n.id] = []; inDeg[n.id] = 0; });
        edges.forEach((e) => {
            adj[e.source]?.push(e.target);
            if (e.target in inDeg) inDeg[e.target]++;
        });

        // BFS topo sort → assign columns
        const col: Record<string, number> = {};
        const queue = nodes.filter((n) => inDeg[n.id] === 0).map((n) => n.id);
        let colIdx = 0;
        while (queue.length > 0) {
            const next: string[] = [];
            queue.forEach((id) => {
                col[id] = colIdx;
                adj[id].forEach((child) => {
                    inDeg[child]--;
                    if (inDeg[child] === 0) next.push(child);
                });
            });
            queue.splice(0, queue.length, ...next);
            colIdx++;
        }

        // Group by column, assign rows
        const colGroups: Record<number, string[]> = {};
        nodes.forEach((n) => {
            const c = col[n.id] ?? 0;
            if (!colGroups[c]) colGroups[c] = [];
            colGroups[c].push(n.id);
        });

        const X_GAP = 260;
        const Y_GAP = 160;
        const posMap: Record<string, { x: number; y: number }> = {};
        Object.entries(colGroups).forEach(([c, ids]) => {
            const ci = parseInt(c);
            const totalH = (ids.length - 1) * Y_GAP;
            ids.forEach((id, row) => {
                posMap[id] = { x: ci * X_GAP + 60, y: row * Y_GAP - totalH / 2 + 200 };
            });
        });

        const laid = nodes.map((n) => ({
            ...n,
            position: posMap[n.id] ?? n.position,
        }));
        get().pushHistory();
        set({ nodes: laid });
    },
}));
