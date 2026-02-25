/**
 * packages/shared-types/block_registry.ts
 * Single source of truth for all WorkLine AI block types — TypeScript edition.
 * Used by: canvasStore.ts (palette), WorkflowNode.tsx (rendering), ChatPanel.tsx.
 *
 * Keep in sync with block_registry.py (Python side).
 */

export type BlockCategory =
    | 'Input'
    | 'Extract'
    | 'Transform'
    | 'Decide'
    | 'AI'
    | 'Human'
    | 'Act'
    | 'Output'
    | 'Mechanical';

export interface BlockConfigField {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    label: string;
    required?: boolean;
    default?: unknown;
    options?: string[];  // for type="select"
}

export interface BlockDefinition {
    type: string;
    category: BlockCategory;
    label: string;
    description: string;
    icon: string;             // Lucide icon name
    inputTypes: string[];     // accepted upstream output types
    outputType: string;       // what this block produces
    configFields: BlockConfigField[];
    allowRetry?: boolean;
    maxRetries?: number;
}

const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
    // ── Input ──────────────────────────────────────────────────────────────────
    file_upload: {
        type: 'file_upload', category: 'Input', label: 'File Upload', icon: 'Upload',
        description: 'Accepts uploaded files (PDF, image, CSV, etc.)',
        inputTypes: [], outputType: 'file',
        configFields: [
            { name: 'accepted_types', type: 'string', label: 'Accepted file types', default: '*' },
            { name: 'max_size_mb', type: 'number', label: 'Max file size (MB)', default: 50 },
        ],
    },
    api_trigger: {
        type: 'api_trigger', category: 'Input', label: 'API Trigger', icon: 'Webhook',
        description: 'Starts the workflow via an external HTTP API call',
        inputTypes: [], outputType: 'json',
        configFields: [
            { name: 'auth_required', type: 'boolean', label: 'Require API key', default: true },
        ],
    },
    form_input: {
        type: 'form_input', category: 'Input', label: 'Form Input', icon: 'FormInput',
        description: 'Collects structured data from a web form',
        inputTypes: [], outputType: 'json',
        configFields: [
            { name: 'fields', type: 'string', label: 'Field names (comma-separated)', required: true },
        ],
    },

    // ── Extract ────────────────────────────────────────────────────────────────
    ocr: {
        type: 'ocr', category: 'Extract', label: 'OCR', icon: 'ScanText',
        description: 'Extracts text from scanned images or PDFs (PaddleOCR + Tesseract fallback)',
        inputTypes: ['file'], outputType: 'text',
        configFields: [
            { name: 'language', type: 'string', label: 'Language code', default: 'en' },
        ],
    },
    parse: {
        type: 'parse', category: 'Extract', label: 'Parse', icon: 'FileCode',
        description: 'Parses structured data from text (dates, names, tables)',
        inputTypes: ['text', 'json'], outputType: 'json',
        configFields: [
            { name: 'schema', type: 'string', label: 'Target JSON schema (optional)' },
        ],
    },

    // ── Transform ──────────────────────────────────────────────────────────────
    clean: {
        type: 'clean', category: 'Transform', label: 'Clean', icon: 'Eraser',
        description: 'Cleans and normalises raw text or data',
        inputTypes: ['text', 'json'], outputType: 'text',
        configFields: [
            { name: 'strip_html', type: 'boolean', label: 'Strip HTML tags', default: true },
            { name: 'lowercase', type: 'boolean', label: 'Convert to lowercase', default: false },
        ],
    },
    map_fields: {
        type: 'map_fields', category: 'Transform', label: 'Map Fields', icon: 'ArrowLeftRight',
        description: 'Maps input field names to a target schema',
        inputTypes: ['json'], outputType: 'json',
        configFields: [
            { name: 'mapping', type: 'string', label: 'Field mapping JSON', required: true },
        ],
    },

    // ── Decide ─────────────────────────────────────────────────────────────────
    router: {
        type: 'router', category: 'Decide', label: 'Router', icon: 'GitFork',
        description: 'Routes data down condition_true / condition_false edges based on a rule',
        inputTypes: ['any'], outputType: 'any',
        configFields: [
            { name: 'condition', type: 'string', label: 'Condition expression', required: true },
        ],
    },
    score: {
        type: 'score', category: 'Decide', label: 'Score', icon: 'BarChart2',
        description: 'Assigns a numeric confidence/priority score to each item',
        inputTypes: ['json', 'text'], outputType: 'json',
        configFields: [
            { name: 'threshold', type: 'number', label: 'Score threshold', default: 0.5 },
        ],
    },

    // ── AI ─────────────────────────────────────────────────────────────────────
    classify: {
        type: 'classify', category: 'AI', label: 'Classify', icon: 'Tag',
        description: 'Zero-shot document/text classification (BART-large-mnli)',
        inputTypes: ['text', 'json'], outputType: 'json',
        configFields: [
            { name: 'classes', type: 'string', label: 'Classes (comma-separated)', required: true },
            { name: 'threshold', type: 'number', label: 'Confidence threshold', default: 0.85 },
        ],
    },
    recommend: {
        type: 'recommend', category: 'AI', label: 'Recommend', icon: 'Sparkles',
        description: 'XGBoost-based recommendation / ranking model',
        inputTypes: ['json'], outputType: 'json',
        configFields: [
            { name: 'top_k', type: 'number', label: 'Top-K results', default: 3 },
        ],
    },

    // ── Human ──────────────────────────────────────────────────────────────────
    human_review: {
        type: 'human_review', category: 'Human', label: 'Human Review', icon: 'UserCheck',
        description: 'Pauses the workflow and waits for a human to approve/reject',
        inputTypes: ['any'], outputType: 'any',
        allowRetry: false, maxRetries: 0,
        configFields: [
            { name: 'reviewer_role', type: 'string', label: 'Reviewer role', default: 'editor' },
            { name: 'timeout_hours', type: 'number', label: 'Timeout (hours)', default: 48 },
        ],
    },

    // ── Act ────────────────────────────────────────────────────────────────────
    store: {
        type: 'store', category: 'Act', label: 'Store File', icon: 'HardDrive',
        description: 'Persists a file or record to MinIO / DB storage',
        inputTypes: ['file', 'json', 'text'], outputType: 'json',
        configFields: [
            { name: 'bucket', type: 'string', label: 'Storage bucket', default: 'workline-files' },
            { name: 'folder_pattern', type: 'string', label: 'Folder pattern', default: '{workflow_id}/{run_id}' },
        ],
    },
    notify: {
        type: 'notify', category: 'Act', label: 'Notify', icon: 'Bell',
        description: 'Sends an email, Slack, or webhook notification',
        inputTypes: ['any'], outputType: 'json',
        configFields: [
            { name: 'channel', type: 'select', label: 'Channel', options: ['email', 'slack', 'webhook'], default: 'email' },
            { name: 'recipient', type: 'string', label: 'Recipient', required: true },
        ],
    },
    create_task: {
        type: 'create_task', category: 'Act', label: 'Create Task', icon: 'CheckSquare',
        description: 'Creates a task in an external project management tool',
        inputTypes: ['json'], outputType: 'json',
        configFields: [
            { name: 'system', type: 'select', label: 'System', options: ['jira', 'asana', 'linear'], default: 'jira' },
            { name: 'project_key', type: 'string', label: 'Project key', required: true },
        ],
    },

    // ── Output ─────────────────────────────────────────────────────────────────
    dashboard_out: {
        type: 'dashboard_out', category: 'Output', label: 'Dashboard Output', icon: 'LayoutDashboard',
        description: 'Publishes a result to the WorkLine dashboard summary view',
        inputTypes: ['json'], outputType: 'json',
        configFields: [
            { name: 'metric_name', type: 'string', label: 'Metric name', required: true },
        ],
    },
    export: {
        type: 'export', category: 'Output', label: 'Export', icon: 'Download',
        description: 'Exports data as CSV, PDF, or JSON for download',
        inputTypes: ['json', 'text'], outputType: 'file',
        configFields: [
            { name: 'format', type: 'select', label: 'Format', options: ['csv', 'pdf', 'json'], default: 'csv' },
        ],
    },

    // ── Mechanical Domain Pack ─────────────────────────────────────────────────
    drawing_classifier: {
        type: 'drawing_classifier', category: 'Mechanical', label: 'Drawing Classifier', icon: 'Layers',
        description: 'Classifies mechanical drawings by type using a CLIP vision model',
        inputTypes: ['file'], outputType: 'json',
        configFields: [
            { name: 'classes', type: 'string', label: 'Drawing types (comma-separated)', required: true },
        ],
    },
    po_extractor: {
        type: 'po_extractor', category: 'Mechanical', label: 'PO Extractor', icon: 'FileSearch',
        description: 'Extracts Purchase Order fields from engineering documents (PaddleOCR + LLM)',
        inputTypes: ['file', 'text'], outputType: 'json',
        configFields: [],
    },
    duplicate_detector: {
        type: 'duplicate_detector', category: 'Mechanical', label: 'Duplicate Drawing Detector', icon: 'Copy',
        description: 'Detects duplicate drawings using embedding cosine similarity (BGE / text-embedding-3-large)',
        inputTypes: ['file'], outputType: 'json',
        configFields: [
            { name: 'threshold', type: 'number', label: 'Similarity threshold', default: 0.95 },
        ],
    },
    team_leader_recommender: {
        type: 'team_leader_recommender', category: 'Mechanical', label: 'Team Leader Recommender', icon: 'Users',
        description: 'Recommends the best team leader for a drawing using an XGBoost model',
        inputTypes: ['json'], outputType: 'json',
        configFields: [],
    },
};

export default BLOCK_REGISTRY;

/** Flat list of all valid block type strings — use for validation. */
export const VALID_BLOCK_TYPES = new Set(Object.keys(BLOCK_REGISTRY));

/** All blocks grouped by category — use for the palette. */
export function getBlocksByCategory(): Record<BlockCategory, BlockDefinition[]> {
    const result = {} as Record<BlockCategory, BlockDefinition[]>;
    for (const block of Object.values(BLOCK_REGISTRY)) {
        if (!result[block.category]) result[block.category] = [];
        result[block.category].push(block);
    }
    return result;
}
